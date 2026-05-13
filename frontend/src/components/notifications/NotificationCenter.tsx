"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { Drawer } from "@/components/ui/overlays/Drawer";
import { useToast } from "@/components/ui/feedback/ToastProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { getSession } from "@/lib/session";
import type { Notification } from "@/types/domain";

import "@/styles/components/notification-center.css";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOAST_DURATION_MS = 5_000;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onClick: (id: string) => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <button
      type="button"
      className={`dh-notification-item ${notification.read ? "dh-notification-item--read" : "dh-notification-item--unread"}`}
      onClick={() => onClick(notification.id)}
      aria-label={`${notification.read ? "" : "Unread: "}${notification.title}`}
      data-testid={`notification-item-${notification.id}`}
    >
      <div className="dh-notification-item__indicator" aria-hidden="true" />
      <div className="dh-notification-item__content">
        <p className="dh-notification-item__title">{notification.title}</p>
        <p className="dh-notification-item__body">{notification.message}</p>
        <span className="dh-notification-item__time">{timeAgo}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// NotificationCenter Component
// ---------------------------------------------------------------------------

export interface NotificationCenterProps {
  /** JWT token for WebSocket connection */
  token: string;
}

/**
 * NotificationCenter — Bell icon with unread badge that opens a drawer
 * displaying paginated notifications sorted by creation time descending.
 *
 * Features:
 * - Drawer UI triggered by notification bell icon
 * - Paginated notifications sorted by creation time descending
 * - Distinct visual styling for read vs unread notifications
 * - Unread badge count incremented on new notification
 * - Toast popup (5s) on new notification
 * - Mark single notification as read on click
 * - "Mark all as read" button
 *
 * Requirements: 4.4, 4.5, 5.1, 5.2, 5.3, 5.5
 */
export function NotificationCenter({ token }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    setOnNewNotification,
  } = useNotifications(token);

  // -------------------------------------------------------------------------
  // Toast on new notification
  // -------------------------------------------------------------------------

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      toast({
        variant: "info",
        title: notification.title,
        description: notification.message,
        duration: TOAST_DURATION_MS,
      });
    },
    [toast]
  );

  useEffect(() => {
    setOnNewNotification(handleNewNotification);
    return () => setOnNewNotification(null);
  }, [handleNewNotification, setOnNewNotification]);

  // -------------------------------------------------------------------------
  // Infinite scroll for pagination
  // -------------------------------------------------------------------------

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  // -------------------------------------------------------------------------
  // Mark as read handler
  // -------------------------------------------------------------------------

  const handleNotificationClick = useCallback(
    (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.read) {
        markAsRead(id);
      }
    },
    [notifications, markAsRead]
  );

  // -------------------------------------------------------------------------
  // Mark all as read handler
  // -------------------------------------------------------------------------

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const session = getSession();
  if (!session) return null;

  return (
    <>
      {/* Bell icon trigger with badge */}
      <button
        type="button"
        className="dh-notification-bell"
        onClick={() => setIsOpen(true)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        data-testid="notification-bell"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="dh-notification-bell__badge"
            aria-hidden="true"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification drawer */}
      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        position="right"
        data-testid="notification-drawer"
      >
        <div className="dh-notification-center">
          {/* Header actions */}
          {unreadCount > 0 && (
            <div className="dh-notification-center__actions">
              <button
                type="button"
                className="dh-notification-center__mark-all"
                onClick={handleMarkAllAsRead}
                data-testid="mark-all-read-btn"
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* Notification list */}
          <div
            ref={scrollContainerRef}
            className="dh-notification-center__list"
            onScroll={handleScroll}
            role="list"
            aria-label="Notification list"
          >
            {notifications.length === 0 && !loading && (
              <div className="dh-notification-center__empty">
                <Bell size={32} strokeWidth={1.5} />
                <p>No notifications yet</p>
              </div>
            )}

            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={handleNotificationClick}
              />
            ))}

            {loading && (
              <div className="dh-notification-center__loading" aria-live="polite">
                Loading...
              </div>
            )}

            {!hasMore && notifications.length > 0 && (
              <div className="dh-notification-center__end">
                No more notifications
              </div>
            )}
          </div>
        </div>
      </Drawer>
    </>
  );
}
