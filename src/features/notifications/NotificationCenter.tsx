import { Bell, LoaderCircle, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { announceMobileDrawerOpen, isCompetingMobileDrawer, MOBILE_DRAWER_OPEN_EVENT, type MobileDrawer } from '../events/workspace/mobileDrawerCoordination'
import { getNotifications, getNotificationSummary, markAllNotificationsRead, markNotificationRead } from './api'
import { notificationContext, notificationLabels } from './presentation'
import { discoveredNewNotification, FOREGROUND_COALESCE_MS, NOTIFICATION_POLL_MS, summariesEqual } from './polling'
import type { NotificationSummary, UserNotification } from './types'

export const NEW_NOTIFICATION_EVENT = 'management:new-notification'
export const INVITATIONS_REFRESH_EVENT = 'management:refresh-invitations'

export function NotificationCenter() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<NotificationSummary>({ unreadCount: 0, latestNotificationId: null })
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [items, setItems] = useState<UserNotification[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const summaryInFlight = useRef(false)
  const observedLatest = useRef<string | null | undefined>(undefined)
  const lastSummaryRequest = useRef(0)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const update = () => setMobile(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const closeForOtherDrawer = (event: Event) => {
      if (isCompetingMobileDrawer('notifications', (event as CustomEvent<MobileDrawer>).detail)) setOpen(false)
    }
    window.addEventListener(MOBILE_DRAWER_OPEN_EVENT, closeForOtherDrawer)
    return () => window.removeEventListener(MOBILE_DRAWER_OPEN_EVENT, closeForOtherDrawer)
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && mobile && !dialog.open) { dialog.showModal(); closeRef.current?.focus() }
    if ((!open || !mobile) && dialog.open) dialog.close()
  }, [mobile, open])

  useEffect(() => {
    if (!open || !mobile) return
    const htmlOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = htmlOverflow
      document.body.style.overflow = bodyOverflow
    }
  }, [mobile, open])

  const refreshSummary = useCallback(async (coalesceRecent = false) => {
    const requestedAt = Date.now()
    if (coalesceRecent && requestedAt - lastSummaryRequest.current < FOREGROUND_COALESCE_MS) return
    if (summaryInFlight.current || document.visibilityState !== 'visible') return
    lastSummaryRequest.current = requestedAt
    summaryInFlight.current = true
    try {
      const next = await getNotificationSummary()
      if (discoveredNewNotification(observedLatest.current, next.latestNotificationId)) window.dispatchEvent(new Event(NEW_NOTIFICATION_EVENT))
      observedLatest.current = next.latestNotificationId
      setSummary((current) => summariesEqual(current, next) ? current : next)
    } catch { /* background polling deliberately preserves last known state */ }
    finally { summaryInFlight.current = false }
  }, [])

  useEffect(() => {
    let timeout: number | undefined
    const schedule = () => {
      if (timeout !== undefined) window.clearTimeout(timeout)
      timeout = document.visibilityState === 'visible' ? window.setTimeout(async () => { await refreshSummary(); schedule() }, NOTIFICATION_POLL_MS) : undefined
    }
    queueMicrotask(() => { void refreshSummary() }); schedule()
    const foreground = () => { schedule(); if (document.visibilityState === 'visible') void refreshSummary(true) }
    document.addEventListener('visibilitychange', foreground); window.addEventListener('focus', foreground)
    return () => { if (timeout !== undefined) window.clearTimeout(timeout); document.removeEventListener('visibilitychange', foreground); window.removeEventListener('focus', foreground) }
  }, [refreshSummary])

  const load = useCallback(async (append = false) => {
    if (loading) return
    setLoading(true); setError(null)
    try { const page = await getNotifications(append ? cursor ?? undefined : undefined); setItems((current) => append ? [...current, ...page.data] : page.data); setCursor(page.meta.nextCursor) }
    catch { setError('Unable to load notifications.') }
    finally { setLoading(false) }
  }, [cursor, loading])

  const close = useCallback((returnFocus = true) => {
    setOpen(false)
    if (returnFocus) requestAnimationFrame(() => bellRef.current?.focus())
  }, [])

  async function toggle() {
    const next = !open
    if (next && mobile) announceMobileDrawerOpen('notifications')
    setOpen(next)
    if (next) { void refreshSummary(true); void load(false) }
  }

  async function select(item: UserNotification) {
    if (item.readAt === null) {
      try { await markNotificationRead(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry)); setSummary((current) => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1) })) }
      catch { setError('Unable to mark this notification as read.'); return }
    }
    close(); navigate(`/events/${item.event.id}/invitations`); window.dispatchEvent(new Event(INVITATIONS_REFRESH_EVENT))
  }

  async function readAll() {
    try { await markAllNotificationsRead(); const now = new Date().toISOString(); setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now }))); setSummary((current) => ({ ...current, unreadCount: 0 })) }
    catch { setError('Unable to mark all notifications as read.') }
  }

  const label = `Notifications${summary.unreadCount ? `, ${summary.unreadCount} unread` : ''}`
  const panel = <div className="flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 items-center justify-between border-b border-border p-4"><div><h2 className="font-semibold" id="notifications-title">Notifications</h2>{summary.unreadCount > 0 && <button type="button" className="mt-1 text-xs text-accent hover:underline" onClick={() => { void readAll() }}>Mark all as read</button>}</div><button ref={closeRef} type="button" className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted" aria-label="Close notifications" onClick={() => close()}><X size={18} /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-3">{loading && items.length === 0 && <p className="p-4 text-sm text-foreground-muted" role="status"><LoaderCircle className="mr-2 inline animate-spin" size={15} />Loading notifications…</p>}{error && <div className="m-1 rounded-lg bg-danger-muted p-3 text-sm text-danger" role="alert">{error} <Button size="sm" variant="secondary" onClick={() => { void load(false) }}>Try again</Button></div>}{!loading && !error && items.length === 0 && <p className="p-4 text-sm text-foreground-muted">No notifications yet.</p>}
      <ol className="divide-y divide-border">{items.map((item) => <li key={item.id}><button type="button" className={`w-full p-3 text-left hover:bg-surface-muted ${item.readAt === null ? 'bg-accent/5' : ''}`} onClick={() => { void select(item) }}><span className="block text-sm font-semibold">{notificationLabels[item.type]}</span><span className="mt-0.5 block text-sm text-foreground-muted">{notificationContext(item)}</span><span className="mt-1 block text-xs text-foreground-muted">{item.event.name} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.occurredAt))}</span></button></li>)}</ol>
      {cursor && <div className="p-3 text-center"><Button variant="secondary" disabled={loading} onClick={() => { void load(true) }}>{loading ? 'Loading…' : 'Load more'}</Button></div>}
    </div>
  </div>

  return <div className="relative">
    <button ref={bellRef} type="button" className="relative grid size-9 place-items-center rounded-lg border border-border bg-surface text-foreground-muted hover:bg-surface-muted hover:text-foreground" aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => { void toggle() }}><Bell size={17} aria-hidden="true" />{summary.unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-5 text-white" aria-hidden="true">{summary.unreadCount > 99 ? '99+' : summary.unreadCount}</span>}</button>
    {open && mobile && <dialog ref={dialogRef} aria-labelledby="notifications-title" className="m-0 ml-auto h-dvh max-h-none w-[min(90vw,380px)] max-w-none border-0 border-l border-border bg-surface p-0 text-foreground shadow-[var(--shadow-dialog)]" onCancel={(event) => { event.preventDefault(); close() }} onClose={() => { if (open) close() }} onClick={(event) => { if (event.target === event.currentTarget) close() }}>{panel}</dialog>}
    {open && !mobile && <section role="dialog" aria-labelledby="notifications-title" className="absolute right-0 top-11 z-50 h-[min(70vh,560px)] w-96 rounded-xl border border-border bg-surface shadow-xl">{panel}</section>}
  </div>
}
