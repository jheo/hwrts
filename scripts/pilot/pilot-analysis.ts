#!/usr/bin/env tsx
/**
 * HumanWrites Pilot Analysis Script
 *
 * Analyzes pilot testing data to calibrate Layer 1 thresholds.
 * Usage: npx tsx scripts/pilot/pilot-analysis.ts <data-directory>
 */

// Type definitions (local, matches core types)
interface KeystrokeStatVector {
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
}

interface SessionData {
  sessionId: string;
  documentId: string;
  startedAt: number;
  vectors: KeystrokeStatVector[];
  totalKeystrokeCount: number;
  totalEditCount: number;
}

interface PilotSession {
  participantId: string;
  scenario: 'direct' | 'ai_typing' | 'copy_paste';
  session: SessionData;
}

// Statistical utilities
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// Scenario statistics
interface MetricStats {
  mean: number;
  stdDev: number;
  median: number;
}

interface ScenarioStats {
  scenario: string;
  count: number;
  avgWpm: MetricStats;
  avgDwellTime: MetricStats;
  avgFlightTime: MetricStats;
  flightTimeEntropy: MetricStats;
  errorRate: MetricStats;
  burstPauseRatio: MetricStats;
}

function calculateScenarioStats(sessions: PilotSession[]): ScenarioStats {
  // Flatten all vectors from all sessions
  const allVectors = sessions.flatMap(s => s.session.vectors);

  const wpmValues = allVectors.map(v => v.avgWpm);
  const dwellValues = allVectors.map(v => v.avgDwellTime);
  const flightValues = allVectors.map(v => v.avgFlightTime);
  const entropyValues = allVectors.map(v => v.flightTimeEntropy);
  const errorValues = allVectors.map(v => v.errorRate);
  const burstValues = allVectors.map(v => v.burstPauseRatio);

  return {
    scenario: sessions[0]?.scenario ?? 'unknown',
    count: sessions.length,
    avgWpm: { mean: mean(wpmValues), stdDev: stdDev(wpmValues), median: median(wpmValues) },
    avgDwellTime: { mean: mean(dwellValues), stdDev: stdDev(dwellValues), median: median(dwellValues) },
    avgFlightTime: { mean: mean(flightValues), stdDev: stdDev(flightValues), median: median(flightValues) },
    flightTimeEntropy: { mean: mean(entropyValues), stdDev: stdDev(entropyValues), median: median(entropyValues) },
    errorRate: { mean: mean(errorValues), stdDev: stdDev(errorValues), median: median(errorValues) },
    burstPauseRatio: { mean: mean(burstValues), stdDev: stdDev(burstValues), median: median(burstValues) },
  };
}

// Threshold recommendation
interface ThresholdRecommendation {
  metric: string;
  threshold: number;
  description: string;
  separability: number; // 0-1, how well this metric separates scenarios
}

function recommendThresholds(
  directStats: ScenarioStats,
  copyPasteStats: ScenarioStats,
): ThresholdRecommendation[] {
  const recommendations: ThresholdRecommendation[] = [];

  // For each metric, find the threshold that best separates direct from copy-paste
  const metrics: Array<{ name: keyof Omit<ScenarioStats, 'scenario' | 'count'>; desc: string }> = [
    { name: 'avgWpm', desc: 'Average typing speed (WPM)' },
    { name: 'flightTimeEntropy', desc: 'Flight time entropy (naturalness)' },
    { name: 'errorRate', desc: 'Error correction rate' },
    { name: 'burstPauseRatio', desc: 'Burst/pause ratio' },
  ];

  for (const metric of metrics) {
    const directValue = directStats[metric.name].mean;
    const copyValue = copyPasteStats[metric.name].mean;
    const directStd = directStats[metric.name].stdDev;
    const copyStd = copyPasteStats[metric.name].stdDev;

    // Separability: Cohen's d
    const pooledStd = Math.sqrt((directStd ** 2 + copyStd ** 2) / 2);
    const cohensD = pooledStd > 0 ? Math.abs(directValue - copyValue) / pooledStd : 0;
    const separability = Math.min(cohensD / 3, 1); // Normalize to 0-1

    // Threshold: midpoint between means
    const threshold = (directValue + copyValue) / 2;

    recommendations.push({
      metric: metric.name,
      threshold,
      description: metric.desc,
      separability,
    });
  }

  return recommendations.sort((a, b) => b.separability - a.separability);
}

