import { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../extensions';
import { inlineFeedbackPluginKey } from '../extensions/inline-feedback';
import type { ReviewItem } from '../extensions/inline-feedback';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestEditor(content = '<p>Hello world</p>'): Editor {
  const el = document.createElement('div');
  document.body.appendChild(el);

  return new Editor({
    element: el,
    extensions: createExtensions({ placeholder: 'Test' }),
    content,
  });
}

function makeReviewItem(overrides?: Partial<ReviewItem>): ReviewItem {
  return {
    id: 'test-1',
    type: 'spelling',
    severity: 'warning',
    range: { from: 1, to: 6 },
    message: 'Possible spelling error',
    suggestion: 'hello',
    source: 'ai_model',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InlineFeedback extension', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor();
  });

  afterEach(() => {
    editor.destroy();
  });

  it('registers the inlineFeedback extension on the editor', () => {
    const names = editor.extensionManager.extensions.map((e) => e.name);
    expect(names).toContain('inlineFeedback');
  });

  it('starts with an empty decoration set', () => {
    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    expect(pluginState).toBeDefined();
    expect(pluginState!.reviewItems).toEqual([]);
  });

  it('has setReviewItems command available', () => {
    expect(editor.commands).toHaveProperty('setReviewItems');
  });

  it('has clearReviewItems command available', () => {
    expect(editor.commands).toHaveProperty('clearReviewItems');
  });
});

describe('setReviewItems command', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor('<p>Hello world test</p>');
  });

  afterEach(() => {
    editor.destroy();
  });

  it('updates plugin state with review items', () => {
    const item = makeReviewItem({ range: { from: 1, to: 6 } });
    editor.commands.setReviewItems([item]);

    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    expect(pluginState!.reviewItems).toHaveLength(1);
    expect(pluginState!.reviewItems[0]!.id).toBe('test-1');
  });

  it('creates decorations for valid review items', () => {
    const item = makeReviewItem({ range: { from: 1, to: 6 } });
    editor.commands.setReviewItems([item]);

    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    const decorations = pluginState!.decorationSet.find(1, 6);
    expect(decorations.length).toBeGreaterThan(0);
  });

  it('replaces previous items when called again', () => {
    const item1 = makeReviewItem({ id: 'item-1', range: { from: 1, to: 6 } });
    const item2 = makeReviewItem({ id: 'item-2', range: { from: 7, to: 12 } });

    editor.commands.setReviewItems([item1]);
    editor.commands.setReviewItems([item2]);

    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    expect(pluginState!.reviewItems).toHaveLength(1);
    expect(pluginState!.reviewItems[0]!.id).toBe('item-2');
  });

  it('skips items with invalid ranges', () => {
    const invalidItem = makeReviewItem({
      id: 'bad-range',
      range: { from: 999, to: 1005 },
    });
    editor.commands.setReviewItems([invalidItem]);

    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    // The items are stored but decorations for invalid ranges are skipped
    expect(pluginState!.reviewItems).toHaveLength(1);
    // No decorations should be created for the out-of-bounds range
    const decorations = pluginState!.decorationSet.find(0, editor.state.doc.nodeSize - 2);
    expect(decorations).toHaveLength(0);
  });

  it('handles multiple items with different types', () => {
    const spellingItem = makeReviewItem({
      id: 'spell-1',
      type: 'spelling',
      range: { from: 1, to: 6 },
    });
    const grammarItem = makeReviewItem({
      id: 'grammar-1',
      type: 'grammar',
      range: { from: 7, to: 12 },
    });

    editor.commands.setReviewItems([spellingItem, grammarItem]);

    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    expect(pluginState!.reviewItems).toHaveLength(2);

    const decorations = pluginState!.decorationSet.find(
      0,
      editor.state.doc.nodeSize - 2,
    );
    expect(decorations).toHaveLength(2);
  });
});

describe('clearReviewItems command', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor('<p>Hello world test</p>');
  });

  afterEach(() => {
    editor.destroy();
  });

  it('removes all review items and decorations', () => {
    const item = makeReviewItem({ range: { from: 1, to: 6 } });
    editor.commands.setReviewItems([item]);

    // Verify items exist
    let pluginState = inlineFeedbackPluginKey.getState(editor.state);
    expect(pluginState!.reviewItems).toHaveLength(1);

    // Clear
    editor.commands.clearReviewItems();

    pluginState = inlineFeedbackPluginKey.getState(editor.state);
    expect(pluginState!.reviewItems).toHaveLength(0);
    const decorations = pluginState!.decorationSet.find(
      0,
      editor.state.doc.nodeSize - 2,
    );
    expect(decorations).toHaveLength(0);
  });
});

describe('decoration remapping on document change', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor('<p>Hello world</p>');
  });

  afterEach(() => {
    editor.destroy();
  });

  it('remaps decorations when text is inserted before them', () => {
    // Decorate "world" at positions 7-12 in "Hello world"
    const item = makeReviewItem({
      range: { from: 7, to: 12 },
    });
    editor.commands.setReviewItems([item]);

    // Insert text at position 1 (before "Hello")
    editor.commands.focus();
    editor.commands.insertContentAt(1, 'Hey ');

    const pluginState = inlineFeedbackPluginKey.getState(editor.state);
    // Items are stored with original ranges, but decorations are remapped
    expect(pluginState!.reviewItems).toHaveLength(1);
    // The decoration set should have remapped the decoration
    const decorations = pluginState!.decorationSet.find(
      0,
      editor.state.doc.nodeSize - 2,
    );
    expect(decorations.length).toBeGreaterThan(0);
  });
});
