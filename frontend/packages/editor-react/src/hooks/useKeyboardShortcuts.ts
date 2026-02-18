'use client';

import { useCallback, useEffect } from 'react';

import { useInspectorStore } from './useInspector';

export function useKeyboardShortcuts() {
  const toggleInspector = useInspectorStore((s) => s.toggle);
  const closeInspector = useInspectorStore((s) => s.close);
  const isInspectorOpen = useInspectorStore((s) => s.isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Cmd+Shift+I: Toggle Inspector
      if (mod && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        e.stopPropagation();
        toggleInspector();
        return;
      }

      // Cmd+Shift+P: Command Palette (placeholder)
      if (mod && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        e.stopPropagation();
        // TODO: Open Command Palette (Post-MVP)
        return;
      }

      // Escape: Close Inspector / Focus Mode
      if (e.key === 'Escape') {
        if (isInspectorOpen) {
          e.preventDefault();
          closeInspector();
          return;
        }
        // Focus Mode Escape is handled by the editor extension
      }
    },
    [toggleInspector, closeInspector, isInspectorOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
