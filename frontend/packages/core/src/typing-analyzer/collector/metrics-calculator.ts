import type { KeystrokeEvent, KeystrokeStatVector } from '../keystroke';

const BUCKET_SIZE_MS = 10;
const MAX_BUCKET_MS = 200;
const PAUSE_THRESHOLD_MS = 2000;
const STANDARD_WORD_LENGTH = 5;

/**
 * Shannon entropy: H = -sum(p_i * log2(p_i))
 * Uses 10ms buckets (0-10, 10-20, ..., 200+) for flight time distribution.
 */
export function calculateShannonEntropy(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const bucketCount = MAX_BUCKET_MS / BUCKET_SIZE_MS + 1; // 21 buckets (0-200+ in 10ms steps)
  const buckets = new Array<number>(bucketCount).fill(0);

  for (const v of values) {
    if (v < 0) continue;  // Skip negative values
    const idx = Math.min(Math.floor(v / BUCKET_SIZE_MS), bucketCount - 1);
    buckets[idx]!++;
  }

  const total = values.length;
  let entropy = 0;

  for (const count of buckets) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

/**
 * Calculate WPM from keystroke events in a time window.
 * Count 'letter' and 'number' keydown events, divide by standard word length (5),
 * scale to per-minute rate.
 */
function calculateWpm(
  events: KeystrokeEvent[],
  windowDurationMs: number,
): number {
  if (windowDurationMs <= 0) {
    return 0;
  }

  const charKeystrokes = events.filter(
    (e) =>
      e.type === 'keydown' &&
      (e.keyCategory === 'letter' || e.keyCategory === 'number'),
  );

  const words = charKeystrokes.length / STANDARD_WORD_LENGTH;
  return words * (60000 / windowDurationMs);
}

/**
 * Calculate standard deviation of a number array.
 */
function stdDev(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance =
    squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Calculate a KeystrokeStatVector from raw events within a time window.
 */
export function calculateStatVector(
  events: KeystrokeEvent[],
  windowStart: number,
  windowEnd: number,
): KeystrokeStatVector {
  const windowDuration = windowEnd - windowStart;
  const keydownEvents = events.filter((e) => e.type === 'keydown');

  // WPM calculation
  const avgWpm = calculateWpm(events, windowDuration);

  // WPM std dev: split window into 1-second sub-windows
  const subWindowSize = 1000;
  const subWpms: number[] = [];
  for (let t = windowStart; t < windowEnd; t += subWindowSize) {
    const subEnd = Math.min(t + subWindowSize, windowEnd);
    const subEvents = events.filter(
      (e) => e.timestamp >= t && e.timestamp < subEnd,
    );
    const subDuration = subEnd - t;
    if (subDuration > 0) {
      subWpms.push(calculateWpm(subEvents, subDuration));
    }
  }
  const wpmStdDev = stdDev(subWpms);

  // Dwell times
  const dwellTimes = events
    .filter((e) => e.dwellTime != null)
    .map((e) => e.dwellTime!);
  const avgDwellTime =
    dwellTimes.length > 0
      ? dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length
      : 0;

  // Flight times
  const flightTimes = events
    .filter((e) => e.flightTime != null)
    .map((e) => e.flightTime!);
  const avgFlightTime =
    flightTimes.length > 0
      ? flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length
      : 0;

  // Shannon entropy of flight times
  const flightTimeEntropy = calculateShannonEntropy(flightTimes);

  // Error rate: delete/navigation keydown events / total keydown events
  const deleteCount = keydownEvents.filter(
    (e) => e.keyCategory === 'navigation',
  ).length;
  const errorRate =
    keydownEvents.length > 0 ? deleteCount / keydownEvents.length : 0;

  // Pause count: flight times > 2 seconds
  const pauseCount = flightTimes.filter(
    (ft) => ft > PAUSE_THRESHOLD_MS,
  ).length;

  // Burst/pause ratio: time in bursts (< 2s between keystrokes) / total time
  let burstTime = 0;
  for (const ft of flightTimes) {
    if (ft <= PAUSE_THRESHOLD_MS) {
      burstTime += ft;
    }
  }
  // Add dwell times to burst time for a more complete picture
  for (const dt of dwellTimes) {
    burstTime += dt;
  }
  const burstPauseRatio = windowDuration > 0 ? burstTime / windowDuration : 0;

  return {
    windowStart,
    windowEnd,
    keystrokeCount: keydownEvents.length,
    avgWpm,
    wpmStdDev,
    avgDwellTime,
    avgFlightTime,
    flightTimeEntropy,
    errorRate,
    pauseCount,
    burstPauseRatio,
  };
}

/**
 * Split events into fixed-size windows and calculate stat vectors.
 * Default window size: 5000ms (5 seconds).
 */
export function aggregateIntoWindows(
  events: KeystrokeEvent[],
  windowSize: number = 5000,
): KeystrokeStatVector[] {
  if (events.length === 0) {
    return [];
  }

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const firstTimestamp = sorted[0]!.timestamp;
  const lastTimestamp = sorted[sorted.length - 1]!.timestamp;

  const vectors: KeystrokeStatVector[] = [];

  for (let start = firstTimestamp; start <= lastTimestamp; start += windowSize) {
    const end = start + windowSize;
    const windowEvents = sorted.filter(
      (e) => e.timestamp >= start && e.timestamp < end,
    );

    if (windowEvents.length > 0) {
      vectors.push(calculateStatVector(windowEvents, start, end));
    }
  }

  return vectors;
}
