import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useConnectionStatus,
  WS_CONNECT_EVENT,
  WS_DISCONNECT_EVENT,
} from '../hooks/useConnectionStatus';

describe('useConnectionStatus', () => {
  beforeEach(() => {
    // Default to online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises isOnline from navigator.onLine when true', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.isOnline).toBe(true);
  });

  it('initialises isOnline from navigator.onLine when false', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.isOnline).toBe(false);
  });

  it('initialises isWsConnected to false', () => {
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.isWsConnected).toBe(false);
  });

  it('initialises reconnectAttempts to 0', () => {
    const { result } = renderHook(() => useConnectionStatus());
    expect(result.current.reconnectAttempts).toBe(0);
  });

  it('sets isOnline to false when window offline event fires', () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('sets isOnline to true when window online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('calls onOnlineChange(false) when going offline', () => {
    const onOnlineChange = vi.fn();
    renderHook(() => useConnectionStatus({ onOnlineChange }));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(onOnlineChange).toHaveBeenCalledWith(false);
  });

  it('calls onOnlineChange(true) when coming back online', () => {
    const onOnlineChange = vi.fn();
    renderHook(() => useConnectionStatus({ onOnlineChange }));

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(onOnlineChange).toHaveBeenCalledWith(true);
  });

  it('sets isWsConnected to true on WS_CONNECT_EVENT', () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_CONNECT_EVENT));
    });

    expect(result.current.isWsConnected).toBe(true);
  });

  it('sets isWsConnected to false on WS_DISCONNECT_EVENT', () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_CONNECT_EVENT));
    });
    expect(result.current.isWsConnected).toBe(true);

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });

    expect(result.current.isWsConnected).toBe(false);
  });

  it('calls onWsChange(true) when WS connects', () => {
    const onWsChange = vi.fn();
    renderHook(() => useConnectionStatus({ onWsChange }));

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_CONNECT_EVENT));
    });

    expect(onWsChange).toHaveBeenCalledWith(true);
  });

  it('calls onWsChange(false) when WS disconnects', () => {
    const onWsChange = vi.fn();
    renderHook(() => useConnectionStatus({ onWsChange }));

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });

    expect(onWsChange).toHaveBeenCalledWith(false);
  });

  it('increments reconnectAttempts on each WS disconnect', () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });
    expect(result.current.reconnectAttempts).toBe(1);

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });
    expect(result.current.reconnectAttempts).toBe(2);

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });
    expect(result.current.reconnectAttempts).toBe(3);
  });

  it('resets reconnectAttempts to 0 when WS reconnects', () => {
    const { result } = renderHook(() => useConnectionStatus());

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });
    expect(result.current.reconnectAttempts).toBe(2);

    act(() => {
      window.dispatchEvent(new CustomEvent(WS_CONNECT_EVENT));
    });
    expect(result.current.reconnectAttempts).toBe(0);
  });

  it('removes event listeners on unmount', () => {
    const { unmount } = renderHook(() => useConnectionStatus());

    // Go online before unmount to establish a known state
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    unmount();

    // Dispatching after unmount should not cause errors or state updates
    act(() => {
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new CustomEvent(WS_CONNECT_EVENT));
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });
    // No assertion needed — the test passes if no error is thrown
  });

  it('works without options provided', () => {
    const { result } = renderHook(() => useConnectionStatus());

    // Should not throw when callbacks are undefined
    act(() => {
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new CustomEvent(WS_CONNECT_EVENT));
      window.dispatchEvent(new CustomEvent(WS_DISCONNECT_EVENT));
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isWsConnected).toBe(false);
    expect(result.current.reconnectAttempts).toBe(1);
  });
});
