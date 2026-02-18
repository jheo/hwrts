import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BeaconSender } from '../typing-analyzer/collector/BeaconSender';
import type { KeystrokeEvent } from '../typing-analyzer/keystroke';

function makeKeystrokeEvent(timestamp: number): KeystrokeEvent {
  return {
    type: 'keydown',
    keyCategory: 'letter',
    timestamp,
  };
}

// BeaconSender uses typeof document/window checks, so we need to provide them
// in the node environment. We mock them as minimal event target stubs.
describe('BeaconSender', () => {
  let docListeners: Map<string, (...args: unknown[]) => void>;
  let winListeners: Map<string, (...args: unknown[]) => void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalDocument: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalWindow: any;

  beforeEach(() => {
    docListeners = new Map();
    winListeners = new Map();

    // Save originals
    originalDocument = globalThis.document;
    originalWindow = globalThis.window;

    // Stub document with minimal event target interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = {
      visibilityState: 'visible',
      addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        docListeners.set(event, handler);
      }),
      removeEventListener: vi.fn((event: string, _handler: (...args: unknown[]) => void) => {
        docListeners.delete(event);
      }),
    };

    // Stub window with minimal event target interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = {
      addEventListener: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        winListeners.set(event, handler);
      }),
      removeEventListener: vi.fn((event: string, _handler: (...args: unknown[]) => void) => {
        winListeners.delete(event);
      }),
    };
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).document = originalDocument;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('attaches visibilitychange and beforeunload listeners', () => {
    const sender = new BeaconSender({
      getBufferData: () => [],
      saveToIndexedDB: vi.fn().mockResolvedValue(undefined),
    });

    sender.attach();

    expect(document.addEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    expect(window.addEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
  });

  it('detaches listeners on detach()', () => {
    const sender = new BeaconSender({
      getBufferData: () => [],
      saveToIndexedDB: vi.fn().mockResolvedValue(undefined),
    });

    sender.attach();
    sender.detach();

    expect(document.removeEventListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    );
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
  });

  it('does not double-attach', () => {
    const sender = new BeaconSender({
      getBufferData: () => [],
      saveToIndexedDB: vi.fn().mockResolvedValue(undefined),
    });

    sender.attach();
    sender.attach(); // second call should be no-op

    expect(document.addEventListener).toHaveBeenCalledTimes(1);
    expect(window.addEventListener).toHaveBeenCalledTimes(1);
  });

  it('does not double-detach', () => {
    const sender = new BeaconSender({
      getBufferData: () => [],
      saveToIndexedDB: vi.fn().mockResolvedValue(undefined),
    });

    sender.attach();
    sender.detach();
    sender.detach(); // second call should be no-op

    expect(document.removeEventListener).toHaveBeenCalledTimes(1);
    expect(window.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('saves buffer data on visibilitychange to hidden', () => {
    const bufferData = [makeKeystrokeEvent(100), makeKeystrokeEvent(200)];
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const sender = new BeaconSender({
      getBufferData: () => bufferData,
      saveToIndexedDB: saveFn,
    });

    sender.attach();

    // Simulate tab going hidden
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).visibilityState = 'hidden';

    const handler = docListeners.get('visibilitychange');
    expect(handler).toBeDefined();
    handler!();

    expect(saveFn).toHaveBeenCalledWith(bufferData);

    // Restore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).visibilityState = 'visible';
  });

  it('does not save on visibilitychange if buffer is empty', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const sender = new BeaconSender({
      getBufferData: () => [],
      saveToIndexedDB: saveFn,
    });

    sender.attach();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).visibilityState = 'hidden';

    const handler = docListeners.get('visibilitychange');
    handler!();
    expect(saveFn).not.toHaveBeenCalled();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document as any).visibilityState = 'visible';
  });

  it('saves buffer data on beforeunload', () => {
    const bufferData = [makeKeystrokeEvent(100)];
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const sender = new BeaconSender({
      getBufferData: () => bufferData,
      saveToIndexedDB: saveFn,
    });

    sender.attach();

    const handler = winListeners.get('beforeunload');
    expect(handler).toBeDefined();
    handler!();

    expect(saveFn).toHaveBeenCalledWith(bufferData);
  });

  it('does not save on beforeunload if buffer is empty', () => {
    const saveFn = vi.fn().mockResolvedValue(undefined);
    const sender = new BeaconSender({
      getBufferData: () => [],
      saveToIndexedDB: saveFn,
    });

    sender.attach();

    const handler = winListeners.get('beforeunload');
    handler!();
    expect(saveFn).not.toHaveBeenCalled();
  });
});
