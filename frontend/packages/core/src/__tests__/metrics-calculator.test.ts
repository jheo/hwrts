import { describe, expect, it } from 'vitest';

import {
  aggregateIntoWindows,
  calculateShannonEntropy,
  calculateStatVector,
} from '../typing-analyzer/collector/metrics-calculator';
import type { KeystrokeEvent } from '../typing-analyzer/keystroke';

function makeKeydown(
  timestamp: number,
  overrides: Partial<KeystrokeEvent> = {},
): KeystrokeEvent {
  return {
    type: 'keydown',
    keyCategory: 'letter',
    timestamp,
    ...overrides,
  };
}

function makeKeyup(
  timestamp: number,
  overrides: Partial<KeystrokeEvent> = {},
): KeystrokeEvent {
  return {
    type: 'keyup',
    keyCategory: 'letter',
    timestamp,
    ...overrides,
  };
}

describe('calculateShannonEntropy', () => {
  it('returns 0 for empty array', () => {
    expect(calculateShannonEntropy([])).toBe(0);
  });

  it('returns 0 for uniform values (single bucket)', () => {
    // All values in the same bucket (0-10ms)
    const values = [5, 5, 5, 5, 5];
    expect(calculateShannonEntropy(values)).toBe(0);
  });

  it('returns maximum entropy for evenly distributed values across all buckets', () => {
    // One value per bucket (21 buckets: 0-10, 10-20, ..., 200+)
    const values: number[] = [];
    for (let i = 0; i < 21; i++) {
      values.push(i * 10 + 5); // 5, 15, 25, ..., 205
    }
    const entropy = calculateShannonEntropy(values);
    const maxEntropy = Math.log2(21);
    expect(entropy).toBeCloseTo(maxEntropy, 5);
  });

  it('returns correct entropy for two equal buckets', () => {
    // Half in bucket 0 (0-10ms), half in bucket 1 (10-20ms)
    const values = [5, 5, 15, 15];
    const entropy = calculateShannonEntropy(values);
    // H = -2 * (0.5 * log2(0.5)) = 1.0
    expect(entropy).toBeCloseTo(1.0, 5);
  });

  it('handles values above max bucket (200+)', () => {
    const values = [250, 300, 500, 1000];
    const entropy = calculateShannonEntropy(values);
    // All in the last bucket -> entropy = 0
    expect(entropy).toBe(0);
  });

  it('returns higher entropy for more varied flight times', () => {
    const uniform = [5, 5, 5, 5, 5];
    const varied = [5, 25, 55, 105, 155];

    const entropyUniform = calculateShannonEntropy(uniform);
    const entropyVaried = calculateShannonEntropy(varied);

    expect(entropyVaried).toBeGreaterThan(entropyUniform);
  });
});

