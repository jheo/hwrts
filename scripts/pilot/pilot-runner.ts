#!/usr/bin/env tsx
/**
 * HumanWrites Pilot Runner
 *
 * Generates sample pilot data structure for testing the analysis pipeline.
 * In production, data comes from actual user sessions via the editor.
 *
 * Usage: npx tsx scripts/pilot/pilot-runner.ts
 */

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

function generateSampleVector(
  scenario: 'direct' | 'ai_typing' | 'copy_paste',
  windowStart: number,
): KeystrokeStatVector {
  const windowEnd = windowStart + 5000;

  switch (scenario) {
    case 'direct':
      return {
        windowStart,
        windowEnd,
        keystrokeCount: 30 + Math.floor(Math.random() * 20),
        avgWpm: 40 + Math.random() * 30,
        wpmStdDev: 8 + Math.random() * 10,
        avgDwellTime: 80 + Math.random() * 40,
        avgFlightTime: 120 + Math.random() * 80,
        flightTimeEntropy: 2.5 + Math.random() * 1.5,
        errorRate: 0.05 + Math.random() * 0.1,
        pauseCount: Math.floor(Math.random() * 3),
        burstPauseRatio: 0.7 + Math.random() * 0.2,
      };
    case 'ai_typing':
      return {
        windowStart,
        windowEnd,
        keystrokeCount: 35 + Math.floor(Math.random() * 15),
        avgWpm: 45 + Math.random() * 25,
        wpmStdDev: 5 + Math.random() * 5,
        avgDwellTime: 70 + Math.random() * 30,
        avgFlightTime: 100 + Math.random() * 60,
        flightTimeEntropy: 2.0 + Math.random() * 1.0,
        errorRate: 0.02 + Math.random() * 0.05,
        pauseCount: Math.floor(Math.random() * 2),
        burstPauseRatio: 0.8 + Math.random() * 0.15,
      };
    case 'copy_paste':
      return {
        windowStart,
        windowEnd,
        keystrokeCount: Math.floor(Math.random() * 5),
        avgWpm: 0,
        wpmStdDev: 0,
        avgDwellTime: 0,
        avgFlightTime: 0,
        flightTimeEntropy: 0,
        errorRate: 0,
        pauseCount: 0,
        burstPauseRatio: 0,
      };
  }
}

function generatePilotData(): Array<{
  participantId: string;
  scenario: 'direct' | 'ai_typing' | 'copy_paste';
  session: {
    sessionId: string;
    documentId: string;
    startedAt: number;
    vectors: KeystrokeStatVector[];
    totalKeystrokeCount: number;
    totalEditCount: number;
  };
}> {
  const scenarios: Array<'direct' | 'ai_typing' | 'copy_paste'> = [
    'direct',
    'ai_typing',
    'copy_paste',
  ];
  const participants = 10;
  const allSessions = [];

  for (let p = 1; p <= participants; p++) {
    const participantId = `P${String(p).padStart(2, '0')}`;

    for (const scenario of scenarios) {
      const sessionId = `${participantId}-${scenario}`;
      const startedAt = Date.now();
      // 1 vector for copy_paste (instant), 12 vectors (~60s) for typing scenarios
      const vectorCount = scenario === 'copy_paste' ? 1 : 12;

      const vectors: KeystrokeStatVector[] = [];
      for (let i = 0; i < vectorCount; i++) {
        vectors.push(generateSampleVector(scenario, startedAt + i * 5000));
      }

      allSessions.push({
        participantId,
        scenario,
        session: {
          sessionId,
          documentId: `doc-${sessionId}`,
          startedAt,
          vectors,
          totalKeystrokeCount: vectors.reduce((sum, v) => sum + v.keystrokeCount, 0),
          totalEditCount: Math.floor(Math.random() * 20),
        },
      });
    }
  }

  return allSessions;
}

async function main(): Promise<void> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const url = await import('node:url');

  const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
  const dataDir = path.resolve(__dirname, 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const data = generatePilotData();
  const outputPath = path.join(dataDir, 'sample-pilot-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

  console.log(`Sample pilot data generated: ${outputPath}`);
  console.log(`Total sessions: ${data.length}`);
  console.log(`Participants: 10, Scenarios: 3`);
  console.log('\nTo analyze:');
  console.log(`  npx tsx scripts/pilot/pilot-analysis.ts ${dataDir}`);
}

main().catch(console.error);
