import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EditEvent } from '../typing-analyzer/edit';
import type { KeystrokeEvent, KeystrokeStatVector } from '../typing-analyzer/keystroke';

// ---------------------------------------------------------------------------
// Fake Worker implementation
// ---------------------------------------------------------------------------

interface FakeWorkerInstance {
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
  postMessage: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  /** Simulate a message coming FROM the worker TO the main thread */
  simulateMessage(data: unknown): void;
  /** Simulate the worker throwing an error */
  simulateError(): void;
}

let lastFakeWorker: FakeWorkerInstance | null = null;

class FakeWorker implements FakeWorkerInstance {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();

  constructor(_url: URL, _options?: WorkerOptions) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastFakeWorker = this;
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error') as unknown as ErrorEvent);
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeydown(timestamp: number): KeystrokeEvent {
  return { type: 'keydown', keyCategory: 'letter', timestamp };
}

function makeKeyup(timestamp: number): KeystrokeEvent {
  return { type: 'keyup', keyCategory: 'letter', timestamp };
}

function makeEditEvent(timestamp: number): EditEvent {
  return {
    type: 'insert',
    position: { from: 0, to: 1 },
    timestamp,
    source: 'keyboard',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MetricsWorker', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalWorker: any;

  beforeEach(() => {
    lastFakeWorker = null;
    originalWorker = (globalThis as unknown as Record<string, unknown>).Worker;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Worker = FakeWorker;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Worker = originalWorker;
    vi.restoreAllMocks();
  });

  it('creates a Worker on construction', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    expect(lastFakeWorker).not.toBeNull();

    mw.terminate();
  });

  it('sends a process message to the worker when processEvents is called', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    const events: KeystrokeEvent[] = [makeKeydown(100), makeKeydown(200)];
    mw.processEvents(events);

    expect(lastFakeWorker!.postMessage).toHaveBeenCalledOnce();
    expect(lastFakeWorker!.postMessage).toHaveBeenCalledWith({
      type: 'process',
      events,
    });

    mw.terminate();
  });

  it('filters out non-KeystrokeEvents before sending to worker', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    const keystroke = makeKeydown(100);
    const edit = makeEditEvent(200);
    mw.processEvents([keystroke, edit]);

    expect(lastFakeWorker!.postMessage).toHaveBeenCalledWith({
      type: 'process',
      events: [keystroke],
    });

    mw.terminate();
  });

  it('does not post message when only EditEvents are passed', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    mw.processEvents([makeEditEvent(100)]);

    expect(lastFakeWorker!.postMessage).not.toHaveBeenCalled();

    mw.terminate();
  });

  it('does not post message for empty events array', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    mw.processEvents([]);

    expect(lastFakeWorker!.postMessage).not.toHaveBeenCalled();

    mw.terminate();
  });

  it('calls onVector for each vector received from the worker', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    const fakeVectors: KeystrokeStatVector[] = [
      {
        windowStart: 0,
        windowEnd: 5000,
        keystrokeCount: 3,
        avgWpm: 60,
        wpmStdDev: 0,
        avgDwellTime: 80,
        avgFlightTime: 40,
        flightTimeEntropy: 0.5,
        errorRate: 0,
        pauseCount: 0,
        burstPauseRatio: 0.1,
      },
      {
        windowStart: 5000,
        windowEnd: 10000,
        keystrokeCount: 2,
        avgWpm: 30,
        wpmStdDev: 0,
        avgDwellTime: 70,
        avgFlightTime: 50,
        flightTimeEntropy: 0.3,
        errorRate: 0,
        pauseCount: 0,
        burstPauseRatio: 0.08,
      },
    ];

    lastFakeWorker!.simulateMessage({ type: 'vectors', vectors: fakeVectors });

    expect(onVector).toHaveBeenCalledTimes(2);
    expect(onVector).toHaveBeenNthCalledWith(1, fakeVectors[0]);
    expect(onVector).toHaveBeenNthCalledWith(2, fakeVectors[1]);

    mw.terminate();
  });

  it('ignores messages from worker with unknown type', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    lastFakeWorker!.simulateMessage({ type: 'unknown', data: [] });

    expect(onVector).not.toHaveBeenCalled();

    mw.terminate();
  });

  it('switches to fallback mode when worker emits onerror', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    // Trigger worker error
    lastFakeWorker!.simulateError();

    // Worker should have been terminated
    expect(lastFakeWorker!.terminate).toHaveBeenCalled();

    // Now processEvents should use fallback (setTimeout), not postMessage
    const prevWorker = lastFakeWorker;
    mw.processEvents([makeKeydown(100)]);

    // postMessage must NOT be called after error
    expect(prevWorker!.postMessage).not.toHaveBeenCalled();
  });

  it('uses setTimeout fallback and calls onVector when worker is unavailable', async () => {
    vi.useFakeTimers();

    // Remove Worker from global so constructor throws
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).Worker = undefined;

    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    mw.processEvents([makeKeydown(0), makeKeyup(80), makeKeydown(120)]);

    // onVector not called yet — setTimeout pending
    expect(onVector).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    // aggregateIntoWindows should have produced at least one vector
    expect(onVector).toHaveBeenCalled();

    vi.useRealTimers();
    mw.terminate();
  });

  it('terminate() clears the worker reference', async () => {
    const { MetricsWorker } = await import('../typing-analyzer/collector/MetricsWorker');
    const onVector = vi.fn();
    const mw = new MetricsWorker(onVector);

    mw.terminate();

    expect(lastFakeWorker!.terminate).toHaveBeenCalled();

    // After terminate, processEvents should fall back to setTimeout (worker is null)
    vi.useFakeTimers();
    mw.processEvents([makeKeydown(100)]);
    await vi.runAllTimersAsync();
    expect(onVector).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
