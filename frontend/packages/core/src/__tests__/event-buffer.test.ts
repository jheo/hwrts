import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EventBuffer } from '../typing-analyzer/collector/EventBuffer';
import type { EditEvent } from '../typing-analyzer/edit';
import type { KeystrokeEvent } from '../typing-analyzer/keystroke';

function makeKeystrokeEvent(
  overrides: Partial<KeystrokeEvent> = {},
): KeystrokeEvent {
  return {
    type: 'keydown',
    keyCategory: 'letter',
    timestamp: performance.now(),
    ...overrides,
  };
}

function makeEditEvent(overrides: Partial<EditEvent> = {}): EditEvent {
  return {
    type: 'insert',
    position: { from: 0, to: 0 },
    timestamp: performance.now(),
    source: 'keyboard',
    ...overrides,
  };
}

describe('EventBuffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes when maxSize (50) events accumulated', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    for (let i = 0; i < 50; i++) {
      buffer.push(makeKeystrokeEvent({ timestamp: i }));
    }

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(50);
    expect(buffer.size).toBe(0);
  });

  it('flushes after 500ms timer', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.push(makeKeystrokeEvent());
    buffer.push(makeKeystrokeEvent());
    buffer.push(makeKeystrokeEvent());

    expect(flushed).toHaveLength(0);
    expect(buffer.size).toBe(3);

    vi.advanceTimersByTime(500);

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(3);
    expect(buffer.size).toBe(0);
  });

  it('does not double-flush when timer fires after size-based flush', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    // Push 49 events (starts timer but no size flush yet)
    for (let i = 0; i < 49; i++) {
      buffer.push(makeKeystrokeEvent({ timestamp: i }));
    }
    expect(flushed).toHaveLength(0);

    // 50th event triggers size flush
    buffer.push(makeKeystrokeEvent({ timestamp: 49 }));
    expect(flushed).toHaveLength(1);

    // Timer should have been cleared, no extra flush
    vi.advanceTimersByTime(600);
    expect(flushed).toHaveLength(1);
  });

  it('manual flush() works', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.push(makeKeystrokeEvent());
    buffer.push(makeEditEvent());

    buffer.flush();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
    expect(buffer.size).toBe(0);
  });

  it('flush() on empty buffer does nothing', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.flush();

    expect(flushed).toHaveLength(0);
  });

  it('destroy() flushes remaining events', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.push(makeKeystrokeEvent());
    buffer.push(makeKeystrokeEvent());

    buffer.destroy();

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
    expect(buffer.size).toBe(0);
  });

  it('destroy() on empty buffer does not flush', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.destroy();

    expect(flushed).toHaveLength(0);
  });

  it('supports custom maxSize and maxInterval', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events), {
      maxSize: 3,
      maxInterval: 100,
    });

    buffer.push(makeKeystrokeEvent());
    buffer.push(makeKeystrokeEvent());
    expect(flushed).toHaveLength(0);

    buffer.push(makeKeystrokeEvent());
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(3);
  });

  it('timer resets after each flush', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.push(makeKeystrokeEvent());
    vi.advanceTimersByTime(500);
    expect(flushed).toHaveLength(1);

    // Push again, new timer should start
    buffer.push(makeKeystrokeEvent());
    vi.advanceTimersByTime(500);
    expect(flushed).toHaveLength(2);
    expect(flushed[1]).toHaveLength(1);
  });

  it('handles mixed event types', () => {
    const flushed: (KeystrokeEvent | EditEvent)[][] = [];
    const buffer = new EventBuffer((events) => flushed.push(events));

    buffer.push(makeKeystrokeEvent());
    buffer.push(makeEditEvent());
    buffer.push(makeKeystrokeEvent());

    buffer.flush();

    expect(flushed[0]).toHaveLength(3);
    // Verify types are preserved
    expect(flushed[0]![0]).toHaveProperty('keyCategory');
    expect(flushed[0]![1]).toHaveProperty('source');
    expect(flushed[0]![2]).toHaveProperty('keyCategory');
  });
});
