import type { UserNotification } from './types'

export const notificationLabels = {
  guest_rsvp_received: 'RSVP received',
  guest_rsvp_updated: 'RSVP updated',
  access_transfer_requested: 'Access requested',
} as const

export function notificationContext(notification: UserNotification): string {
  if (notification.type !== 'access_transfer_requested') return notification.invitation.name
  const browser = [notification.details.browserFamily, notification.details.platform].filter(Boolean).join(' on ')
  return browser ? `${browser} · ${notification.invitation.name}` : notification.invitation.name
}
