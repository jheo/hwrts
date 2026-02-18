'use client';

import { Extension } from '@tiptap/react';

export const FocusMode = Extension.create({
  name: 'focusMode',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-f': () => {
        // Toggle focus mode via custom event
        // The actual state is managed by Zustand store
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hw:toggle-focus-mode'));
        }
        return true;
      },
    };
  },
});