// Main analysis function (exported for testing)
export function analyzePilotData(sessions: PilotSession[]): {
  scenarioStats: Record<string, ScenarioStats>;
  thresholds: ThresholdRecommendation[];
  limitations: string[];
} {
  const byScenario: Record<string, PilotSession[]> = {};
  for (const session of sessions) {
    if (!byScenario[session.scenario]) {
      byScenario[session.scenario] = [];
    }
    byScenario[session.scenario]!.push(session);
  }

  const scenarioStats: Record<string, ScenarioStats> = {};
  for (const [scenario, scenarioSessions] of Object.entries(byScenario)) {
    scenarioStats[scenario] = calculateScenarioStats(scenarioSessions);
  }

  const directStats = scenarioStats['direct'];
  const copyPasteStats = scenarioStats['copy_paste'];

  const thresholds =
    directStats && copyPasteStats ? recommendThresholds(directStats, copyPasteStats) : [];

  const limitations = [
    'Layer 1 (키스트로크 다이나믹스)만으로는 시나리오 (b) "AI 보고 타이핑"과 시나리오 (a) "직접 작성"을 구분하기 어려움',
    '파일럿 샘플 크기(10명)가 작아 일반화에 한계 존재',
    '키보드 종류(기계식/멤브레인/노트북)에 따른 편차 미보정',
    'Post-MVP Layer 2(편집 패턴) 및 Layer 3(콘텐츠 분석)으로 보완 필요',
  ];

  return { scenarioStats, thresholds, limitations };
}

// CLI entry point
async function main(): Promise<void> {
  const dataDir = process.argv[2];

  if (!dataDir) {
    console.error('Usage: npx tsx scripts/pilot/pilot-analysis.ts <data-directory>');
    console.error('  <data-directory>: Directory containing pilot session JSON files');
    process.exit(1);
  }

  const fs = await import('node:fs');
  const path = await import('node:path');

  const resolvedDir = path.resolve(dataDir);

  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(resolvedDir).filter((f: string) => f.endsWith('.json'));

  if (files.length === 0) {
    console.log('No JSON files found in the data directory.');
    console.log('Run pilot testing first and export session data.');
    console.log('See pilot-scenarios.md for instructions.');
    process.exit(0);
  }

  const sessions: PilotSession[] = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(resolvedDir, file), 'utf-8');
      const data = JSON.parse(content) as PilotSession | PilotSession[];
      if (Array.isArray(data)) {
        sessions.push(...data);
      } else {
        sessions.push(data);
      }
    } catch (err) {
      console.warn(`Skipping invalid file: ${file}`, err);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('HumanWrites 파일럿 분석 결과');
  console.log(`${'='.repeat(60)}\n`);
  console.log(`총 세션 수: ${sessions.length}`);

  const result = analyzePilotData(sessions);

  // Print scenario stats
  for (const [scenario, stats] of Object.entries(result.scenarioStats)) {
    console.log(`\n--- ${scenario} (n=${stats.count}) ---`);
    console.log(`  WPM:            mean=${stats.avgWpm.mean.toFixed(1)}, std=${stats.avgWpm.stdDev.toFixed(1)}, median=${stats.avgWpm.median.toFixed(1)}`);
    console.log(`  Dwell Time:     mean=${stats.avgDwellTime.mean.toFixed(1)}ms`);
    console.log(`  Flight Time:    mean=${stats.avgFlightTime.mean.toFixed(1)}ms`);
    console.log(`  Entropy:        mean=${stats.flightTimeEntropy.mean.toFixed(3)}`);
    console.log(`  Error Rate:     mean=${stats.errorRate.mean.toFixed(3)}`);
    console.log(`  Burst/Pause:    mean=${stats.burstPauseRatio.mean.toFixed(3)}`);
  }

  // Print thresholds
  if (result.thresholds.length > 0) {
    console.log('\n--- 권장 임계값 ---');
    for (const t of result.thresholds) {
      console.log(
        `  ${t.metric}: ${t.threshold.toFixed(3)} (separability: ${(t.separability * 100).toFixed(1)}%) - ${t.description}`,
      );
    }
  }

  // Print limitations
  console.log('\n--- 한계 ---');
  for (const l of result.limitations) {
    console.log(`  - ${l}`);
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

// Only run CLI when executed directly (not when imported by tests)
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));

if (isMain) {
  main().catch(console.error);
}
