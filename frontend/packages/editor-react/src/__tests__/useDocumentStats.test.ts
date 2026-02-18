import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateStats, useDocumentStats } from '../hooks/useDocumentStats';

// ---------------------------------------------------------------------------
// Mock editor factory
// ---------------------------------------------------------------------------

type UpdateHandler = () => void;

function createMockEditor(text = '') {
  const handlers: UpdateHandler[] = [];

  const editor = {
    getText: vi.fn().mockReturnValue(text),
    on: vi.fn((event: string, handler: UpdateHandler) => {
      if (event === 'update') handlers.push(handler);
    }),
    off: vi.fn((event: string, handler: UpdateHandler) => {
      if (event === 'update') {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    }),
    // Helper to trigger all registered update handlers
    _triggerUpdate() {
      for (const h of handlers) h();
    },
    _handlers: handlers,
  };

  return editor;
}

// ---------------------------------------------------------------------------
// requestIdleCallback / cancelIdleCallback shims for jsdom
// ---------------------------------------------------------------------------

beforeEach(() => {
  // jsdom does not implement requestIdleCallback — provide a synchronous shim
  let idleIdCounter = 0;
  vi.stubGlobal(
    'requestIdleCallback',
    vi.fn((cb: IdleRequestCallback) => {
      const id = ++idleIdCounter;
      // Execute synchronously so tests do not need timers
      cb({ didTimeout: false, timeRemaining: () => 50 });
      return id;
    }),
  );
  vi.stubGlobal('cancelIdleCallback', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// useDocumentStats hook tests
// ---------------------------------------------------------------------------

describe('useDocumentStats hook', () => {
  it('returns initial zero stats when editor is null', () => {
    const { result } = renderHook(() => useDocumentStats(null));

    expect(result.current.wordCount).toBe(0);
    expect(result.current.paragraphCount).toBe(0);
    expect(result.current.readingTime).toBe(0);
    expect(result.current.charCount).toBe(0);
  });

  it('calculates stats from editor text on mount', () => {
    const editor = createMockEditor('Hello world');
    const { result } = renderHook(() =>
      useDocumentStats(editor as never),
    );

    expect(result.current.wordCount).toBe(2);
    expect(result.current.charCount).toBe(10);
  });

  it('registers an update listener on the editor', () => {
    const editor = createMockEditor('test');
    renderHook(() => useDocumentStats(editor as never));

    expect(editor.on).toHaveBeenCalledWith('update', expect.any(Function));
  });

  it('updates stats when editor fires update event', () => {
    const editor = createMockEditor('Hello');
    const { result } = renderHook(() => useDocumentStats(editor as never));

    expect(result.current.wordCount).toBe(1);

    // Change text and trigger update
    editor.getText.mockReturnValue('Hello world again');

    act(() => {
      editor._triggerUpdate();
    });

    expect(result.current.wordCount).toBe(3);
  });

  it('deregisters update listener on unmount', () => {
    const editor = createMockEditor('text');
    const { unmount } = renderHook(() => useDocumentStats(editor as never));

    unmount();

    expect(editor.off).toHaveBeenCalledWith('update', expect.any(Function));
  });

  it('cancels pending idle callback on unmount', () => {
    // Make requestIdleCallback NOT execute synchronously so we can catch cancellation
    const pendingCallbacks = new Map<number, IdleRequestCallback>();
    let counter = 0;
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((cb: IdleRequestCallback) => {
        const id = ++counter;
        pendingCallbacks.set(id, cb);
        return id;
      }),
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    const editor = createMockEditor('text');
    const { unmount } = renderHook(() => useDocumentStats(editor as never));

    // Trigger update to schedule an idle callback
    act(() => {
      editor._triggerUpdate();
    });

    unmount();

    expect(cancelIdleCallback).toHaveBeenCalled();
  });

  it('cancels previous idle callback before scheduling a new one', () => {
    // Accumulate scheduled IDs without auto-executing
    const scheduled: number[] = [];
    let counter = 0;
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((_cb: IdleRequestCallback) => {
        const id = ++counter;
        scheduled.push(id);
        return id;
      }),
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());

    const editor = createMockEditor('text');
    renderHook(() => useDocumentStats(editor as never));

    // Trigger two updates in sequence
    act(() => {
      editor._triggerUpdate();
    });
    act(() => {
      editor._triggerUpdate();
    });

    // cancelIdleCallback should have been called with the first scheduled id
    expect(cancelIdleCallback).toHaveBeenCalledWith(scheduled[0]);
  });

  it('does not register listener when editor is null', () => {
    // Should not throw
    const { result } = renderHook(() => useDocumentStats(null));
    expect(result.current.wordCount).toBe(0);
  });

  it('returns zero stats when editor text is empty', () => {
    const editor = createMockEditor('');
    const { result } = renderHook(() => useDocumentStats(editor as never));
    expect(result.current.wordCount).toBe(0);
    expect(result.current.readingTime).toBe(0);
  });

  it('handles Korean text in editor', () => {
    const editor = createMockEditor('안녕하세요');
    const { result } = renderHook(() => useDocumentStats(editor as never));
    expect(result.current.wordCount).toBe(5); // 5 Korean syllables
    expect(result.current.readingTime).toBe(1); // < 500 chars => ceil to 1
  });
});

// ---------------------------------------------------------------------------
// calculateStats — pure function tests
// ---------------------------------------------------------------------------

describe('calculateStats', () => {
  it('returns zero stats for empty string', () => {
    const stats = calculateStats('');
    expect(stats.wordCount).toBe(0);
    expect(stats.paragraphCount).toBe(0);
    expect(stats.readingTime).toBe(0);
    expect(stats.charCount).toBe(0);
  });

  it('returns zero stats for whitespace-only string', () => {
    const stats = calculateStats('   \n\n  ');
    expect(stats.wordCount).toBe(0);
    expect(stats.paragraphCount).toBe(0);
  });

  it('counts English words correctly', () => {
    const stats = calculateStats('Hello world this is a test');
    expect(stats.wordCount).toBe(6);
    expect(stats.charCount).toBe(21);
  });

  it('counts Korean characters as words', () => {
    const stats = calculateStats('안녕하세요 세상');
    expect(stats.wordCount).toBe(7);
  });

  it('handles mixed Korean and English', () => {
    const stats = calculateStats('Hello 안녕 world');
    expect(stats.wordCount).toBe(4);
  });

  it('counts paragraphs by double newlines', () => {
    const stats = calculateStats('First paragraph\n\nSecond paragraph\n\nThird');
    expect(stats.paragraphCount).toBe(3);
  });

  it('counts single text as one paragraph', () => {
    const stats = calculateStats('Just one paragraph here');
    expect(stats.paragraphCount).toBe(1);
  });

  it('calculates reading time for English text', () => {
    const words = Array.from({ length: 200 }, () => 'word').join(' ');
    const stats = calculateStats(words);
    expect(stats.readingTime).toBe(1);
  });

  it('calculates reading time for Korean text', () => {
    const chars = '가'.repeat(500);
    const stats = calculateStats(chars);
    expect(stats.readingTime).toBe(1);
  });

  it('returns at least 1 minute reading time for non-empty text', () => {
    const stats = calculateStats('Hi');
    expect(stats.readingTime).toBe(1);
  });

  it('counts characters excluding spaces', () => {
    const stats = calculateStats('a b c');
    expect(stats.charCount).toBe(3);
  });

  it('handles English words with apostrophes and hyphens', () => {
    const stats = calculateStats("don't well-known it's");
    expect(stats.wordCount).toBe(3);
  });

  it('calculates combined reading time for mixed content', () => {
    // 200 English words + 500 Korean chars = 1 + 1 = 2 minutes
    const englishWords = Array.from({ length: 200 }, () => 'word').join(' ');
    const koreanChars = '가'.repeat(500);
    const stats = calculateStats(`${englishWords} ${koreanChars}`);
    expect(stats.readingTime).toBe(2);
  });

  it('treats multiple blank lines between paragraphs correctly', () => {
    const stats = calculateStats('Para one\n\n\n\nPara two');
    expect(stats.paragraphCount).toBe(2);
  });
});
