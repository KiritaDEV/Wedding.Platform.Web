import type { NotificationSummary } from './types'

export const NOTIFICATION_POLL_MS = 30_000
export const FOREGROUND_COALESCE_MS = 500

export function summariesEqual(left: NotificationSummary, right: NotificationSummary): boolean {
  return left.unreadCount === right.unreadCount && left.latestNotificationId === right.latestNotificationId
}

export function discoveredNewNotification(previousLatestId: string | null | undefined, nextLatestId: string | null): boolean {
  return previousLatestId !== undefined && nextLatestId !== null && nextLatestId !== previousLatestId
}
