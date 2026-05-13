"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket, type StompMessage } from "@/hooks/useWebSocket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresenceChange {
  userId: string;
  status: "online" | "offline";
  context?: string;
}

export interface ViewerCount {
  contextId: string;
  count: number;
}

export interface UsePresenceReturn {
  /** Set of currently online user IDs */
  onlineUsers: Set<string>;
  /** Viewer count for the currently watched job context */
  viewerCount: number;
  /** The jobId currently being watched (null if none) */
  watchedJobId: string | null;
  /** Start watching a job's viewer count (call on page navigation to job detail) */
  watchJob: (jobId: string) => void;
  /** Stop watching the current job's viewer count (call on page leave) */
  unwatchJob: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * usePresence — Tracks online users and contextual viewer counts.
 *
 * Features:
 * - Subscribes to `/topic/presence` for online/offline events
 * - Subscribes to `/topic/job/{jobId}/viewers` for contextual viewer counts
 * - Notifies server of viewing context on page navigation
 * - Unsubscribes and notifies server on page leave
 *
 * Requirements: 8.4, 9.1, 9.2, 9.3
 */
export function usePresence(token: string): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [viewerCount, setViewerCount] = useState(0);
  const [watchedJobId, setWatchedJobId] = useState<string | null>(null);

  const { connectionStatus, subscribe, publish } = useWebSocket(token);

  // Refs to track subscriptions for cleanup
  const jobViewerSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const watchedJobIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  watchedJobIdRef.current = watchedJobId;

  // -------------------------------------------------------------------------
  // Subscribe to /topic/presence for online/offline events
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (connectionStatus !== "connected") return;

    const sub = subscribe("/topic/presence", (msg: StompMessage) => {
      try {
        const event: PresenceChange = JSON.parse(msg.body);

        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (event.status === "online") {
            next.add(event.userId);
          } else if (event.status === "offline") {
            next.delete(event.userId);
          }
          return next;
        });
      } catch {
        // Ignore malformed messages
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, [connectionStatus, subscribe]);

  // -------------------------------------------------------------------------
  // Watch job viewers — subscribe to /topic/job/{jobId}/viewers
  // -------------------------------------------------------------------------

  const watchJob = useCallback(
    (jobId: string) => {
      // Unwatch previous job if any
      if (jobViewerSubRef.current) {
        jobViewerSubRef.current.unsubscribe();
        jobViewerSubRef.current = null;

        // Notify server we left the previous context
        if (watchedJobIdRef.current) {
          publish("/app/presence/leave", JSON.stringify({ contextId: watchedJobIdRef.current }));
        }
      }

      setWatchedJobId(jobId);
      setViewerCount(0);

      // Notify server of new viewing context
      publish("/app/presence/join", JSON.stringify({ contextId: jobId }));

      // Subscribe to viewer count updates for this job
      if (connectionStatus === "connected") {
        const sub = subscribe(`/topic/job/${jobId}/viewers`, (msg: StompMessage) => {
          try {
            const event: ViewerCount = JSON.parse(msg.body);
            setViewerCount(event.count);
          } catch {
            // Ignore malformed messages
          }
        });
        jobViewerSubRef.current = sub;
      }
    },
    [connectionStatus, subscribe, publish]
  );

  // -------------------------------------------------------------------------
  // Unwatch job viewers — unsubscribe and notify server
  // -------------------------------------------------------------------------

  const unwatchJob = useCallback(() => {
    if (jobViewerSubRef.current) {
      jobViewerSubRef.current.unsubscribe();
      jobViewerSubRef.current = null;
    }

    // Notify server we left the viewing context
    if (watchedJobIdRef.current) {
      publish("/app/presence/leave", JSON.stringify({ contextId: watchedJobIdRef.current }));
    }

    setWatchedJobId(null);
    setViewerCount(0);
  }, [publish]);

  // -------------------------------------------------------------------------
  // Re-subscribe to job viewers on reconnect
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (connectionStatus !== "connected") return;
    if (!watchedJobIdRef.current) return;

    const jobId = watchedJobIdRef.current;

    // Re-notify server of viewing context
    publish("/app/presence/join", JSON.stringify({ contextId: jobId }));

    // Re-subscribe to viewer count updates
    const sub = subscribe(`/topic/job/${jobId}/viewers`, (msg: StompMessage) => {
      try {
        const event: ViewerCount = JSON.parse(msg.body);
        setViewerCount(event.count);
      } catch {
        // Ignore malformed messages
      }
    });
    jobViewerSubRef.current = sub;

    return () => {
      sub.unsubscribe();
    };
  }, [connectionStatus, subscribe, publish]);

  // -------------------------------------------------------------------------
  // Cleanup on unmount — notify server of leave
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (jobViewerSubRef.current) {
        jobViewerSubRef.current.unsubscribe();
        jobViewerSubRef.current = null;
      }
      // Notify server on component unmount (page leave)
      if (watchedJobIdRef.current) {
        publish("/app/presence/leave", JSON.stringify({ contextId: watchedJobIdRef.current }));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    onlineUsers,
    viewerCount,
    watchedJobId,
    watchJob,
    unwatchJob,
  };
}
