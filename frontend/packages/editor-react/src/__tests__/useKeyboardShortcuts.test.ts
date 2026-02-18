import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useInspectorStore } from '../hooks/useInspector';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

function fireKeydown(key: string, options: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    act(() => {
      useInspectorStore.setState({ isOpen: false, activeTab: 'stats' });
    });
  });

  afterEach(() => {
    useInspectorStore.setState({ isOpen: false, activeTab: 'stats' });
  });

  it('toggles inspector with Cmd+Shift+I', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeydown('I', { metaKey: true, shiftKey: true });
    });

    expect(useInspectorStore.getState().isOpen).toBe(true);
  });

  it('toggles inspector with Ctrl+Shift+I', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeydown('I', { ctrlKey: true, shiftKey: true });
    });

    expect(useInspectorStore.getState().isOpen).toBe(true);
  });

  it('closes inspector with Escape when open', () => {
    act(() => {
      useInspectorStore.setState({ isOpen: true });
    });

    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeydown('Escape');
    });

    expect(useInspectorStore.getState().isOpen).toBe(false);
  });

  it('does not open inspector with just Escape', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireKeydown('Escape');
    });

    expect(useInspectorStore.getState().isOpen).toBe(false);
  });

  it('handles Cmd+Shift+P without error', () => {
    renderHook(() => useKeyboardShortcuts());

    // Should not throw
    act(() => {
      fireKeydown('P', { metaKey: true, shiftKey: true });
    });

    // Inspector should remain unchanged
    expect(useInspectorStore.getState().isOpen).toBe(false);
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts());

    unmount();

    act(() => {
      fireKeydown('I', { metaKey: true, shiftKey: true });
    });

    // Should not toggle since listener was removed
    expect(useInspectorStore.getState().isOpen).toBe(false);
  });
});
