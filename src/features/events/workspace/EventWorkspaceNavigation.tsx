import { ArrowLeft, CalendarDays, Globe2, Images, LayoutDashboard, Mail, Settings } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import type { EventDetail } from '../types'
import { Tooltip } from '../../../components/ui/Tooltip'
import { formatEventDate } from '../formatEventDetails'

type Props = {
  event: EventDetail
  onNavigate?: () => void
  collapsed?: boolean
}

const sections = [
  { path: '.', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: 'websites', label: 'Websites', icon: Globe2 },
  { path: 'media', label: 'Media', icon: Images },
  { path: 'invitations', label: 'Invitations', icon: Mail },
  { path: 'settings', label: 'Settings', icon: Settings },
]

export function EventWorkspaceNavigation({ event, onNavigate, collapsed = false }: Props) {
  const eventDate = formatEventDate(event.eventDate)

  return (
    <div className={`flex min-h-full flex-col ${collapsed ? 'p-2' : 'p-4'}`}>
      {collapsed ? (
        <Tooltip label="My Events">
          <Link className="grid min-h-10 place-items-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground" to="/events" onClick={onNavigate} aria-label="My Events">
            <ArrowLeft aria-hidden="true" size={17} />
          </Link>
        </Tooltip>
      ) : (
        <Link className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground" to="/events" onClick={onNavigate}>
          <ArrowLeft aria-hidden="true" size={16} /> My Events
        </Link>
      )}

      <div className={`mt-5 border-b border-border px-2 pb-5 ${collapsed ? 'hidden' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate font-semibold tracking-tight">{event.name}</h1>
            <p className="mt-0.5 text-xs capitalize text-foreground-muted">{event.type}</p>
          </div>
          {event.membershipRole && (
            <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium capitalize text-foreground-muted">
              {event.membershipRole}
            </span>
          )}
        </div>
        {eventDate && (
          <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-foreground-muted">
            <CalendarDays aria-hidden="true" className="mt-0.5 shrink-0" size={14} /> {eventDate}
          </p>
        )}
        {event.status === 'archived' && <p className="mt-2 text-xs font-medium text-foreground-muted">Archived event</p>}
      </div>

      <nav className="mt-4 space-y-1" aria-label={`${event.name} workspace`}>
        {sections.map(({ path, label, icon: Icon, end }) => (
          collapsed ? (
            <Tooltip label={label} key={path}>
              <NavLink
                className={({ isActive }) => `relative grid min-h-10 place-items-center rounded-lg transition-colors ${isActive ? 'bg-surface-muted text-accent before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent' : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'}`}
                to={path}
                end={end}
                onClick={onNavigate}
                aria-label={label}
              >
                <Icon aria-hidden="true" size={18} />
              </NavLink>
            </Tooltip>
          ) : (
            <NavLink
              className={({ isActive }) => `relative flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${isActive ? 'bg-surface-muted font-medium text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent' : 'text-foreground-muted hover:bg-surface-muted hover:text-foreground'}`}
              key={path}
              to={path}
              end={end}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" size={17} /> {label}
            </NavLink>
          )
        ))}
      </nav>
    </div>
  )
}
