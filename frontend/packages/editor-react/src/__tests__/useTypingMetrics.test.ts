import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTypingMetrics } from '../hooks/useTypingMetrics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeystrokeEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'keydown',
    keyCategory: 'letter',
    timestamp: performance.now(),
    ...overrides,
  };
}

function makeEditEvent(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    type: 'insert',
    position: { from: 0, to: 0 },
    contentLength: 5,
    timestamp: performance.now(),
    source: 'keyboard',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTypingMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial metrics with isRecording false', () => {
    const { result } = renderHook(() => useTypingMetrics());

    expect(result.current.metrics.isRecording).toBe(false);
    expect(result.current.metrics.sessionId).toBeNull();
    expect(result.current.metrics.totalKeystrokes).toBe(0);
    expect(result.current.metrics.totalEdits).toBe(0);
    expect(result.current.metrics.currentWpm).toBe(0);
    expect(result.current.metrics.sessionDuration).toBe(0);
  });

  it('startRecording sets isRecording and sessionId', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('session-123');
    });

    expect(result.current.metrics.isRecording).toBe(true);
    expect(result.current.metrics.sessionId).toBe('session-123');
    expect(result.current.metrics.totalKeystrokes).toBe(0);
    expect(result.current.metrics.totalEdits).toBe(0);
  });

  it('stopRecording sets isRecording to false', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('session-abc');
    });
    expect(result.current.metrics.isRecording).toBe(true);

    act(() => {
      result.current.stopRecording();
    });
    expect(result.current.metrics.isRecording).toBe(false);
  });

  it('increments totalKeystrokes on keydown events', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    act(() => {
      result.current.onEvent(makeKeystrokeEvent({ type: 'keydown' }) as never);
    });
    expect(result.current.metrics.totalKeystrokes).toBe(1);

    act(() => {
      result.current.onEvent(makeKeystrokeEvent({ type: 'keydown' }) as never);
    });
    expect(result.current.metrics.totalKeystrokes).toBe(2);
  });

  it('does NOT increment totalKeystrokes on keyup events', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    act(() => {
      result.current.onEvent(makeKeystrokeEvent({ type: 'keyup' }) as never);
    });
    expect(result.current.metrics.totalKeystrokes).toBe(0);
  });

  it('increments totalEdits on edit events', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    act(() => {
      result.current.onEvent(makeEditEvent({ type: 'insert' }) as never);
    });
    expect(result.current.metrics.totalEdits).toBe(1);

    act(() => {
      result.current.onEvent(makeEditEvent({ type: 'delete' }) as never);
    });
    expect(result.current.metrics.totalEdits).toBe(2);

    act(() => {
      result.current.onEvent(makeEditEvent({ type: 'paste' }) as never);
    });
    expect(result.current.metrics.totalEdits).toBe(3);
  });

  it('calculates WPM from letter keydown events', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    // Simulate 10 letter keystrokes spaced 100ms apart → 10 chars in 900ms
    // WPM = (10/5) * (60000/900) = 2 * 66.67 ≈ 133
    const baseTime = performance.now();
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.onEvent(
          makeKeystrokeEvent({
            type: 'keydown',
            keyCategory: 'letter',
            timestamp: baseTime + i * 100,
          }) as never,
        );
      });
    }

    expect(result.current.metrics.currentWpm).toBeGreaterThan(0);
    // 10 chars over 900ms = (10/5) * (60000/900) ≈ 133
    expect(result.current.metrics.currentWpm).toBe(133);
  });

  it('does NOT update WPM for modifier keydown events', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    act(() => {
      result.current.onEvent(
        makeKeystrokeEvent({
          type: 'keydown',
          keyCategory: 'modifier',
          timestamp: performance.now(),
        }) as never,
      );
    });

    expect(result.current.metrics.currentWpm).toBe(0);
  });

  it('updates sessionDuration over time', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    // Initially should be near 0
    expect(result.current.metrics.sessionDuration).toBe(0);

    // Advance timers by 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // sessionDuration should be roughly 3000ms
    // (exact value depends on performance.now() mock behavior)
    expect(result.current.metrics.sessionDuration).toBeGreaterThan(0);
  });

  it('stops updating sessionDuration after stopRecording', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    act(() => {
      result.current.stopRecording();
    });

    const durationAfterStop = result.current.metrics.sessionDuration;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Duration should not change after stop
    expect(result.current.metrics.sessionDuration).toBe(durationAfterStop);
  });

  it('resets metrics when starting a new recording', () => {
    const { result } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    // Add some events
    act(() => {
      result.current.onEvent(makeKeystrokeEvent({ type: 'keydown' }) as never);
      result.current.onEvent(makeEditEvent() as never);
    });

    expect(result.current.metrics.totalKeystrokes).toBe(1);
    expect(result.current.metrics.totalEdits).toBe(1);

    // Start a new session — counters should reset
    act(() => {
      result.current.startRecording('s2');
    });

    expect(result.current.metrics.sessionId).toBe('s2');
    expect(result.current.metrics.totalKeystrokes).toBe(0);
    expect(result.current.metrics.totalEdits).toBe(0);
    expect(result.current.metrics.currentWpm).toBe(0);
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { result, unmount } = renderHook(() => useTypingMetrics());

    act(() => {
      result.current.startRecording('s1');
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
