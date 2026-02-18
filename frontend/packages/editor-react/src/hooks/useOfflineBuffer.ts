import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseOfflineBufferOptions<T> {
  /**
   * Called for each buffered event when the connection is restored.
   * If this throws, the event remains in the buffer and flush is retried
   * on the next online event.
   */
  onFlush: (events: T[]) => Promise<void> | void;
  /**
   * Maximum number of events to keep in memory.
   * When exceeded, the oldest events are dropped.
   * Default: 500
   */
  maxBufferSize?: number;
  /**
   * localStorage key for persisting the buffer across page reloads.
   * If omitted, events are kept in memory only.
   */
  persistenceKey?: string;
}

export interface UseOfflineBufferReturn<T> {
  /** Add an event to the buffer. If online and not flushing, flushes immediately. */
  buffer: (event: T) => void;
  /** Number of events currently in the buffer */
  bufferSize: number;
  /** Whether a flush is currently in progress */
  isFlushing: boolean;
  /** Manually trigger a flush attempt */
  flush: () => Promise<void>;
  /** Clear all buffered events without flushing */
  clear: () => void;
}

function readFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeToStorage<T>(key: string, events: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(events));
  } catch {
    // Storage quota exceeded or unavailable — silently ignore
  }
}

function clearStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently ignore
  }
}

/**
 * Buffer events when offline and flush them when back online.
 *
 * Events are held in an in-memory array. Optionally they can be persisted to
 * localStorage (via `persistenceKey`) so they survive page reloads.
 *
 * @example
 * ```tsx
 * const { buffer } = useOfflineBuffer<KeystrokeEvent>({
 *   onFlush: async (events) => { await api.sendBatch(events); },
 *   persistenceKey: 'hw:keystroke-buffer',
 * });
 *
 * // In your event handler:
 * buffer(keystrokeEvent);
 * ```
 */
export function useOfflineBuffer<T>(
  options: UseOfflineBufferOptions<T>,
): UseOfflineBufferReturn<T> {
  const { onFlush, maxBufferSize = 500, persistenceKey } = options;

  // Initialise from localStorage if a persistence key is provided
  const [events, setEvents] = useState<T[]>(() => {
    if (persistenceKey && typeof window !== 'undefined') {
      return readFromStorage<T>(persistenceKey);
    }
    return [];
  });

  const [isFlushing, setIsFlushing] = useState(false);
  const isFlushingRef = useRef(false);

  // Keep localStorage in sync whenever events change
  useEffect(() => {
    if (persistenceKey) {
      if (events.length === 0) {
        clearStorage(persistenceKey);
      } else {
        writeToStorage(persistenceKey, events);
      }
    }
  }, [events, persistenceKey]);

  const flush = useCallback(async () => {
    if (isFlushingRef.current) return;
    if (events.length === 0) return;

    isFlushingRef.current = true;
    setIsFlushing(true);

    // Snapshot current events so new arrivals during flush are not lost
    const toFlush = [...events];

    try {
      await onFlush(toFlush);
      // Only clear the events that were successfully flushed
      setEvents((prev) => prev.slice(toFlush.length));
    } catch {
      // Flush failed — keep events in buffer, will retry on next online event
    } finally {
      isFlushingRef.current = false;
      setIsFlushing(false);
    }
  }, [events, onFlush]);

  // Auto-flush when coming back online
  useEffect(() => {
    const handleOnline = () => {
      void flush();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flush]);

  const buffer = useCallback(
    (event: T) => {
      setEvents((prev) => {
        const next = [...prev, event];
        // Enforce max buffer size by dropping oldest events
        if (next.length > maxBufferSize) {
          return next.slice(next.length - maxBufferSize);
        }
        return next;
      });

      // If online and not already flushing, flush immediately
      if (typeof navigator !== 'undefined' && navigator.onLine && !isFlushingRef.current) {
        void flush();
      }
    },
    [flush, maxBufferSize],
  );

  const clear = useCallback(() => {
    setEvents([]);
    if (persistenceKey) {
      clearStorage(persistenceKey);
    }
  }, [persistenceKey]);

  return {
    buffer,
    bufferSize: events.length,
    isFlushing,
    flush,
    clear,
  };
}
