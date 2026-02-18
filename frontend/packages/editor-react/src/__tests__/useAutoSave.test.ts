import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave, type AutoSaveOptions } from '../hooks/useAutoSave';
import { useEditorStore } from '../store/useEditorStore';

// Mock a minimal TipTap editor
function createMockEditor(json: Record<string, unknown> = { type: 'doc', content: [] }) {
  return {
    getJSON: vi.fn().mockReturnValue(json),
    commands: {
      setContent: vi.fn(),
    },
  } as unknown as Parameters<typeof useAutoSave>[0];
}

function createMockOptions(overrides: Partial<AutoSaveOptions> = {}): AutoSaveOptions {
  return {
    documentId: 'test-doc',
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store
    useEditorStore.setState({
      title: '',
      wordCount: 0,
      characterCount: 0,
      paragraphCount: 0,
      isDirty: false,
      lastSavedAt: null,
      focusMode: 'off',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns saved status initially', () => {
    const editor = createMockEditor();
    const options = createMockOptions();

    const { result } = renderHook(() => useAutoSave(editor, options));
    expect(result.current).toBe('saved');
  });

  it('returns saved when editor is null', () => {
    const options = createMockOptions();
    const { result } = renderHook(() => useAutoSave(null, options));
    expect(result.current).toBe('saved');
  });

  it('loads document on mount when editor is available', async () => {
    const loadData = { title: 'Loaded Title', content: '{"type":"doc"}' };
    const options = createMockOptions({
      load: vi.fn().mockResolvedValue(loadData),
    });
    const editor = createMockEditor();

    renderHook(() => useAutoSave(editor, options));

    // Wait for load to complete
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(options.load).toHaveBeenCalledWith('test-doc');
    expect(useEditorStore.getState().title).toBe('Loaded Title');
  });

  it('does not load when editor is null', async () => {
    const options = createMockOptions();
    renderHook(() => useAutoSave(null, options));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(options.load).not.toHaveBeenCalled();
  });

  it('saves after debounce when dirty', async () => {
    const editor = createMockEditor({ type: 'doc', content: [{ type: 'paragraph' }] });
    const options = createMockOptions();

    renderHook(() => useAutoSave(editor, options));

    // Mark as dirty
    act(() => {
      useEditorStore.getState().markDirty();
    });

    // Advance past debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(options.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-doc',
        title: '',
        wordCount: 0,
      }),
    );
  });

  it('handles load returning undefined (no existing doc)', async () => {
    const options = createMockOptions({
      load: vi.fn().mockResolvedValue(undefined),
    });
    const editor = createMockEditor();

    renderHook(() => useAutoSave(editor, options));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Should not crash, title stays empty
    expect(useEditorStore.getState().title).toBe('');
  });

  it('handles load with invalid JSON content gracefully', async () => {
    const options = createMockOptions({
      load: vi.fn().mockResolvedValue({ title: 'Test', content: 'not-json' }),
    });
    const editor = createMockEditor();

    renderHook(() => useAutoSave(editor, options));

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Title should still be set even if content parse fails
    expect(useEditorStore.getState().title).toBe('Test');
  });

  it('handles save failure gracefully', async () => {
    const editor = createMockEditor();
    const options = createMockOptions({
      save: vi.fn().mockRejectedValue(new Error('Save failed')),
    });

    renderHook(() => useAutoSave(editor, options));

    act(() => {
      useEditorStore.getState().markDirty();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Should not crash, status would be 'unsaved'
    expect(options.save).toHaveBeenCalled();
  });

  it('registers beforeunload handler', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const editor = createMockEditor();
    const options = createMockOptions();

    renderHook(() => useAutoSave(editor, options));

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('cleans up beforeunload handler on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const editor = createMockEditor();
    const options = createMockOptions();

    const { unmount } = renderHook(() => useAutoSave(editor, options));
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
