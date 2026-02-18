import { beforeEach, describe, expect, it } from 'vitest';

import { db, keystrokeStore } from '../storage/document-store';
import type { KeystrokeStatVector } from '../typing-analyzer/keystroke';

function makeVector(
  overrides: Partial<KeystrokeStatVector> = {},
): KeystrokeStatVector {
  return {
    windowStart: 0,
    windowEnd: 5000,
    keystrokeCount: 100,
    avgWpm: 60,
    wpmStdDev: 5,
    avgDwellTime: 80,
    avgFlightTime: 120,
    flightTimeEntropy: 2.5,
    errorRate: 0.05,
    pauseCount: 2,
    burstPauseRatio: 0.8,
    ...overrides,
  };
}

describe('keystrokeStore', () => {
  beforeEach(async () => {
    await db.keystroke_stats.clear();
  });

  describe('saveVectors', () => {
    it('saves vectors for a session', async () => {
      const vectors = [makeVector(), makeVector({ windowStart: 5000 })];
      await keystrokeStore.saveVectors('session-1', 'doc-1', vectors);

      const results = await db.keystroke_stats.toArray();
      expect(results).toHaveLength(1);
      expect(results[0]!.sessionId).toBe('session-1');
      expect(results[0]!.documentId).toBe('doc-1');
      expect(results[0]!.vectors).toHaveLength(2);
      expect(results[0]!.createdAt).toBeGreaterThan(0);
    });

    it('saves multiple sessions independently', async () => {
      await keystrokeStore.saveVectors('session-1', 'doc-1', [makeVector()]);
      await keystrokeStore.saveVectors('session-2', 'doc-1', [makeVector()]);

      const results = await db.keystroke_stats.toArray();
      expect(results).toHaveLength(2);
    });
  });

  describe('getSession', () => {
    it('retrieves all records for a session', async () => {
      await keystrokeStore.saveVectors('session-1', 'doc-1', [makeVector()]);
      await keystrokeStore.saveVectors('session-1', 'doc-1', [
        makeVector({ windowStart: 5000 }),
      ]);
      await keystrokeStore.saveVectors('session-2', 'doc-1', [makeVector()]);

      const results = await keystrokeStore.getSession('session-1');
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.sessionId === 'session-1')).toBe(true);
    });

    it('returns empty array for non-existent session', async () => {
      const results = await keystrokeStore.getSession('non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('listSessions', () => {
    it('lists sessions for a document ordered by createdAt desc', async () => {
      // Save with slight time gaps to ensure ordering
      await keystrokeStore.saveVectors('session-a', 'doc-1', [makeVector()]);
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));
      await keystrokeStore.saveVectors('session-b', 'doc-1', [makeVector()]);
      await new Promise((r) => setTimeout(r, 10));
      await keystrokeStore.saveVectors('session-c', 'doc-2', [makeVector()]); // different doc

      const results = await keystrokeStore.listSessions('doc-1');
      expect(results).toHaveLength(2);
      // Should be ordered newest first
      expect(results[0]!.createdAt).toBeGreaterThanOrEqual(
        results[1]!.createdAt,
      );
    });

    it('returns empty array for document with no sessions', async () => {
      const results = await keystrokeStore.listSessions('non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('removes sessions older than maxAge', async () => {
      // Manually insert old records
      const now = Date.now();
      await db.keystroke_stats.put({
        sessionId: 'old-session',
        documentId: 'doc-1',
        vectors: [makeVector()],
        createdAt: now - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      });
      await db.keystroke_stats.put({
        sessionId: 'new-session',
        documentId: 'doc-1',
        vectors: [makeVector()],
        createdAt: now, // now
      });

      const deleted = await keystrokeStore.cleanup();

      expect(deleted).toBeGreaterThanOrEqual(1);
      const remaining = await db.keystroke_stats.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.sessionId).toBe('new-session');
    });

    it('enforces per-document size limits', async () => {
      // Create a large vector payload
      const bigVector = makeVector();
      const bigVectors: KeystrokeStatVector[] = [];
      // Create enough vectors to exceed 500KB when serialized
      for (let i = 0; i < 500; i++) {
        bigVectors.push({ ...bigVector, windowStart: i * 5000 });
      }

      const now = Date.now();
      await db.keystroke_stats.put({
        sessionId: 'session-1',
        documentId: 'doc-1',
        vectors: bigVectors,
        createdAt: now - 1000, // older
      });
      await db.keystroke_stats.put({
        sessionId: 'session-2',
        documentId: 'doc-1',
        vectors: bigVectors,
        createdAt: now, // newer, kept
      });

      // Use very small maxSizePerDoc to trigger cleanup
      const deleted = await keystrokeStore.cleanup(
        7 * 24 * 60 * 60 * 1000,
        1000,
      );
      expect(deleted).toBeGreaterThanOrEqual(1);
    });

    it('returns 0 when nothing to clean', async () => {
      await keystrokeStore.saveVectors('session-1', 'doc-1', [makeVector()]);

      const deleted = await keystrokeStore.cleanup();
      expect(deleted).toBe(0);
    });

    it('handles empty database', async () => {
      const deleted = await keystrokeStore.cleanup();
      expect(deleted).toBe(0);
    });
  });
});
