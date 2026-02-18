// Storage
export { documentStore, keystrokeStore, db } from './storage';
export type { LocalDocument, StoredKeystrokeSession } from './storage';

// Typing analyzer types
export type {
  KeystrokeEvent,
  KeyCategory,
  KeystrokeStatVector,
  SessionData,
} from './typing-analyzer';
export type {
  EditEvent,
  EditType,
  EditSource,
  PasteEvent,
} from './typing-analyzer';

// Typing analyzer collector
export { EventBuffer } from './typing-analyzer/collector/EventBuffer';
export type { FlushCallback } from './typing-analyzer/collector/EventBuffer';
export { MetricsWorker } from './typing-analyzer/collector/MetricsWorker';
export { BeaconSender } from './typing-analyzer/collector/BeaconSender';
export {
  calculateShannonEntropy,
  calculateStatVector,
  aggregateIntoWindows,
} from './typing-analyzer/collector/metrics-calculator';
