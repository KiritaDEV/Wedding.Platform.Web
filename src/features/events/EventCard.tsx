import { CalendarDays } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Event } from './types'
import { formatEventDate, formatEventType } from './formatEventDetails'

function initials(name: string): string {
  const words = name.split(/\s*(?:&|and)\s*|\s+/i).filter(Boolean)
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'E'
}

function FallbackEventVisual({ event }: { event: Event }) {
  return (
    <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-surface-muted" aria-hidden="true">
      <div className="absolute -left-10 top-1/3 h-40 w-40 rounded-full bg-accent/18 blur-2xl" />
      <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-secondary-accent/20 blur-2xl" />
      <div className="absolute inset-x-8 top-8 h-px bg-foreground/10" />
      <div className="relative text-center">
        <span className="block text-4xl font-light tracking-[0.12em] text-foreground">{initials(event.name)}</span>
        <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground-muted">{formatEventType(event.type)} event</span>
      </div>
    </div>
  )
}

export function EventCard({ event }: { event: Event }) {
  return (
    <Link
      className="group overflow-hidden rounded-2xl border border-border bg-surface transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_12px_35px_rgb(72_51_40_/_10%)]"
      to={`/events/${event.id}`}
    >
      <FallbackEventVisual event={event} />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-accent">{formatEventType(event.type)}</p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight group-hover:text-accent">{event.name}</h2>
          </div>
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
            {event.membershipRole === 'owner' ? 'Owner' : 'Admin'}
          </span>
        </div>
        <p className="flex items-center gap-2 text-sm text-foreground-muted">
          <CalendarDays aria-hidden="true" size={16} />
          {formatEventDate(event.eventDate) ?? 'Date to be announced'}
        </p>
      </div>
    </Link>
  )
}
