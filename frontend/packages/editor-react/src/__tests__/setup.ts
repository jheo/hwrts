import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// jsdom polyfills — requestIdleCallback / cancelIdleCallback
// ---------------------------------------------------------------------------
// jsdom does not implement these APIs. Provide minimal polyfills so that
// component cleanup code (useEffect return) can call cancelIdleCallback
// without throwing after vi.unstubAllGlobals() removes per-test stubs.

if (typeof globalThis.requestIdleCallback === 'undefined') {
  let _idleId = 0;
  globalThis.requestIdleCallback = ((cb: IdleRequestCallback) => {
    const id = ++_idleId;
    const timeout = setTimeout(() => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
    }, 0);
    // Store timeout so cancel can clear it
    (globalThis.requestIdleCallback as unknown as Record<string, unknown>)[`_t${String(id)}`] = timeout;
    return id;
  }) as typeof requestIdleCallback;

  globalThis.cancelIdleCallback = ((id: number) => {
    const key = `_t${String(id)}`;
    const timeout = (globalThis.requestIdleCallback as unknown as Record<string, unknown>)[key] as
      | ReturnType<typeof setTimeout>
      | undefined;
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }) as typeof cancelIdleCallback;
}
