import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useInspector, useInspectorStore } from '../hooks/useInspector';

describe('useInspector', () => {
  beforeEach(() => {
    act(() => {
      useInspectorStore.setState({ isOpen: false, activeTab: 'stats' });
    });
  });

  it('starts closed with stats tab', () => {
    const { result } = renderHook(() => useInspector());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeTab).toBe('stats');
  });

  it('opens the inspector', () => {
    const { result } = renderHook(() => useInspector());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes the inspector', () => {
    act(() => {
      useInspectorStore.setState({ isOpen: true });
    });

    const { result } = renderHook(() => useInspector());

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('toggles the inspector', () => {
    const { result } = renderHook(() => useInspector());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it('sets active tab and opens inspector', () => {
    const { result } = renderHook(() => useInspector());

    act(() => {
      result.current.setTab('review');
    });

    expect(result.current.activeTab).toBe('review');
    expect(result.current.isOpen).toBe(true);
  });
});
