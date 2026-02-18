import Dexie, { type EntityTable } from 'dexie';

import type { LocalDocument } from './types';

const DB_NAME = 'humanwrites';
const DB_VERSION = 1;

class HumanWritesDB extends Dexie {
  documents!: EntityTable<LocalDocument, 'id'>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      documents: 'id, updatedAt',
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

export { db };
