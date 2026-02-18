import type { EditEvent } from '../edit';
import type { KeystrokeEvent } from '../keystroke';

export type FlushCallback = (events: (KeystrokeEvent | EditEvent)[]) => void;

/**
 * Buffer that accumulates events and flushes when:
 * - 50 events accumulated OR
 * - 500ms elapsed since last flush
 *
 * Flush sends events to a callback (Worker postMessage in production).
 */
export class EventBuffer {
  private buffer: (KeystrokeEvent | EditEvent)[] = [];
  private flushCallback: FlushCallback;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly maxSize: number;
  private readonly maxInterval: number;

  constructor(
    flushCallback: FlushCallback,
    options?: { maxSize?: number; maxInterval?: number },
  ) {
    this.flushCallback = flushCallback;
    this.maxSize = options?.maxSize ?? 50;
    this.maxInterval = options?.maxInterval ?? 500;
  }

  push(event: KeystrokeEvent | EditEvent): void {
    this.buffer.push(event);
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.maxInterval);
    }
  }

  flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length > 0) {
      const events = [...this.buffer];
      this.buffer = [];
      this.flushCallback(events);
    }
  }

  get size(): number {
    return this.buffer.length;
  }

  destroy(): void {
    this.flush();
  }
}
