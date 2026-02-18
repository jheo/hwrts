import type { EditEvent } from '../edit';
import type { KeystrokeEvent, KeystrokeStatVector } from '../keystroke';

import { aggregateIntoWindows } from './metrics-calculator';

/**
 * Main-thread manager for the metrics Web Worker.
 * Falls back to requestIdleCallback when Workers are unavailable.
 */
export class MetricsWorker {
  private worker: Worker | null = null;
  private onVector: (vector: KeystrokeStatVector) => void;
  private fallbackMode = false;

  constructor(onVector: (vector: KeystrokeStatVector) => void) {
    this.onVector = onVector;
    this.initWorker();
  }

  private initWorker(): void {
    try {
      // Worker creation - bundler will handle the URL transform
      this.worker = new Worker(
        new URL('./metrics-worker.worker.ts', import.meta.url),
        { type: 'module' },
      );
      this.worker.onmessage = (
        e: MessageEvent<{ type: string; vectors: KeystrokeStatVector[] }>,
      ) => {
        if (e.data.type === 'vectors') {
          for (const v of e.data.vectors) {
            this.onVector(v);
          }
        }
      };
      this.worker.onerror = () => {
        // If worker fails at runtime, switch to fallback
        this.fallbackMode = true;
        this.worker?.terminate();
        this.worker = null;
      };
    } catch {
      this.fallbackMode = true;
    }
  }

  processEvents(events: (KeystrokeEvent | EditEvent)[]): void {
    const keystrokeEvents = events.filter(
      (e): e is KeystrokeEvent => 'keyCategory' in e,
    );

    if (keystrokeEvents.length === 0) {
      return;
    }

    if (this.worker && !this.fallbackMode) {
      this.worker.postMessage({ type: 'process', events: keystrokeEvents });
    } else {
      // Fallback: use requestIdleCallback or setTimeout
      const compute = () => {
        const vectors = aggregateIntoWindows(keystrokeEvents, 5000);
        for (const v of vectors) {
          this.onVector(v);
        }
      };

      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(compute);
      } else {
        setTimeout(compute, 0);
      }
    }
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
