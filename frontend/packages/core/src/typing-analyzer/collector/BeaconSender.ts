import type { EditEvent } from '../edit';
import type { KeystrokeEvent } from '../keystroke';

interface BeaconSenderOptions {
  getBufferData: () => (KeystrokeEvent | EditEvent)[];
  saveToIndexedDB: (data: (KeystrokeEvent | EditEvent)[]) => Promise<void>;
}

/**
 * Handles page unload - saves unsent buffer data to IndexedDB.
 * In Phase 2, will additionally send via navigator.sendBeacon() to server.
 *
 * Listens to:
 * - visibilitychange (tab hidden) - async save
 * - beforeunload (page closing) - sync-best-effort save
 */
export class BeaconSender {
  private getBufferData: () => (KeystrokeEvent | EditEvent)[];
  private saveToIndexedDB: (
    data: (KeystrokeEvent | EditEvent)[],
  ) => Promise<void>;
  private boundOnVisibilityChange: () => void;
  private boundOnBeforeUnload: () => void;
  private attached = false;

  constructor(options: BeaconSenderOptions) {
    this.getBufferData = options.getBufferData;
    this.saveToIndexedDB = options.saveToIndexedDB;
    this.boundOnVisibilityChange = this.onVisibilityChange.bind(this);
    this.boundOnBeforeUnload = this.onBeforeUnload.bind(this);
  }

  attach(): void {
    if (this.attached) {
      return;
    }
    this.attached = true;

    if (typeof document !== 'undefined') {
      document.addEventListener(
        'visibilitychange',
        this.boundOnVisibilityChange,
      );
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.boundOnBeforeUnload);
    }
  }

  detach(): void {
    if (!this.attached) {
      return;
    }
    this.attached = false;

    if (typeof document !== 'undefined') {
      document.removeEventListener(
        'visibilitychange',
        this.boundOnVisibilityChange,
      );
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundOnBeforeUnload);
    }
  }

  private onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      const data = this.getBufferData();
      if (data.length > 0) {
        // Fire and forget - best effort save
        void this.saveToIndexedDB(data);
      }
    }
  }

  private onBeforeUnload(): void {
    const data = this.getBufferData();
    if (data.length > 0) {
      // Best-effort sync-ish save; IndexedDB put is microtask-based
      // and may complete before the page is torn down
      void this.saveToIndexedDB(data);
    }
  }
}
