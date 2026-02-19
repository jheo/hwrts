import type { KeyCategory } from '@humanwrites/core';

import type { StompClientManager } from './stomp-client.js';

export interface KeystrokeEvent {
  eventType: 'keydown' | 'keyup';
  keyCategory: KeyCategory;
  timestampMs: number;
  dwellTimeMs?: number;
  flightTimeMs?: number;
}

export class KeystrokeSender {
  private readonly client: StompClientManager;
  private readonly sessionId: string;
  private buffer: KeystrokeEvent[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly BATCH_INTERVAL_MS = 200;

  constructor(client: StompClientManager, sessionId: string) {
    this.client = client;
    this.sessionId = sessionId;
  }

  addEvents(events: KeystrokeEvent[]): void {
    this.buffer.push(...events);
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = setInterval(() => {
      this.flush();
    }, this.BATCH_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.flush();
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    if (!this.client.isConnected) return;

    const batch = this.buffer.splice(0, this.buffer.length);
    const payload = JSON.stringify({ sessionId: this.sessionId, events: batch });
    try {
      this.client.publish('/app/session.keystroke', payload);
    } catch (err) {
      // Re-buffer on failure so events are not lost
      this.buffer.unshift(...batch);
      console.error('Failed to publish keystroke batch:', err);
    }
  }

  get pendingCount(): number {
    return this.buffer.length;
  }
}
