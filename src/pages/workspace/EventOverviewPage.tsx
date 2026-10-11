import type { LucideIcon } from 'lucide-react'
import { CalendarClock, Globe2, Images, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Heading } from '../../components/ui/Heading'
import { Text } from '../../components/ui/Text'
import { formatEventDate, formatEventTime, formatEventType } from '../../features/events/formatEventDetails'
import { useEventWorkspace } from '../../features/events/workspace/EventWorkspaceContext'
import { WorkspaceSection } from '../../features/events/workspace/WorkspaceSection'

export function EventOverviewPage() {
  const event = useEventWorkspace()
  const date = formatEventDate(event.eventDate)
  const time = formatEventTime(event.startTime)
  const identity = [formatEventType(event.type), date].filter(Boolean).join(' · ')
  const timing = [time, event.timeZone].filter(Boolean).join(' · ')

  return <WorkspaceSection eyebrow="Event overview" title={event.name} description={identity || formatEventType(event.type)}>
    {timing && <Text className="-mt-3 mb-6" variant="muted">{timing}</Text>}
    <div className="grid gap-4 md:grid-cols-2">
      <EventOverviewCard icon={Globe2} title="Websites" description="Design and manage Website Projects for your Event." action="Open Websites" to="websites" />
      <EventOverviewCard icon={Images} title="Media" description="Upload and manage reusable images for your Event." action="Open Media" to="media" />
      <EventOverviewCard icon={Mail} title="Invitations" description="Manage your guest invitations and RSVPs." detail="Not set up yet" action="Open Invitations" to="invitations" />
      <EventOverviewCard icon={CalendarClock} title="Event details" description="Review the local timing configured for this Event." detail={eventDetails(date, time, event.timeZone)} action="Open Settings" to="settings" />
    </div>
  </WorkspaceSection>
}

function eventDetails(date: string | null, time: string | null, timeZone: string | null): string {
  return [date, time, timeZone].filter(Boolean).join(' · ') || 'Date and time not set'
}

function EventOverviewCard({ icon: Icon, title, description, detail, action, to }: {
  icon: LucideIcon
  title: string
  description: string
  detail?: string
  action: string
  to: string
}) {
  return <section className="flex min-h-52 flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6">
    <span className="grid size-10 place-items-center rounded-lg bg-surface-muted text-secondary-accent"><Icon aria-hidden="true" size={20} /></span>
    <Heading className="mt-4" level={2} variant="panel">{title}</Heading>
    <Text className="mt-1" variant="muted">{description}</Text>
    {detail && <Text className="mt-3" variant="body">{detail}</Text>}
    <div className="mt-auto pt-5">
      <Link className="inline-flex min-h-9 items-center justify-center rounded-sm bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover" to={to}>{action}</Link>
    </div>
  </section>
}
