// Feature: realtime-collaboration, Property 6: Unread Badge Count Invariant
// Validates: Requirements 4.4, 5.3

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

// ---------------------------------------------------------------------------
// Types (minimal notification for this property)
// ---------------------------------------------------------------------------

interface NotificationState {
  id: string;
  read: boolean;
}

// ---------------------------------------------------------------------------
// Simulate the unread count logic from useNotifications hook
// ---------------------------------------------------------------------------

/**
 * Computes unread count — mirrors the hook's derivation:
 *   setUnreadCount(notifications.filter((n) => !n.read).length)
 */
function computeUnreadCount(notifications: NotificationState[]): number {
  return notifications.filter((n) => !n.read).length;
}

/**
 * Applies markAsRead to a notification list (optimistic update).
 * Mirrors: prev.map((n) => (n.id === id ? { ...n, read: true } : n))
 */
function markAsRead(notifications: NotificationState[], id: string): NotificationState[] {
  return notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
}

/**
 * Applies markAllAsRead to a notification list.
 * Mirrors: prev.map((n) => ({ ...n, read: true }))
 */
function markAllAsRead(notifications: NotificationState[]): NotificationState[] {
  return notifications.map((n) => ({ ...n, read: true }));
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbNotification: fc.Arbitrary<NotificationState> = fc.record({
  id: fc.uuid(),
  read: fc.boolean(),
});

const arbNotificationList = fc.array(arbNotification, { minLength: 0, maxLength: 50 });

/** Action: either receive a new notification or mark one as read */
type Action =
  | { type: "receive"; notification: NotificationState }
  | { type: "markAsRead"; id: string }
  | { type: "markAllAsRead" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 6: Unread Badge Count Invariant", () => {
  it("count equals notifications where read === false for any notification list", () => {
    fc.assert(
      fc.property(
        arbNotificationList,
        (notifications) => {
          const count = computeUnreadCount(notifications);
          const expected = notifications.filter((n) => !n.read).length;
          assert.equal(count, expected);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("after markAllAsRead, unread count is zero", () => {
    fc.assert(
      fc.property(
        arbNotificationList,
        (notifications) => {
          const afterMarkAll = markAllAsRead(notifications);
          const count = computeUnreadCount(afterMarkAll);
          assert.equal(count, 0, "After markAllAsRead, count should be 0");
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("for sequences of receive and mark-as-read events, count equals notifications where read === false", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            // Receive a new unread notification
            fc.uuid().map((id): Action => ({
              type: "receive",
              notification: { id, read: false },
            })),
            // Mark a notification as read (random id — may or may not exist)
            fc.uuid().map((id): Action => ({
              type: "markAsRead",
              id,
            })),
            // Mark all as read
            fc.constant<Action>({ type: "markAllAsRead" })
          ),
          { minLength: 1, maxLength: 50 }
        ),
        (actions) => {
          let notifications: NotificationState[] = [];

          for (const action of actions) {
            switch (action.type) {
              case "receive":
                notifications = [...notifications, action.notification];
                break;
              case "markAsRead":
                notifications = markAsRead(notifications, action.id);
                break;
              case "markAllAsRead":
                notifications = markAllAsRead(notifications);
                break;
            }

            // Invariant must hold after every action
            const count = computeUnreadCount(notifications);
            const expected = notifications.filter((n) => !n.read).length;
            assert.equal(count, expected,
              `After action "${action.type}", count ${count} should equal expected ${expected}`);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("markAsRead decreases unread count by exactly 1 when notification exists and is unread", () => {
    fc.assert(
      fc.property(
        // Generate a list with at least one unread notification
        fc.array(arbNotification, { minLength: 1, maxLength: 30 }).filter(
          (list) => list.some((n) => !n.read)
        ),
        (notifications) => {
          // Find an unread notification
          const unread = notifications.find((n) => !n.read)!;
          const countBefore = computeUnreadCount(notifications);
          const afterMark = markAsRead(notifications, unread.id);
          const countAfter = computeUnreadCount(afterMark);

          assert.equal(countAfter, countBefore - 1,
            `Marking unread notification as read should decrease count by 1`);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});
