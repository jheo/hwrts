import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useEditorStore } from '../store/useEditorStore';

describe('useEditorStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useEditorStore());
    act(() => {
      result.current.setTitle('');
      result.current.updateStats(0, 0, 0);
      result.current.markClean();
    });
  });

  it('has correct initial state', () => {
    const { result } = renderHook(() => useEditorStore());

    expect(result.current.title).toBe('');
    expect(result.current.wordCount).toBe(0);
    expect(result.current.characterCount).toBe(0);
    expect(result.current.paragraphCount).toBe(0);
    expect(result.current.isDirty).toBe(false);
  });

  it('sets title and marks as dirty', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.setTitle('My Document');
    });

    expect(result.current.title).toBe('My Document');
    expect(result.current.isDirty).toBe(true);
  });

  it('updates stats', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.updateStats(42, 256, 5);
    });

    expect(result.current.wordCount).toBe(42);
    expect(result.current.characterCount).toBe(256);
    expect(result.current.paragraphCount).toBe(5);
  });

  it('marks dirty', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.markDirty();
    });

    expect(result.current.isDirty).toBe(true);
  });

  it('marks clean and sets lastSavedAt', () => {
    const { result } = renderHook(() => useEditorStore());

    act(() => {
      result.current.markDirty();
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.markClean();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSavedAt).toBeTypeOf('number');
    expect(result.current.lastSavedAt).toBeGreaterThan(0);
  });
});
