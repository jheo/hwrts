'use client';

import type { EditEvent, KeystrokeEvent } from '@humanwrites/core';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TypingMetrics {
  /** Whether keystroke recording is active. */
  isRecording: boolean;
  /** Current session identifier (null when not recording). */
  sessionId: string | null;
  /** Total keydown events received in this session. */
  totalKeystrokes: number;
  /** Total edit events (insert/delete/replace/paste) received. */
  totalEdits: number;
  /** Rolling WPM estimate based on the last 60 seconds of letter/number keystrokes. */
  currentWpm: number;
  /** Elapsed session time in milliseconds. */
  sessionDuration: number;
}

export interface UseTypingMetricsReturn {
  metrics: TypingMetrics;
  /** Begin a new recording session. */
  startRecording: (sessionId: string) => void;
  /** Stop the current recording session. */
  stopRecording: () => void;
  /** Feed a keystroke or edit event — pass this as `onTypingEvent` to createExtensions. */
  onEvent: (event: KeystrokeEvent | EditEvent) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard word length used for WPM calculation. */
const CHARS_PER_WORD = 5;

/** Window (ms) over which we calculate rolling WPM. */
const WPM_WINDOW_MS = 60_000;

/** Interval (ms) for updating sessionDuration. */
const DURATION_TICK_MS = 1_000;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_METRICS: TypingMetrics = {
  isRecording: false,
  sessionId: null,
  totalKeystrokes: 0,
  totalEdits: 0,
  currentWpm: 0,
  sessionDuration: 0,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTypingMetrics(): UseTypingMetricsReturn {
  const [metrics, setMetrics] = useState<TypingMetrics>(INITIAL_METRICS);

  /** Timestamp when the current session started (performance.now()). */
  const sessionStartRef = useRef<number>(0);

  /** Timestamps of recent letter/number keydown events for WPM calculation. */
  const recentKeystrokesRef = useRef<number[]>([]);

  /** Handle for the duration-update interval. */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- startRecording ----------------------------------------------------

  const startRecording = useCallback((sessionId: string) => {
    sessionStartRef.current = performance.now();
    recentKeystrokesRef.current = [];

    setMetrics({
      isRecording: true,
      sessionId,
      totalKeystrokes: 0,
      totalEdits: 0,
      currentWpm: 0,
      sessionDuration: 0,
    });

    // Tick session duration every second
    intervalRef.current = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        sessionDuration: performance.now() - sessionStartRef.current,
      }));
    }, DURATION_TICK_MS);
  }, []);

  // ---- stopRecording -----------------------------------------------------

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMetrics((prev) => ({ ...prev, isRecording: false }));
  }, []);

  // ---- onEvent -----------------------------------------------------------

  const onEvent = useCallback((event: KeystrokeEvent | EditEvent) => {
    if ('keyCategory' in event) {
      // ---- Keystroke event ----
      if (event.type === 'keydown') {
        setMetrics((prev) => ({
          ...prev,
          totalKeystrokes: prev.totalKeystrokes + 1,
        }));

        // Only letter/number keys contribute to WPM
        if (event.keyCategory === 'letter' || event.keyCategory === 'number') {
          const now = event.timestamp;
          const recent = recentKeystrokesRef.current;
          recent.push(now);

          // Prune entries older than the rolling window
          const cutoff = now - WPM_WINDOW_MS;
          recentKeystrokesRef.current = recent.filter((t) => t > cutoff);

          // WPM = (chars / CHARS_PER_WORD) * (60000 / elapsed)
          const count = recentKeystrokesRef.current.length;
          if (count > 1) {
            const elapsed =
              recentKeystrokesRef.current[count - 1]! -
              recentKeystrokesRef.current[0]!;
            const wpm =
              elapsed > 0
                ? Math.round((count / CHARS_PER_WORD) * (WPM_WINDOW_MS / elapsed))
                : 0;
            setMetrics((prev) => ({ ...prev, currentWpm: wpm }));
          }
        }
      }
    } else {
      // ---- Edit event ----
      setMetrics((prev) => ({
        ...prev,
        totalEdits: prev.totalEdits + 1,
      }));
    }
  }, []);

  // ---- Cleanup on unmount ------------------------------------------------

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { metrics, startRecording, stopRecording, onEvent };
}
