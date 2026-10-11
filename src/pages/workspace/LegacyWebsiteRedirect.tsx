import { Navigate, useParams } from 'react-router-dom'
import { legacyWebsiteDestination } from '../../features/websiteProjects/legacyRoute'
import { useWebsiteProjects } from '../../features/websiteProjects/useWebsiteProjects'
import { Text } from '../../components/ui/Text'

export function LegacyWebsiteRedirect({ preview = false }: { preview?: boolean }) {
  const { eventId = '' } = useParams()
  const { projects, error, isLoading } = useWebsiteProjects(eventId)
  if (isLoading) return <main className="grid min-h-full place-items-center p-6"><Text variant="muted">Loading Website Projects…</Text></main>
  if (error) return <Navigate replace to={`/events/${eventId}/websites`} />
  return <Navigate replace to={legacyWebsiteDestination(eventId, projects.map(({ id }) => id), preview)} />
}
