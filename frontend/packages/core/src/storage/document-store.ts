import Dexie, { type EntityTable } from 'dexie';

import type { KeystrokeStatVector } from '../typing-analyzer/keystroke';

import type { LocalDocument, StoredKeystrokeSession } from './types';

const DB_NAME = 'humanwrites';

class HumanWritesDB extends Dexie {
  documents!: EntityTable<LocalDocument, 'id'>;
  keystroke_stats!: EntityTable<StoredKeystrokeSession, 'id'>;

  constructor() {
    super(DB_NAME);

    // v1: documents only
    this.version(1).stores({
      documents: 'id, updatedAt',
    });

    // v2: add keystroke_stats table
    this.version(2).stores({
      documents: 'id, updatedAt',
      keystroke_stats: '++id, sessionId, documentId, createdAt',
    });
  }
}

const db = new HumanWritesDB();

export const documentStore = {
  async save(doc: LocalDocument): Promise<void> {
    await db.documents.put(doc);
  },

  async get(id: string): Promise<LocalDocument | undefined> {
    return db.documents.get(id);
  },

  async getLatest(): Promise<LocalDocument | undefined> {
    return db.documents.orderBy('updatedAt').reverse().first();
  },

  async delete(id: string): Promise<void> {
    await db.documents.delete(id);
  },

  async list(): Promise<LocalDocument[]> {
    return db.documents.orderBy('updatedAt').reverse().toArray();
  },
};

const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_SIZE_PER_DOC = 500 * 1024; // 500KB

export const keystrokeStore = {
  /**
   * Batch save stat vectors for a session.
   */
  async saveVectors(
    sessionId: string,
    documentId: string,
    vectors: KeystrokeStatVector[],
  ): Promise<void> {
    await db.keystroke_stats.put({
      sessionId,
      documentId,
      vectors,
      createdAt: Date.now(),
    });
  },

  /**
   * Get all stored records for a specific session.
   */
  async getSession(sessionId: string): Promise<StoredKeystrokeSession[]> {
    return db.keystroke_stats.where('sessionId').equals(sessionId).toArray();
  },

  /**
   * List all sessions for a document, ordered by creation time descending.
   */
  async listSessions(documentId: string): Promise<StoredKeystrokeSession[]> {
    return db.keystroke_stats
      .where('documentId')
      .equals(documentId)
      .reverse()
      .sortBy('createdAt');
  },

  /**
   * Auto-cleanup old sessions and enforce per-document size limits.
   * - maxAge: remove sessions older than this (default 7 days)
   * - maxSizePerDoc: approximate max bytes per document (default 500KB)
   */
  async cleanup(
    maxAge: number = DEFAULT_MAX_AGE_MS,
    maxSizePerDoc: number = DEFAULT_MAX_SIZE_PER_DOC,
  ): Promise<number> {
    let deletedCount = 0;

    // 1. Delete sessions older than maxAge
    const cutoff = Date.now() - maxAge;
    const oldSessions = await db.keystroke_stats
      .where('createdAt')
      .below(cutoff)
      .toArray();

    if (oldSessions.length > 0) {
      const oldIds = oldSessions
        .map((s) => s.id)
        .filter((id): id is number => id !== undefined);
      await db.keystroke_stats.bulkDelete(oldIds);
      deletedCount += oldIds.length;
    }

    // 2. Enforce per-document size limits
    const allSessions = await db.keystroke_stats.toArray();
    const byDocument = new Map<string, StoredKeystrokeSession[]>();

    for (const session of allSessions) {
      const existing = byDocument.get(session.documentId) ?? [];
      existing.push(session);
      byDocument.set(session.documentId, existing);
    }

    for (const [, sessions] of byDocument) {
      // Sort by createdAt descending (newest first)
      sessions.sort((a, b) => b.createdAt - a.createdAt);

      let totalSize = 0;
      const toDelete: number[] = [];

      for (const session of sessions) {
        // Approximate size: JSON serialized vectors
        const size = JSON.stringify(session.vectors).length * 2; // UTF-16
        totalSize += size;

        if (totalSize > maxSizePerDoc && session.id !== undefined) {
          toDelete.push(session.id);
        }
      }

      if (toDelete.length > 0) {
        await db.keystroke_stats.bulkDelete(toDelete);
        deletedCount += toDelete.length;
      }
    }

    return deletedCount;
  },
};

export { db };
