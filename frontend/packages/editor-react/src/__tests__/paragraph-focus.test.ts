import { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../extensions';

describe('ParagraphFocus extension', () => {
  let editor: Editor;

  beforeEach(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({ placeholder: 'Test' }),
      content: '<h1>Title</h1><p>First paragraph</p><p>Second paragraph</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('applies paragraph-inactive class to non-active paragraphs', () => {
    // Place cursor in first paragraph
    editor.commands.focus();
    editor.commands.setTextSelection(8); // inside "First paragraph"

    const el = editor.view.dom;
    const inactiveNodes = el.querySelectorAll('.paragraph-inactive');

    // Second paragraph should be inactive, heading should not have the class
    expect(inactiveNodes.length).toBeGreaterThan(0);
  });

  it('headings never receive paragraph-inactive class', () => {
    editor.commands.focus();
    editor.commands.setTextSelection(3); // inside heading

    const el = editor.view.dom;
    const headings = el.querySelectorAll('h1');

    for (const h of headings) {
      expect(h.classList.contains('paragraph-inactive')).toBe(false);
    }
  });

  it('decorates multiple paragraphs when cursor is in one', () => {
    // Set content with 3 paragraphs
    editor.commands.setContent(
      '<p>Para one</p><p>Para two</p><p>Para three</p>',
    );
    editor.commands.focus();
    editor.commands.setTextSelection(3); // in "Para one"

    const el = editor.view.dom;
    const inactiveNodes = el.querySelectorAll('.paragraph-inactive');
    // The other 2 paragraphs should be inactive
    expect(inactiveNodes.length).toBe(2);
  });

  it('handles blockquote content', () => {
    editor.commands.setContent(
      '<p>Normal text</p><blockquote><p>Quoted</p></blockquote>',
    );
    editor.commands.focus();
    editor.commands.setTextSelection(3); // in "Normal text"

    const el = editor.view.dom;
    const inactiveNodes = el.querySelectorAll('.paragraph-inactive');
    // blockquote should be inactive
    expect(inactiveNodes.length).toBeGreaterThan(0);
  });

  it('handles empty document', () => {
    editor.commands.setContent('');
    editor.commands.focus();

    // Should not throw
    const el = editor.view.dom;
    expect(el).toBeTruthy();
  });
});
