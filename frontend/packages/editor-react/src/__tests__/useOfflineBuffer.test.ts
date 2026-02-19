import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOfflineBuffer } from '../hooks/useOfflineBuffer';

// ---------------------------------------------------------------------------
// localStorage mock helpers
// ---------------------------------------------------------------------------

function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    }),
    get store() {
      return store;
    },
  };
}

describe('useOfflineBuffer', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Default: online
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  it('starts with empty buffer', () => {
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer({ onFlush }));
    expect(result.current.bufferSize).toBe(0);
  });

  it('starts with isFlushing false', () => {
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer({ onFlush }));
    expect(result.current.isFlushing).toBe(false);
  });

  // -------------------------------------------------------------------------
  // buffer()
  // -------------------------------------------------------------------------

  it('adds events to the buffer', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('event-1');
    });

    expect(result.current.bufferSize).toBe(1);

    act(() => {
      result.current.buffer('event-2');
    });

    expect(result.current.bufferSize).toBe(2);
  });

  it('enforces maxBufferSize by dropping oldest events', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOfflineBuffer<number>({ onFlush, maxBufferSize: 3 }),
    );

    act(() => {
      result.current.buffer(1);
      result.current.buffer(2);
      result.current.buffer(3);
      result.current.buffer(4); // pushes out 1
    });

    expect(result.current.bufferSize).toBe(3);
  });

  it('flushes immediately when online', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    await act(async () => {
      result.current.buffer('event-online');
    });

    expect(onFlush).toHaveBeenCalled();
  });

  it('does not flush immediately when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    await act(async () => {
      result.current.buffer('event-offline');
    });

    expect(onFlush).not.toHaveBeenCalled();
    expect(result.current.bufferSize).toBe(1);
  });

  // -------------------------------------------------------------------------
  // flush()
  // -------------------------------------------------------------------------

  it('flush() calls onFlush with buffered events and clears buffer', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('a');
      result.current.buffer('b');
    });
    expect(result.current.bufferSize).toBe(2);

    await act(async () => {
      await result.current.flush();
    });

    expect(onFlush).toHaveBeenCalledWith(['a', 'b']);
    expect(result.current.bufferSize).toBe(0);
  });

  it('flush() is a no-op when buffer is empty', async () => {
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    await act(async () => {
      await result.current.flush();
    });

    expect(onFlush).not.toHaveBeenCalled();
  });

  it('keeps events in buffer when flush throws', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('event-fail');
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(result.current.bufferSize).toBe(1);
    expect(result.current.isFlushing).toBe(false);
  });

  it('does not start a second concurrent flush', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    let resolveFlush!: () => void;
    const onFlush = vi.fn().mockImplementation(
      () => new Promise<void>((res) => { resolveFlush = res; }),
    );
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('x');
    });

    // Start first flush (won't resolve yet)
    const flushPromise = await act(async () => {
      void result.current.flush();
    });

    // Attempt a second flush while first is in progress
    await act(async () => {
      await result.current.flush();
    });

    resolveFlush();
    await flushPromise;

    // onFlush should only have been called once
    expect(onFlush).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // clear()
  // -------------------------------------------------------------------------

  it('clear() empties the buffer without calling onFlush', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('x');
      result.current.buffer('y');
    });
    expect(result.current.bufferSize).toBe(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.bufferSize).toBe(0);
    expect(onFlush).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // auto-flush on online event
  // -------------------------------------------------------------------------

  it('auto-flushes when window online event fires', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('queued');
    });
    expect(result.current.bufferSize).toBe(1);

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(onFlush).toHaveBeenCalledWith(['queued']);
  });

  it('removes online listener on unmount', () => {
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    unmount();

    // Dispatching online after unmount should not throw
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  // -------------------------------------------------------------------------
  // localStorage persistence
  // -------------------------------------------------------------------------

  it('reads initial events from localStorage when persistenceKey provided', () => {
    const stored = JSON.stringify(['stored-event-1', 'stored-event-2']);
    localStorageMock.getItem.mockReturnValue(stored);

    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOfflineBuffer<string>({ onFlush, persistenceKey: 'hw:test-buffer' }),
    );

    expect(result.current.bufferSize).toBe(2);
  });

  it('writes events to localStorage when persistenceKey provided', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOfflineBuffer<string>({
        onFlush,
        persistenceKey: 'hw:test-buffer',
      }),
    );

    act(() => {
      result.current.buffer('persist-me');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'hw:test-buffer',
      JSON.stringify(['persist-me']),
    );
  });

  it('removes localStorage entry when buffer is emptied via flush', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOfflineBuffer<string>({
        onFlush,
        persistenceKey: 'hw:test-buffer',
      }),
    );

    act(() => {
      result.current.buffer('event');
    });

    await act(async () => {
      await result.current.flush();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('hw:test-buffer');
  });

  it('removes localStorage entry when clear() is called', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOfflineBuffer<string>({
        onFlush,
        persistenceKey: 'hw:test-buffer',
      }),
    );

    act(() => {
      result.current.buffer('event');
    });

    act(() => {
      result.current.clear();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('hw:test-buffer');
  });

  it('handles corrupt localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('not-valid-json{{{');

    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useOfflineBuffer<string>({
        onFlush,
        persistenceKey: 'hw:test-buffer',
      }),
    );

    // Should not throw, buffer should start empty
    expect(result.current.bufferSize).toBe(0);
  });

  it('does not use localStorage when persistenceKey is not provided', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.buffer('no-persist');
    });

    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });

  it('does not call removeItem on clear() without persistenceKey', () => {
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useOfflineBuffer<string>({ onFlush }));

    act(() => {
      result.current.clear();
    });

    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });
});
