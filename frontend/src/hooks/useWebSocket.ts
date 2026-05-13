"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "polling";

export interface Subscription {
  id: string;
  destination: string;
  unsubscribe: () => void;
}

export interface UseWebSocketReturn {
  connectionStatus: ConnectionStatus;
  subscribe: (destination: string, callback: (msg: StompMessage) => void) => Subscription;
  unsubscribe: (subscription: Subscription) => void;
  publish: (destination: string, body?: string, headers?: Record<string, string>) => void;
  sendHeartbeat: () => void;
}

export interface StompMessage {
  destination: string;
  headers: Record<string, string>;
  body: string;
}

// ---------------------------------------------------------------------------
// Pure utility — exported for testability
// ---------------------------------------------------------------------------

/**
 * Calculate exponential backoff delay for a given attempt number.
 *
 * delay = min(2^(attempt-1) * 1000, 30000) ms
 *
 * @param attempt - 1-indexed reconnection attempt number
 * @returns delay in milliseconds
 */
export function calculateBackoffDelay(attempt: number): number {
  if (attempt < 1) return 1000;
  return Math.min(Math.pow(2, attempt - 1) * 1000, 30000);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WS_ENDPOINT = "/ws";
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 30_000;
const POLLING_INTERVAL_MS = 30_000;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * React hook managing a STOMP-over-SockJS WebSocket connection.
 *
 * Features:
 * - Exponential backoff reconnection (1s initial, doubling, max 30s)
 * - Subscription management with automatic re-subscribe on reconnect
 * - Falls back to REST polling after 10 consecutive reconnection failures
 * - Sends heartbeat every 30s to refresh presence TTL
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.5
 */
export function useWebSocket(token: string): UseWebSocketReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");

  // Refs to avoid re-renders and stale closures
  const clientRef = useRef<Client | null>(null);
  const tokenRef = useRef(token);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionsRef = useRef<Map<string, { destination: string; callback: (msg: StompMessage) => void; stompSub: StompSubscription | null }>>(new Map());
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Keep token ref in sync
  tokenRef.current = token;

  // -------------------------------------------------------------------------
  // Heartbeat
  // -------------------------------------------------------------------------

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (clientRef.current?.connected) {
        clientRef.current.publish({
          destination: "/app/heartbeat",
          body: "",
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Polling fallback
  // -------------------------------------------------------------------------

  const startPolling = useCallback(() => {
    stopPolling();
    setConnectionStatus("polling");
    pollingTimerRef.current = setInterval(() => {
      // Each subscription's callback is invoked by the consumer via REST
      // The hook signals the polling state; consumers handle their own REST calls
    }, POLLING_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Re-subscribe all active topics
  // -------------------------------------------------------------------------

  const resubscribeAll = useCallback(() => {
    const client = clientRef.current;
    if (!client?.connected) return;

    subscriptionsRef.current.forEach((entry, id) => {
      // Unsubscribe old stomp subscription if it exists
      if (entry.stompSub) {
        try { entry.stompSub.unsubscribe(); } catch { /* ignore */ }
      }

      const stompSub = client.subscribe(entry.destination, (message: IMessage) => {
        const stompMsg: StompMessage = {
          destination: message.headers["destination"] ?? entry.destination,
          headers: message.headers as Record<string, string>,
          body: message.body,
        };
        entry.callback(stompMsg);
      });

      entry.stompSub = stompSub;
      subscriptionsRef.current.set(id, entry);
    });
  }, []);

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  const connect = useCallback(() => {
    if (isConnectingRef.current || !isMountedRef.current) return;
    if (!tokenRef.current) return;

    isConnectingRef.current = true;
    setConnectionStatus("connecting");

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE_URL}${WS_ENDPOINT}`),
      connectHeaders: {
        Authorization: `Bearer ${tokenRef.current}`,
      },
      // Disable built-in reconnect — we handle it ourselves
      reconnectDelay: 0,

      onConnect: () => {
        if (!isMountedRef.current) return;
        isConnectingRef.current = false;
        reconnectAttemptRef.current = 0;
        setConnectionStatus("connected");
        stopPolling();
        resubscribeAll();
        startHeartbeat();
      },

      onStompError: () => {
        if (!isMountedRef.current) return;
        isConnectingRef.current = false;
        handleDisconnect();
      },

      onWebSocketClose: () => {
        if (!isMountedRef.current) return;
        isConnectingRef.current = false;
        handleDisconnect();
      },

      onWebSocketError: () => {
        if (!isMountedRef.current) return;
        isConnectingRef.current = false;
        // onWebSocketClose will also fire, which triggers handleDisconnect
      },
    });

    clientRef.current = client;
    client.activate();
  }, [resubscribeAll, startHeartbeat, stopPolling]);

  // -------------------------------------------------------------------------
  // Reconnection with exponential backoff
  // -------------------------------------------------------------------------

  const handleDisconnect = useCallback(() => {
    stopHeartbeat();
    setConnectionStatus("disconnected");

    reconnectAttemptRef.current += 1;

    if (reconnectAttemptRef.current > MAX_RECONNECT_ATTEMPTS) {
      // Fall back to REST polling
      startPolling();
      return;
    }

    const delay = calculateBackoffDelay(reconnectAttemptRef.current);

    reconnectTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect, startPolling, stopHeartbeat]);

  // -------------------------------------------------------------------------
  // Subscribe / Unsubscribe
  // -------------------------------------------------------------------------

  const subscribe = useCallback((destination: string, callback: (msg: StompMessage) => void): Subscription => {
    const id = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    let stompSub: StompSubscription | null = null;

    if (clientRef.current?.connected) {
      stompSub = clientRef.current.subscribe(destination, (message: IMessage) => {
        const stompMsg: StompMessage = {
          destination: message.headers["destination"] ?? destination,
          headers: message.headers as Record<string, string>,
          body: message.body,
        };
        callback(stompMsg);
      });
    }

    subscriptionsRef.current.set(id, { destination, callback, stompSub });

    return {
      id,
      destination,
      unsubscribe: () => {
        const entry = subscriptionsRef.current.get(id);
        if (entry?.stompSub) {
          try { entry.stompSub.unsubscribe(); } catch { /* ignore */ }
        }
        subscriptionsRef.current.delete(id);
      },
    };
  }, []);

  const unsubscribe = useCallback((subscription: Subscription) => {
    subscription.unsubscribe();
  }, []);

  // -------------------------------------------------------------------------
  // Publish message to a STOMP destination
  // -------------------------------------------------------------------------

  const publish = useCallback((destination: string, body = "", headers: Record<string, string> = {}) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({ destination, body, headers });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Send heartbeat (manual trigger)
  // -------------------------------------------------------------------------

  const sendHeartbeat = useCallback(() => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: "/app/heartbeat",
        body: "",
      });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  useEffect(() => {
    isMountedRef.current = true;

    if (token) {
      connect();
    }

    return () => {
      isMountedRef.current = false;

      // Cleanup timers
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      stopHeartbeat();
      stopPolling();

      // Deactivate STOMP client
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }

      // Clear subscriptions
      subscriptionsRef.current.clear();
    };
  }, [token, connect, stopHeartbeat, stopPolling]);

  return {
    connectionStatus,
    subscribe,
    unsubscribe,
    publish,
    sendHeartbeat,
  };
}
