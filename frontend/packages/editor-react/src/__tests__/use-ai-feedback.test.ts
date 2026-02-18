import { Editor } from '@tiptap/react';
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createExtensions } from '../extensions';
import { useAiFeedback } from '../hooks/useAiFeedback';

// ---------------------------------------------------------------------------
// Mock getClientRects for jsdom (ProseMirror scrollIntoView needs it)
// ---------------------------------------------------------------------------

const originalGetClientRects = Range.prototype.getClientRects;
const originalGetBoundingClientRect = Range.prototype.getBoundingClientRect;

beforeEach(() => {
  Range.prototype.getClientRects = vi.fn().mockReturnValue([
    { top: 0, left: 0, bottom: 10, right: 10, width: 10, height: 10 },
  ]);
  Range.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
    top: 0, left: 0, bottom: 10, right: 10, width: 10, height: 10,
  });
});

afterEach(() => {
  Range.prototype.getClientRects = originalGetClientRects;
  Range.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestEditor(content = '<p>Hello world</p>'): Editor {
  const el = document.createElement('div');
  document.body.appendChild(el);

  return new Editor({
    element: el,
    extensions: createExtensions({ placeholder: 'Test' }),
    content,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAiFeedback', () => {
  let editor: Editor;

  beforeEach(() => {
    editor = createTestEditor('<p>Hello world</p>');
    vi.useFakeTimers();
  });

  afterEach(() => {
    editor.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useAiFeedback(editor));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.reviewItems).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('returns disabled state when enabled is false', () => {
    const { result } = renderHook(() =>
      useAiFeedback(editor, { enabled: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.reviewItems).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('handles null editor gracefully', () => {
    const { result } = renderHook(() => useAiFeedback(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.reviewItems).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('debounces API calls after editor updates', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(() => useAiFeedback(editor, { debounceMs: 500 }));

    // Trigger editor update by inserting content
    act(() => {
      editor.commands.insertContent('test');
    });

    // Before debounce expires, no fetch should have been called
    expect(fetchSpy).not.toHaveBeenCalled();

    // Advance time past the debounce
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not fetch when text is unchanged since last check', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(() => useAiFeedback(editor, { debounceMs: 100 }));

    // Trigger first update
    act(() => {
      editor.commands.insertContent('test');
    });

    // Let debounce fire and fetch complete
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Trigger an update event without actually changing text content
    // by moving the cursor (selection change triggers 'update' but
    // paragraph text stays the same)
    act(() => {
      editor.commands.setTextSelection(1);
    });

    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    // Should still be 1 because text didn't change
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('aborts previous request when a new one starts', async () => {
    let abortCount = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            abortCount++;
          });
        }
        // Return a delayed response
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(
              new Response(JSON.stringify({ items: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
              }),
            );
          }, 1000);
        });
      },
    );

    renderHook(() => useAiFeedback(editor, { debounceMs: 100 }));

    // First update
    act(() => {
      editor.commands.insertContent('first');
    });

    // Let debounce fire (starts first fetch)
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    // Second update before first fetch completes
    act(() => {
      editor.commands.insertContent(' second');
    });

    // Let debounce fire (starts second fetch, should abort first)
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(abortCount).toBe(1);
  });

  it('does not fetch for empty paragraphs', () => {
    const emptyEditor = createTestEditor('<p></p>');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    renderHook(() => useAiFeedback(emptyEditor, { debounceMs: 100 }));

    // Trigger an update event on the empty editor (selection change)
    act(() => {
      emptyEditor.commands.setTextSelection(1);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(fetchSpy).not.toHaveBeenCalled();

    emptyEditor.destroy();
  });

  it('refresh() forces a re-check', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() =>
      useAiFeedback(editor, { debounceMs: 1500 }),
    );

    // Initial content is "Hello world", call refresh manually
    await act(async () => {
      result.current.refresh();
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('handles API errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const { result } = renderHook(() =>
      useAiFeedback(editor, { debounceMs: 100 }),
    );

    // Trigger update
    act(() => {
      editor.commands.insertContent('error test');
    });

    // Let debounce fire and fetch complete
    await act(async () => {
      vi.advanceTimersByTime(200);
      // Multiple ticks to let async operations settle
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('cleans up timers on unmount', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { unmount } = renderHook(() =>
      useAiFeedback(editor, { debounceMs: 500 }),
    );

    // Trigger an update to create a timer
    act(() => {
      editor.commands.insertContent('cleanup');
    });

    // Unmount before debounce fires
    unmount();

    // Advance past debounce -- fetch should NOT have been called since timer was cleaned up
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
