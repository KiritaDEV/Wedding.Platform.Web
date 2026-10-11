export function legacyWebsiteDestination(eventId: string, projectIds: string[], preview = false): string {
  if (projectIds.length !== 1) return `/events/${encodeURIComponent(eventId)}/websites`
  const base = `/events/${encodeURIComponent(eventId)}/websites/${encodeURIComponent(projectIds[0])}`
  return preview ? `${base}/preview` : base
}
