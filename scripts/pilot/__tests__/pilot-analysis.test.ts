import { describe, expect, it } from 'vitest';
import { analyzePilotData } from '../pilot-analysis';

// Minimal mock vector
function makeVector(overrides: Partial<{
  windowStart: number;
  windowEnd: number;
  keystrokeCount: number;
  avgWpm: number;
  wpmStdDev: number;
  avgDwellTime: number;
  avgFlightTime: number;
  flightTimeEntropy: number;
  errorRate: number;
  pauseCount: number;
  burstPauseRatio: number;
}> = {}) {
  return {
    windowStart: 0,
    windowEnd: 5000,
    keystrokeCount: 30,
    avgWpm: 50,
    wpmStdDev: 10,
    avgDwellTime: 90,
    avgFlightTime: 130,
    flightTimeEntropy: 2.8,
    errorRate: 0.08,
    pauseCount: 1,
    burstPauseRatio: 0.75,
    ...overrides,
  };
}

function makeSession(
  participantId: string,
  scenario: 'direct' | 'ai_typing' | 'copy_paste',
  vectors: ReturnType<typeof makeVector>[],
) {
  return {
    participantId,
    scenario,
    session: {
      sessionId: `${participantId}-${scenario}`,
      documentId: `doc-${participantId}-${scenario}`,
      startedAt: Date.now(),
      vectors,
      totalKeystrokeCount: vectors.reduce((sum, v) => sum + v.keystrokeCount, 0),
      totalEditCount: 5,
    },
  };
}

describe('analyzePilotData', () => {
  it('returns empty results for empty input', () => {
    const result = analyzePilotData([]);

    expect(result.scenarioStats).toEqual({});
    expect(result.thresholds).toEqual([]);
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it('always includes 4 limitations', () => {
    const result = analyzePilotData([]);

    expect(result.limitations).toHaveLength(4);
  });

  it('calculates scenario stats for a single scenario', () => {
    const sessions = [
      makeSession('P01', 'direct', [makeVector({ avgWpm: 40 }), makeVector({ avgWpm: 60 })]),
      makeSession('P02', 'direct', [makeVector({ avgWpm: 50 })]),
    ];

    const result = analyzePilotData(sessions);

    expect(result.scenarioStats['direct']).toBeDefined();
    const stats = result.scenarioStats['direct']!;
    expect(stats.count).toBe(2);
    // mean of [40, 60, 50] = 50
    expect(stats.avgWpm.mean).toBeCloseTo(50, 1);
    expect(stats.avgWpm.median).toBeCloseTo(50, 1);
  });

  it('calculates mean and median correctly', () => {
    const sessions = [
      makeSession('P01', 'direct', [
        makeVector({ avgWpm: 20 }),
        makeVector({ avgWpm: 40 }),
        makeVector({ avgWpm: 60 }),
      ]),
    ];

    const result = analyzePilotData(sessions);
    const stats = result.scenarioStats['direct']!;

    expect(stats.avgWpm.mean).toBeCloseTo(40, 1);
    expect(stats.avgWpm.median).toBeCloseTo(40, 1);
  });

  it('groups sessions by scenario correctly', () => {
    const sessions = [
      makeSession('P01', 'direct', [makeVector({ avgWpm: 50 })]),
      makeSession('P01', 'copy_paste', [makeVector({ avgWpm: 0, keystrokeCount: 0 })]),
      makeSession('P01', 'ai_typing', [makeVector({ avgWpm: 55 })]),
    ];

    const result = analyzePilotData(sessions);

    expect(Object.keys(result.scenarioStats)).toHaveLength(3);
    expect(result.scenarioStats['direct']).toBeDefined();
    expect(result.scenarioStats['copy_paste']).toBeDefined();
    expect(result.scenarioStats['ai_typing']).toBeDefined();
  });

  it('generates threshold recommendations when both direct and copy_paste are present', () => {
    const sessions = [
      makeSession('P01', 'direct', [
        makeVector({ avgWpm: 50, flightTimeEntropy: 2.8, errorRate: 0.08, burstPauseRatio: 0.75 }),
      ]),
      makeSession('P01', 'copy_paste', [
        makeVector({ avgWpm: 0, flightTimeEntropy: 0, errorRate: 0, burstPauseRatio: 0, keystrokeCount: 0 }),
      ]),
    ];

    const result = analyzePilotData(sessions);

    expect(result.thresholds.length).toBeGreaterThan(0);
    // Thresholds are sorted by separability descending
    for (let i = 0; i < result.thresholds.length - 1; i++) {
      expect(result.thresholds[i]!.separability).toBeGreaterThanOrEqual(
        result.thresholds[i + 1]!.separability,
      );
    }
  });

  it('does not generate thresholds when only one scenario is present', () => {
    const sessions = [
      makeSession('P01', 'direct', [makeVector()]),
    ];

    const result = analyzePilotData(sessions);

    expect(result.thresholds).toEqual([]);
  });

  it('threshold value is midpoint between direct and copy_paste means', () => {
    const directWpm = 60;
    const copyWpm = 0;

    const sessions = [
      makeSession('P01', 'direct', [makeVector({ avgWpm: directWpm })]),
      makeSession('P01', 'copy_paste', [makeVector({ avgWpm: copyWpm, keystrokeCount: 0 })]),
    ];

    const result = analyzePilotData(sessions);
    const wpmThreshold = result.thresholds.find(t => t.metric === 'avgWpm');

    expect(wpmThreshold).toBeDefined();
    expect(wpmThreshold!.threshold).toBeCloseTo((directWpm + copyWpm) / 2, 1);
  });

  it('separability is between 0 and 1', () => {
    const sessions = [
      makeSession('P01', 'direct', [
        makeVector({ avgWpm: 50, flightTimeEntropy: 2.5, errorRate: 0.08, burstPauseRatio: 0.75 }),
        makeSession('P02', 'direct', [makeVector({ avgWpm: 60 })]),
      ] as ReturnType<typeof makeVector>[]),
      makeSession('P01', 'copy_paste', [
        makeVector({ avgWpm: 0, flightTimeEntropy: 0, errorRate: 0, burstPauseRatio: 0, keystrokeCount: 0 }),
      ]),
    ];

    const result = analyzePilotData(sessions);

    for (const t of result.thresholds) {
      expect(t.separability).toBeGreaterThanOrEqual(0);
      expect(t.separability).toBeLessThanOrEqual(1);
    }
  });

  it('handles sessions with no vectors gracefully', () => {
    const sessions = [
      makeSession('P01', 'direct', []),
      makeSession('P01', 'copy_paste', []),
    ];

    const result = analyzePilotData(sessions);

    expect(result.scenarioStats['direct']!.avgWpm.mean).toBe(0);
    expect(result.scenarioStats['copy_paste']!.avgWpm.mean).toBe(0);
    // No separability when both are 0 — thresholds still generated but separability = 0
    for (const t of result.thresholds) {
      expect(t.separability).toBe(0);
    }
  });

  it('each threshold recommendation has required fields', () => {
    const sessions = [
      makeSession('P01', 'direct', [makeVector()]),
      makeSession('P01', 'copy_paste', [makeVector({ avgWpm: 0, keystrokeCount: 0 })]),
    ];

    const result = analyzePilotData(sessions);

    for (const t of result.thresholds) {
      expect(typeof t.metric).toBe('string');
      expect(typeof t.threshold).toBe('number');
      expect(typeof t.description).toBe('string');
      expect(typeof t.separability).toBe('number');
    }
  });
});
