"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket, type StompMessage } from "@/hooks/useWebSocket";
import { api } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { Notification } from "@/types/domain";
import { reorderBySequence } from "@/lib/notifications/reorder";

// Re-export for backward compatibility
export { reorderBySequence } from "@/lib/notifications/reorder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  hasMore: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  loadMore: () => void;
  /** Callback fired when a new notification arrives via WebSocket */
  onNewNotification: ((notification: Notification) => void) | null;
  setOnNewNotification: (cb: ((notification: Notification) => void) | null) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REORDER_BUFFER_MS = 3_000;
const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useNotifications — Manages notification state, subscribes to real-time
 * notifications via WebSocket, and provides read-state management.
 *
 * Features:
 * - Subscribes to `/user/{userId}/notifications` on connection
 * - Maintains notification list with unread count
 * - Message reordering buffer (3s window) for out-of-order messages
 * - Optimistic UI updates for markAsRead / markAllAsRead
 * - Fetches missed notifications via REST on reconnect
 *
 * Requirements: 4.1, 4.4, 5.2, 5.3, 2.4, 13.2
 */
export function useNotifications(token: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const onNewNotificationRef = useRef<((notification: Notification) => void) | null>(null);
  const bufferRef = useRef<Notification[]>([]);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSeenSequenceRef = useRef<number>(0);
  const previousConnectionStatusRef = useRef<string>("disconnected");
  const hasFetchedInitialRef = useRef(false);

  const { connectionStatus, subscribe } = useWebSocket(token);

  // -------------------------------------------------------------------------
  // Flush reorder buffer — sorts by sequenceNumber ascending and merges
  // -------------------------------------------------------------------------

  const flushBuffer = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    const buffered = [...bufferRef.current];
    bufferRef.current = [];

    // Sort buffered messages by sequence number (ascending)
    const ordered = reorderBySequence(buffered);

    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newItems = ordered.filter((n) => !existingIds.has(n.id));
      if (newItems.length === 0) return prev;

      // Merge: new items go at the top (most recent first for display)
      const merged = [...newItems.reverse(), ...prev];
      return merged;
    });

    // Update last seen sequence number
    for (const n of ordered) {
      if (n.sequenceNumber && n.sequenceNumber > lastSeenSequenceRef.current) {
        lastSeenSequenceRef.current = n.sequenceNumber;
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // Schedule buffer flush (3s window for reordering)
  // -------------------------------------------------------------------------

  const scheduleFlush = useCallback(() => {
    if (bufferTimerRef.current) return; // already scheduled
    bufferTimerRef.current = setTimeout(() => {
      bufferTimerRef.current = null;
      flushBuffer();
    }, REORDER_BUFFER_MS);
  }, [flushBuffer]);

  // -------------------------------------------------------------------------
  // WebSocket subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (connectionStatus !== "connected") return;

    const session = getSession();
    if (!session) return;

    const userId = session.user.id;
    const sub = subscribe(`/user/${userId}/notifications`, (msg: StompMessage) => {
      try {
        const notification: Notification = JSON.parse(msg.body);

        // Add to reorder buffer
        bufferRef.current.push(notification);
        scheduleFlush();

        // Fire new notification callback (for toast)
        if (onNewNotificationRef.current) {
          onNewNotificationRef.current(notification);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [connectionStatus, subscribe, scheduleFlush]);

  // -------------------------------------------------------------------------
  // Fetch missed notifications on reconnect (Requirement 2.4)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const wasDisconnected =
      previousConnectionStatusRef.current === "disconnected" ||
      previousConnectionStatusRef.current === "polling";
    const isNowConnected = connectionStatus === "connected";

    // Track previous status
    previousConnectionStatusRef.current = connectionStatus;

    // On reconnect (was disconnected, now connected), fetch missed notifications
    // Skip the very first connection (handled by initial fetch)
    if (wasDisconnected && isNowConnected && hasFetchedInitialRef.current) {
      fetchMissedNotifications();
    }
  }, [connectionStatus]);

  // -------------------------------------------------------------------------
  // Fetch missed notifications via REST
  // -------------------------------------------------------------------------

  async function fetchMissedNotifications() {
    try {
      const result = await api.notifications();
      const items = result.content ?? [];

      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => n.id));
        const missed = items.filter((n) => !existingIds.has(n.id));
        if (missed.length === 0) return prev;

        // Merge missed notifications, maintaining display order (newest first)
        const merged = [...prev];
        for (const n of missed) {
          merged.push(n);
        }
        // Sort by createdAt descending for display
        merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return merged;
      });

      // Update last seen sequence
      for (const n of items) {
        if (n.sequenceNumber && n.sequenceNumber > lastSeenSequenceRef.current) {
          lastSeenSequenceRef.current = n.sequenceNumber;
        }
      }
    } catch {
      // Silently fail — will retry on next reconnect
    }
  }

  // -------------------------------------------------------------------------
  // Initial fetch
  // -------------------------------------------------------------------------

  useEffect(() => {
    fetchNotifications(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNotifications(pageNum: number) {
    setLoading(true);
    try {
      const result = await api.notifications();
      const items = result.content ?? [];
      if (pageNum === 0) {
        setNotifications(items);
        // Track last seen sequence from initial load
        for (const n of items) {
          if (n.sequenceNumber && n.sequenceNumber > lastSeenSequenceRef.current) {
            lastSeenSequenceRef.current = n.sequenceNumber;
          }
        }
        hasFetchedInitialRef.current = true;
      } else {
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newItems = items.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newItems];
        });
      }
      setHasMore(items.length >= PAGE_SIZE);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Load more (pagination)
  // -------------------------------------------------------------------------

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, page]);

  // -------------------------------------------------------------------------
  // Mark as read (optimistic) — Requirement 5.2
  // -------------------------------------------------------------------------

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
    );

    // Fire-and-forget PATCH
    const session = getSession();
    fetch(`${api.baseUrl}/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.accessToken ?? ""}`,
      },
    }).catch(() => {
      // Revert on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false, readAt: undefined } : n))
      );
    });
  }, []);

  // -------------------------------------------------------------------------
  // Mark all as read (optimistic) — Requirement 5.3
  // -------------------------------------------------------------------------

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt ?? new Date().toISOString(),
      }));

      // Keep a snapshot for rollback
      const snapshot = prev;

      api.readAllNotifications().catch(() => {
        // Revert on failure
        setNotifications(snapshot);
      });

      return updated;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Derive unread count from notifications state
  // -------------------------------------------------------------------------

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  // -------------------------------------------------------------------------
  // New notification callback setter
  // -------------------------------------------------------------------------

  const setOnNewNotification = useCallback((cb: ((notification: Notification) => void) | null) => {
    onNewNotificationRef.current = cb;
  }, []);

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    onNewNotification: onNewNotificationRef.current,
    setOnNewNotification,
  };
}
