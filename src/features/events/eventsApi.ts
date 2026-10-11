import { apiRequest, ensureCsrfCookie } from '../../lib/api'
import type { ApiCollection, ApiResource } from '../../lib/api'
import { z } from 'zod'
import { eventDetailSchema, eventSchema, timeZoneOptionSchema } from './schemas'
import type { CreateEventRequest, Event, EventDetail, EventRsvpSettingsRequest, EventTimingRequest, TimeZoneOption } from './types'

export async function getMyEvents(signal?: AbortSignal): Promise<Event[]> {
  const response = await apiRequest<ApiCollection<Event>>('/api/events', { signal })
  return z.array(eventSchema).parse(response.data)
}

export async function createEvent(input: CreateEventRequest): Promise<Event> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<Event>>('/api/events', {
    method: 'POST',
    body: input,
  })
  return eventSchema.parse(response.data)
}

export async function getEvent(eventId: string, signal?: AbortSignal): Promise<EventDetail> {
  const response = await apiRequest<ApiResource<EventDetail>>(`/api/events/${encodeURIComponent(eventId)}`, { signal })
  return eventDetailSchema.parse(response.data)
}

export async function updateEventTiming(eventId: string, input: EventTimingRequest): Promise<EventDetail> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/timing`, {
    method: 'PUT', body: input,
  })
  return eventDetailSchema.parse(response.data)
}

export async function updateEventRsvpSettings(eventId: string, input: EventRsvpSettingsRequest): Promise<EventDetail> {
  await ensureCsrfCookie()
  const response = await apiRequest<ApiResource<unknown>>(`/api/events/${encodeURIComponent(eventId)}/rsvp-settings`, {
    method: 'PUT', body: input,
  })
  return eventDetailSchema.parse(response.data)
}

export async function getTimeZones(signal?: AbortSignal): Promise<TimeZoneOption[]> {
  const response = await apiRequest<ApiCollection<unknown>>('/api/time-zones', { signal })
  return z.array(timeZoneOptionSchema).parse(response.data)
}
