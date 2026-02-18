// Web Worker script for offloading metrics calculation from the main thread.
// Receives keystroke events, calculates stat vectors, posts results back.

import type { KeystrokeEvent, KeystrokeStatVector } from '../keystroke';

import { aggregateIntoWindows } from './metrics-calculator';

interface WorkerMessage {
  type: 'process';
  events: KeystrokeEvent[];
  windowSize?: number;
}

interface WorkerResponse {
  type: 'vectors';
  vectors: KeystrokeStatVector[];
}

// Use self.onmessage directly — avoid DedicatedWorkerGlobalScope
// which requires the 'webworker' lib that conflicts with DOM types.
self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { type, events, windowSize } = e.data;

  if (type === 'process') {
    const vectors = aggregateIntoWindows(events, windowSize ?? 5000);
    const response: WorkerResponse = { type: 'vectors', vectors };
    self.postMessage(response);
  }
};
