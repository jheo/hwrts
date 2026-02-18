// Privacy: only key categories, NEVER actual key values
export type KeyCategory =
  | 'letter'
  | 'number'
  | 'punct'
  | 'modifier'
  | 'navigation'
  | 'function'
  | 'other';

export interface KeystrokeEvent {
  type: 'keydown' | 'keyup';
  keyCategory: KeyCategory;
  timestamp: number; // performance.now()
  dwellTime?: number; // ms, keydown -> keyup
  flightTime?: number; // ms, keyup -> next keydown
}

// 5-second window aggregate vector
export interface KeystrokeStatVector {
  windowStart: number; // timestamp of window start
  windowEnd: number; // timestamp of window end
  keystrokeCount: number;
  avgWpm: number;
  wpmStdDev: number;
  avgDwellTime: number; // ms
  avgFlightTime: number; // ms
  flightTimeEntropy: number; // Shannon entropy H = -sum(p_i * log2(p_i))
  errorRate: number; // backspace/delete ratio
  pauseCount: number; // pauses > 2 seconds
  burstPauseRatio: number; // ratio of burst typing to pauses
}

export interface SessionData {
  sessionId: string;
  documentId: string;
  startedAt: number;
  vectors: KeystrokeStatVector[];
  totalKeystrokeCount: number;
  totalEditCount: number;
}
