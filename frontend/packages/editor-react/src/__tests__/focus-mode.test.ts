import { Editor } from '@tiptap/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../extensions';

describe('FocusMode extension', () => {
  let editor: Editor;

  beforeEach(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    editor = new Editor({
      element: el,
      extensions: createExtensions({ placeholder: 'Test' }),
      content: '<p>Hello</p>',
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  it('dispatches hw:toggle-focus-mode event on Mod-Shift-f', () => {
    const handler = vi.fn();
    window.addEventListener('hw:toggle-focus-mode', handler);

    const focusModeExt = editor.extensionManager.extensions.find(
      (e) => e.name === 'focusMode',
    );
    expect(focusModeExt).toBeDefined();

    editor.commands.keyboardShortcut('Mod-Shift-f');

    expect(handler).toHaveBeenCalled();

    window.removeEventListener('hw:toggle-focus-mode', handler);
  });

  it('returns true from keyboard shortcut handler', () => {
    expect(editor.commands.keyboardShortcut('Mod-Shift-f')).toBe(true);
  });
});