describe('calculateStatVector', () => {
  it('calculates basic stats from keystroke events', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0, { dwellTime: 80, flightTime: undefined }),
      makeKeyup(80),
      makeKeydown(120, { dwellTime: 70, flightTime: 40 }),
      makeKeyup(190),
      makeKeydown(230, { dwellTime: 75, flightTime: 40 }),
      makeKeyup(305),
    ];

    const vector = calculateStatVector(events, 0, 1000);

    expect(vector.windowStart).toBe(0);
    expect(vector.windowEnd).toBe(1000);
    expect(vector.keystrokeCount).toBe(3); // 3 keydown events
    expect(vector.avgDwellTime).toBeCloseTo(75, 0); // (80+70+75)/3
    expect(vector.avgFlightTime).toBeCloseTo(40, 0); // (40+40)/2
  });

  it('calculates WPM correctly', () => {
    // 25 letter keydowns in a 5-second window = 25/5 chars/sec = 5 words/sec = 300 WPM? No:
    // WPM = (charCount / 5) * (60000 / windowDuration)
    // = (25 / 5) * (60000 / 5000) = 5 * 12 = 60 WPM
    const events: KeystrokeEvent[] = [];
    for (let i = 0; i < 25; i++) {
      events.push(makeKeydown(i * 200, { keyCategory: 'letter' }));
    }

    const vector = calculateStatVector(events, 0, 5000);
    expect(vector.avgWpm).toBeCloseTo(60, 0);
  });

  it('excludes non-letter/number keystrokes from WPM', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0, { keyCategory: 'letter' }),
      makeKeydown(100, { keyCategory: 'modifier' }),
      makeKeydown(200, { keyCategory: 'letter' }),
      makeKeydown(300, { keyCategory: 'punct' }),
      makeKeydown(400, { keyCategory: 'letter' }),
    ];

    const vector = calculateStatVector(events, 0, 1000);
    // 3 letter keydowns in 1 second = (3/5) * 60 = 36 WPM
    expect(vector.avgWpm).toBeCloseTo(36, 0);
  });

  it('calculates error rate from navigation keystrokes', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0, { keyCategory: 'letter' }),
      makeKeydown(100, { keyCategory: 'letter' }),
      makeKeydown(200, { keyCategory: 'navigation' }), // backspace/delete
      makeKeydown(300, { keyCategory: 'letter' }),
    ];

    const vector = calculateStatVector(events, 0, 1000);
    expect(vector.errorRate).toBeCloseTo(0.25, 5); // 1/4
  });

  it('counts pauses (flight time > 2000ms)', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0, { flightTime: 100 }),
      makeKeydown(100, { flightTime: 2500 }), // pause
      makeKeydown(2600, { flightTime: 50 }),
      makeKeydown(2650, { flightTime: 3000 }), // pause
    ];

    const vector = calculateStatVector(events, 0, 6000);
    expect(vector.pauseCount).toBe(2);
  });

  it('handles empty events', () => {
    const vector = calculateStatVector([], 0, 5000);

    expect(vector.keystrokeCount).toBe(0);
    expect(vector.avgWpm).toBe(0);
    expect(vector.avgDwellTime).toBe(0);
    expect(vector.avgFlightTime).toBe(0);
    expect(vector.flightTimeEntropy).toBe(0);
    expect(vector.errorRate).toBe(0);
    expect(vector.pauseCount).toBe(0);
    expect(vector.burstPauseRatio).toBe(0);
  });

  it('calculates WPM std dev across sub-windows', () => {
    // Create events with varying typing speed
    const events: KeystrokeEvent[] = [];
    // First second: fast typing (10 keystrokes)
    for (let i = 0; i < 10; i++) {
      events.push(makeKeydown(i * 100, { keyCategory: 'letter' }));
    }
    // Second and third seconds: no keystrokes (pause)
    // Fourth second: fast typing again
    for (let i = 0; i < 10; i++) {
      events.push(makeKeydown(3000 + i * 100, { keyCategory: 'letter' }));
    }

    const vector = calculateStatVector(events, 0, 5000);
    // WPM varies across 1-second sub-windows, so stdDev should be > 0
    expect(vector.wpmStdDev).toBeGreaterThan(0);
  });

  it('calculates burst-pause ratio', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0, { dwellTime: 80, flightTime: 100 }),
      makeKeydown(180, { dwellTime: 80, flightTime: 100 }),
      makeKeydown(360, { dwellTime: 80, flightTime: 3000 }), // long pause (not counted as burst)
      makeKeydown(3440, { dwellTime: 80, flightTime: 100 }),
    ];

    const vector = calculateStatVector(events, 0, 5000);
    // burstTime = flightTimes <= 2000 (100+100+100) + all dwellTimes (80*4) = 300 + 320 = 620
    // ratio = 620 / 5000 = 0.124
    expect(vector.burstPauseRatio).toBeCloseTo(0.124, 2);
  });
});

describe('aggregateIntoWindows', () => {
  it('returns empty array for no events', () => {
    expect(aggregateIntoWindows([])).toEqual([]);
  });

  it('creates a single window for events within 5 seconds', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(100),
      makeKeydown(200),
      makeKeydown(300),
    ];

    const vectors = aggregateIntoWindows(events, 5000);
    expect(vectors).toHaveLength(1);
    expect(vectors[0]!.windowStart).toBe(100);
    expect(vectors[0]!.windowEnd).toBe(5100);
    expect(vectors[0]!.keystrokeCount).toBe(3);
  });

  it('creates multiple windows for events spanning multiple intervals', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0),
      makeKeydown(1000),
      makeKeydown(6000), // second window
      makeKeydown(7000),
      makeKeydown(12000), // third window
    ];

    const vectors = aggregateIntoWindows(events, 5000);
    expect(vectors).toHaveLength(3);
    expect(vectors[0]!.keystrokeCount).toBe(2); // 0, 1000
    expect(vectors[1]!.keystrokeCount).toBe(2); // 6000, 7000
    expect(vectors[2]!.keystrokeCount).toBe(1); // 12000
  });

  it('skips empty windows', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0),
      makeKeydown(15000), // big gap, middle windows empty
    ];

    const vectors = aggregateIntoWindows(events, 5000);
    // Window 0-5000: 1 event, Window 5000-10000: empty (skipped),
    // Window 10000-15000: empty (skipped), Window 15000-20000: 1 event
    expect(vectors).toHaveLength(2);
  });

  it('sorts events before windowing', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(300),
      makeKeydown(100), // out of order
      makeKeydown(200),
    ];

    const vectors = aggregateIntoWindows(events, 5000);
    expect(vectors).toHaveLength(1);
    expect(vectors[0]!.windowStart).toBe(100);
    expect(vectors[0]!.keystrokeCount).toBe(3);
  });

  it('uses default 5000ms window size', () => {
    const events: KeystrokeEvent[] = [
      makeKeydown(0),
      makeKeydown(4999),
      makeKeydown(5000), // second window
    ];

    const vectors = aggregateIntoWindows(events);
    expect(vectors).toHaveLength(2);
    expect(vectors[0]!.keystrokeCount).toBe(2);
    expect(vectors[1]!.keystrokeCount).toBe(1);
  });
});
