import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFocusMode } from '../hooks/useFocusMode';
import { useEditorStore } from '../store/useEditorStore';

describe('useFocusMode', () => {
  beforeEach(() => {
    act(() => {
      useEditorStore.setState({ focusMode: 'off' });
    });
  });

  it('returns current focus mode from store', () => {
    const { result } = renderHook(() => useFocusMode());
    expect(result.current.focusMode).toBe('off');
  });

  it('toggles focus mode', () => {
    const { result } = renderHook(() => useFocusMode());

    act(() => {
      result.current.toggleFocusMode();
    });

    expect(result.current.focusMode).toBe('soft');
  });

  it('responds to hw:toggle-focus-mode custom event', () => {
    const { result } = renderHook(() => useFocusMode());

    expect(result.current.focusMode).toBe('off');

    act(() => {
      window.dispatchEvent(new CustomEvent('hw:toggle-focus-mode'));
    });

    expect(result.current.focusMode).toBe('soft');
  });

  it('cleans up event listener on unmount', () => {
    const { unmount } = renderHook(() => useFocusMode());

    unmount();

    // Dispatch after unmount should not toggle
    const storeStateBefore = useEditorStore.getState().focusMode;
    window.dispatchEvent(new CustomEvent('hw:toggle-focus-mode'));
    expect(useEditorStore.getState().focusMode).toBe(storeStateBefore);
  });
});
