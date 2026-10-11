import { z } from 'zod'
import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { NotificationPage, NotificationSummary, UserNotification } from './types'

const notificationSchema = z.object({
  id: z.string(), type: z.enum(['guest_rsvp_received', 'guest_rsvp_updated', 'access_transfer_requested']),
  event: z.object({ id: z.string(), name: z.string() }), invitation: z.object({ id: z.string(), name: z.string() }),
  details: z.object({ browserFamily: z.string().nullable().optional(), platform: z.string().nullable().optional() }),
  occurredAt: z.string(), readAt: z.string().nullable(),
})

export async function getNotificationSummary(signal?: AbortSignal): Promise<NotificationSummary> {
  const response = await apiRequest<unknown>('/api/notifications/summary', { signal })
  return z.object({ data: z.object({ unreadCount: z.number(), latestNotificationId: z.string().nullable() }) }).parse(response).data
}

export async function getNotifications(cursor?: string, signal?: AbortSignal): Promise<NotificationPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
  const response = await apiRequest<unknown>(`/api/notifications${query}`, { signal })
  return z.object({ data: z.array(notificationSchema), meta: z.object({ nextCursor: z.string().nullable() }) }).parse(response) as NotificationPage
}

export async function markNotificationRead(id: string): Promise<UserNotification> {
  await ensureCsrfCookie()
  const response = await apiRequest<{ data: unknown }>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
  return notificationSchema.parse(response.data)
}

export async function markAllNotificationsRead(): Promise<void> {
  await ensureCsrfCookie()
  await apiRequest('/api/notifications/read-all', { method: 'POST' })
}
