import type { KeystrokeEvent as CoreKeystrokeEvent } from '@humanwrites/core';
import type { KeyCategory } from '@humanwrites/core';

import type { StompClientManager } from './stomp-client.js';

/** Wire-format event matching backend `KeystrokeEventDto` field names. */
export interface WireKeystrokeEvent {
  eventType: 'keydown' | 'keyup';
  keyCategory: KeyCategory;
  timestampMs: number;
  dwellTimeMs?: number;
  flightTimeMs?: number;
}

/**
 * Convert a core `KeystrokeEvent` to the backend wire format.
 * Core uses semantic names (`type`, `timestamp`), backend expects
 * explicit names with unit suffixes (`eventType`, `timestampMs`).
 */
export function toWireFormat(event: CoreKeystrokeEvent): WireKeystrokeEvent {
  return {
    eventType: event.type,
    keyCategory: event.keyCategory,
    timestampMs: event.timestamp,
    dwellTimeMs: event.dwellTime,
    flightTimeMs: event.flightTime,
  };
}

export class KeystrokeSender {
  private readonly client: StompClientManager;
  private readonly sessionId: string;
  private buffer: WireKeystrokeEvent[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly BATCH_INTERVAL_MS = 200;

  constructor(client: StompClientManager, sessionId: string) {
    this.client = client;
    this.sessionId = sessionId;
  }

  /** Accept core KeystrokeEvents (auto-converts) or pre-mapped WireKeystrokeEvents. */
  addEvents(events: CoreKeystrokeEvent[]): void {
    this.buffer.push(...events.map(toWireFormat));
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
