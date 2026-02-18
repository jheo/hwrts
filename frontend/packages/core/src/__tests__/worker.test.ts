import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KeystrokeEvent } from '../typing-analyzer/keystroke';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeKeydown(timestamp: number): KeystrokeEvent {
  return { type: 'keydown', keyCategory: 'letter', timestamp };
}

// ---------------------------------------------------------------------------
// Tests for metrics-worker.worker.ts
//
// The worker script assigns self.onmessage at module evaluation time.
// We stub globalThis.self with a postMessage spy BEFORE importing the module,
// then invoke self.onmessage directly to simulate incoming messages.
// ---------------------------------------------------------------------------

describe('metrics-worker.worker', () => {
  let postMessageSpy: ReturnType<typeof vi.fn>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalSelf: any;

  beforeEach(() => {
    postMessageSpy = vi.fn();
    originalSelf = (globalThis as unknown as Record<string, unknown>).self;

    // Provide a minimal DedicatedWorkerGlobalScope-like object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).self = {
      onmessage: null as unknown,
      postMessage: postMessageSpy,
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).self = originalSelf;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  async function loadWorker() {
    // Reset module registry so the script re-runs and re-assigns self.onmessage
    vi.resetModules();
    await import('../typing-analyzer/collector/metrics-worker.worker');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).self as {
      onmessage: ((e: MessageEvent) => void) | null;
      postMessage: ReturnType<typeof vi.fn>;
    };
  }

  it('registers self.onmessage on module load', async () => {
    const workerSelf = await loadWorker();
    expect(typeof workerSelf.onmessage).toBe('function');
  });

  it('responds with vectors message for process type', async () => {
    const workerSelf = await loadWorker();

    const events: KeystrokeEvent[] = [
      makeKeydown(0),
      makeKeydown(200),
      makeKeydown(400),
    ];

    const msg = new MessageEvent('message', {
      data: { type: 'process', events },
    });

    workerSelf.onmessage!(msg);

    expect(postMessageSpy).toHaveBeenCalledOnce();
    const response = postMessageSpy.mock.calls[0]![0] as {
      type: string;
      vectors: unknown[];
    };
    expect(response.type).toBe('vectors');
    expect(Array.isArray(response.vectors)).toBe(true);
  });

  it('produces a non-empty vectors array for valid keystroke events', async () => {
    const workerSelf = await loadWorker();

    const events: KeystrokeEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push(makeKeydown(i * 300));
    }

    workerSelf.onmessage!(
      new MessageEvent('message', { data: { type: 'process', events } }),
    );

    const response = postMessageSpy.mock.calls[0]![0] as {
      type: string;
      vectors: unknown[];
    };
    expect(response.vectors.length).toBeGreaterThan(0);
  });

  it('uses the provided windowSize when computing vectors', async () => {
    const workerSelf = await loadWorker();

    // Two events 6 seconds apart — with windowSize 5000 they land in different windows,
    // with windowSize 10000 they land in the same window.
    const events: KeystrokeEvent[] = [makeKeydown(0), makeKeydown(6000)];

    workerSelf.onmessage!(
      new MessageEvent('message', {
        data: { type: 'process', events, windowSize: 10000 },
      }),
    );

    const response = postMessageSpy.mock.calls[0]![0] as {
      type: string;
      vectors: { keystrokeCount: number }[];
    };
    expect(response.vectors).toHaveLength(1);
    expect(response.vectors[0]!.keystrokeCount).toBe(2);
  });

  it('defaults windowSize to 5000ms when not provided', async () => {
    const workerSelf = await loadWorker();

    // Two events 6 seconds apart — default 5000ms window splits them.
    const events: KeystrokeEvent[] = [makeKeydown(0), makeKeydown(6000)];

    workerSelf.onmessage!(
      new MessageEvent('message', { data: { type: 'process', events } }),
    );

    const response = postMessageSpy.mock.calls[0]![0] as {
      type: string;
      vectors: unknown[];
    };
    expect(response.vectors).toHaveLength(2);
  });

  it('does not call postMessage for unknown message types', async () => {
    const workerSelf = await loadWorker();

    workerSelf.onmessage!(
      new MessageEvent('message', {
        data: { type: 'unknown', events: [] },
      }),
    );

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it('returns empty vectors array for empty events list', async () => {
    const workerSelf = await loadWorker();

    workerSelf.onmessage!(
      new MessageEvent('message', {
        data: { type: 'process', events: [] },
      }),
    );

    const response = postMessageSpy.mock.calls[0]![0] as {
      type: string;
      vectors: unknown[];
    };
    expect(response.type).toBe('vectors');
    expect(response.vectors).toEqual([]);
  });
});
