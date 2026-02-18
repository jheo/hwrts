import { beforeEach, describe, expect, it } from 'vitest';

import { db, documentStore } from '../storage/document-store';
import type { LocalDocument } from '../storage/types';

function makeDoc(overrides: Partial<LocalDocument> = {}): LocalDocument {
  return {
    id: 'test-1',
    title: 'Test Document',
    content: '<p>Hello world</p>',
    wordCount: 2,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('documentStore', () => {
  beforeEach(async () => {
    await db.documents.clear();
  });

  it('saves and retrieves a document', async () => {
    const doc = makeDoc();
    await documentStore.save(doc);

    const retrieved = await documentStore.get('test-1');
    expect(retrieved).toEqual(doc);
  });

  it('returns undefined for non-existent document', async () => {
    const result = await documentStore.get('non-existent');
    expect(result).toBeUndefined();
  });

  it('updates an existing document', async () => {
    const doc = makeDoc();
    await documentStore.save(doc);

    const updated = { ...doc, title: 'Updated Title', wordCount: 5 };
    await documentStore.save(updated);

    const retrieved = await documentStore.get('test-1');
    expect(retrieved?.title).toBe('Updated Title');
    expect(retrieved?.wordCount).toBe(5);
  });

  it('deletes a document', async () => {
    await documentStore.save(makeDoc());
    await documentStore.delete('test-1');

    const result = await documentStore.get('test-1');
    expect(result).toBeUndefined();
  });

  it('lists all documents ordered by updatedAt desc', async () => {
    await documentStore.save(makeDoc({ id: 'a', updatedAt: 1000 }));
    await documentStore.save(makeDoc({ id: 'b', updatedAt: 3000 }));
    await documentStore.save(makeDoc({ id: 'c', updatedAt: 2000 }));

    const list = await documentStore.list();
    expect(list).toHaveLength(3);
    expect(list[0]?.id).toBe('b');
    expect(list[1]?.id).toBe('c');
    expect(list[2]?.id).toBe('a');
  });

  it('gets the latest document', async () => {
    await documentStore.save(makeDoc({ id: 'a', updatedAt: 1000 }));
    await documentStore.save(makeDoc({ id: 'b', updatedAt: 3000 }));

    const latest = await documentStore.getLatest();
    expect(latest?.id).toBe('b');
  });

  it('returns undefined for getLatest when empty', async () => {
    const latest = await documentStore.getLatest();
    expect(latest).toBeUndefined();
  });
});
