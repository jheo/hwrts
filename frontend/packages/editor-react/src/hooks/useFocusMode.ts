'use client';

import { useCallback, useEffect } from 'react';

import { useEditorStore } from '../store/useEditorStore';

export function useFocusMode() {
  const focusMode = useEditorStore((s) => s.focusMode);
  const toggleFocusMode = useEditorStore((s) => s.toggleFocusMode);

  const handleToggle = useCallback(() => {
    toggleFocusMode();
  }, [toggleFocusMode]);

  // Listen for keyboard shortcut event from FocusMode extension
  useEffect(() => {
    window.addEventListener('hw:toggle-focus-mode', handleToggle);
    return () =>
      window.removeEventListener('hw:toggle-focus-mode', handleToggle);
  }, [handleToggle]);

  return { focusMode, toggleFocusMode };
}
