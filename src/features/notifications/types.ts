export type NotificationType = 'guest_rsvp_received' | 'guest_rsvp_updated' | 'access_transfer_requested'
export type NotificationSummary = { unreadCount: number; latestNotificationId: string | null }
export type UserNotification = {
  id: string; type: NotificationType
  event: { id: string; name: string }
  invitation: { id: string; name: string }
  details: { browserFamily?: string | null; platform?: string | null }
  occurredAt: string; readAt: string | null
}
export type NotificationPage = { data: UserNotification[]; meta: { nextCursor: string | null } }
