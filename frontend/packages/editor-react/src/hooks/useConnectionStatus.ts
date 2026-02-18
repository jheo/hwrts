import { useCallback, useEffect, useRef, useState } from 'react';

export interface ConnectionStatus {
  /** Whether the browser has network connectivity (navigator.onLine) */
  isOnline: boolean;
  /** Whether the WebSocket/STOMP connection is currently active */
  isWsConnected: boolean;
  /** Number of reconnect attempts since last successful connection */
  reconnectAttempts: number;
}

export interface UseConnectionStatusOptions {
  /**
   * Callback invoked when online status changes.
   * Use this to trigger reconnection logic.
   */
  onOnlineChange?: (isOnline: boolean) => void;
  /**
   * Callback invoked when WS connection status changes.
   */
  onWsChange?: (isConnected: boolean) => void;
}

/** Custom event name used by the STOMP/realtime layer to signal WS state changes */
export const WS_CONNECT_EVENT = 'humanwrites:ws:connect';
export const WS_DISCONNECT_EVENT = 'humanwrites:ws:disconnect';

/**
 * Track WebSocket and network connection status.
 *
 * The realtime layer should dispatch `humanwrites:ws:connect` /
 * `humanwrites:ws:disconnect` custom events on `window` whenever the
 * STOMP connection state changes. This hook listens to those events
 * alongside `navigator.onLine` to provide a unified connection state.
 *
 * @example
 * ```tsx
 * const { isOnline, isWsConnected, reconnectAttempts } = useConnectionStatus();
 * ```
 */
export function useConnectionStatus(
  options: UseConnectionStatusOptions = {},
): ConnectionStatus {
  const { onOnlineChange, onWsChange } = options;

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const reconnectAttemptsRef = useRef<number>(0);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    onOnlineChange?.(true);
  }, [onOnlineChange]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    onOnlineChange?.(false);
  }, [onOnlineChange]);

  const handleWsConnect = useCallback(() => {
    setIsWsConnected(true);
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    onWsChange?.(true);
  }, [onWsChange]);

  const handleWsDisconnect = useCallback(() => {
    setIsWsConnected(false);
    reconnectAttemptsRef.current += 1;
    setReconnectAttempts(reconnectAttemptsRef.current);
    onWsChange?.(false);
  }, [onWsChange]);

  useEffect(() => {
    // Network status listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // WebSocket state listeners (dispatched by the realtime package)
    window.addEventListener(WS_CONNECT_EVENT, handleWsConnect);
    window.addEventListener(WS_DISCONNECT_EVENT, handleWsDisconnect);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(WS_CONNECT_EVENT, handleWsConnect);
      window.removeEventListener(WS_DISCONNECT_EVENT, handleWsDisconnect);
    };
  }, [handleOnline, handleOffline, handleWsConnect, handleWsDisconnect]);

  return { isOnline, isWsConnected, reconnectAttempts };
}
