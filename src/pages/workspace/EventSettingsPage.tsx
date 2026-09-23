import { CalendarCheck2, Clock3, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Heading } from '../../components/ui/Heading'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Text } from '../../components/ui/Text'
import { getTimeZones, updateEventRsvpSettings, updateEventTiming } from '../../features/events/eventsApi'
import type { TimeZoneOption } from '../../features/events/types'
import { useEventWorkspace, useSetEventWorkspace } from '../../features/events/workspace/EventWorkspaceContext'
import { WorkspaceSection } from '../../features/events/workspace/WorkspaceSection'
import { ApiError } from '../../lib/api'

type TimingForm = { eventDate: string; startTime: string; timeZone: string }

export function EventSettingsPage() {
  const event = useEventWorkspace()
  const setEvent = useSetEventWorkspace()
  const authoritative = useMemo<TimingForm>(() => ({ eventDate: event.eventDate ?? '', startTime: event.startTime ?? '', timeZone: event.timeZone }), [event.eventDate, event.startTime, event.timeZone])
  const [form, setForm] = useState<TimingForm>(authoritative)
  const [timeZones, setTimeZones] = useState<TimeZoneOption[]>([])
  const [zonesError, setZonesError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const controller = new AbortController()
    getTimeZones(controller.signal)
      .then((options) => { setTimeZones(options); setZonesError(null) })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setZonesError(error instanceof Error ? error.message : 'Unable to load time zones.')
      })
    return () => controller.abort()
  }, [])

  const dirty = JSON.stringify(form) !== JSON.stringify(authoritative)
  function change(field: keyof TimingForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: '' }))
  }

  async function save() {
    setSaving(true); setSaveError(null); setFieldErrors({})
    try {
      const updated = await updateEventTiming(event.id, { eventDate: form.eventDate || null, startTime: form.startTime || null, timeZone: form.timeZone })
      setEvent(updated)
      setForm({ eventDate: updated.eventDate ?? '', startTime: updated.startTime ?? '', timeZone: updated.timeZone })
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(Object.fromEntries(Object.entries(error.validationErrors).map(([field, messages]) => [field, messages[0] ?? 'Invalid value.'])))
        setSaveError(error.message)
      } else setSaveError('Unable to save Event timing. Please try again.')
    } finally { setSaving(false) }
  }

  const zoneOptions = [{ value: '', label: 'Select a time zone' }, ...timeZones.map(({ id, displayName }) => ({ value: id, label: displayName }))]

  return <WorkspaceSection eyebrow="Event workspace" title="Settings" description="Manage Event details and workspace settings.">
    <div className="space-y-6">
    <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-secondary-accent"><Clock3 aria-hidden="true" size={20} /></span><div><Heading level={2} variant="panel">Event timing</Heading><Text className="mt-1" variant="muted">Set the local date and time where your Event takes place.</Text></div></div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field id="event-date" label="Date" error={fieldErrors.eventDate}><Input id="event-date" type="date" value={form.eventDate} onChange={(input) => change('eventDate', input.target.value)} /></Field>
        <Field id="event-start-time" label="Start time" error={fieldErrors.startTime}><Input id="event-start-time" type="time" value={form.startTime} onChange={(input) => change('startTime', input.target.value)} /></Field>
        <div className="sm:col-span-2"><Field id="event-time-zone" label="Time zone" error={fieldErrors.timeZone}><Select id="event-time-zone" value={form.timeZone} options={zoneOptions} disabled={timeZones.length === 0} onChange={(value) => change('timeZone', value)} aria-label="Event time zone" /></Field>{zonesError && <Text className="mt-2" variant="error" role="alert">{zonesError}</Text>}</div>
      </div>
      <Text className="mt-5 rounded-lg bg-surface-muted p-3" variant="helper">Your Event time uses the selected Event location time zone. Future guest countdowns can calculate correctly in other countries without changing this value.</Text>
      {form.eventDate && form.startTime && form.timeZone && <Text className="mt-3" variant="body">Configured for <strong>{form.eventDate} at {form.startTime}</strong> in <strong>{form.timeZone}</strong>.</Text>}
      {saveError && <Text className="mt-4" variant="error" role="alert">{saveError}</Text>}
      <div className="mt-6 flex justify-end border-t border-border pt-4"><Button size="sm" type="button" disabled={!dirty || saving} onClick={() => void save()}><Save aria-hidden="true" size={15} />{saving ? 'Saving…' : 'Save changes'}</Button></div>
    </section>
    <RsvpSettings />
    </div>
  </WorkspaceSection>
}

function RsvpSettings() {
  const event = useEventWorkspace()
  const setEvent = useSetEventWorkspace()
  const [isOpen, setIsOpen] = useState(event.rsvpIsOpen)
  const [deadline, setDeadline] = useState(event.rsvpDeadline ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = isOpen !== event.rsvpIsOpen || deadline !== (event.rsvpDeadline ?? '')
  async function save() {
    setSaving(true); setError(null)
    try { setEvent(await updateEventRsvpSettings(event.id, { isOpen, deadline: deadline || null })) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save RSVP settings.') }
    finally { setSaving(false) }
  }
  return <section className="max-w-2xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-secondary-accent"><CalendarCheck2 aria-hidden="true" size={20} /></span><div><Heading level={2} variant="panel">RSVP responses</Heading><Text className="mt-1" variant="muted">Control whether guests may respond and optionally set a final local calendar date.</Text></div></div>
    <div className="mt-6 grid gap-5 sm:grid-cols-2">
      <Field id="rsvp-state" label="Responses"><Select id="rsvp-state" value={isOpen ? 'open' : 'closed'} options={[{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }]} onChange={(value) => setIsOpen(value === 'open')} /></Field>
      <Field id="rsvp-deadline" label="Deadline (optional)"><Input id="rsvp-deadline" type="date" value={deadline} onChange={(input) => setDeadline(input.target.value)} /></Field>
    </div>
    <Text className="mt-5 rounded-lg bg-surface-muted p-3" variant="helper">The deadline is valid through the selected day in {event.timeZone}. {event.rsvpIsOpen && !event.rsvpIsEffectivelyOpen ? 'Responses are currently closed because the deadline has expired.' : isOpen ? 'Responses will be open unless the deadline has expired.' : 'Responses are manually closed.'}</Text>
    {error && <Text className="mt-4" variant="error" role="alert">{error}</Text>}
    <div className="mt-6 flex justify-end border-t border-border pt-4"><Button size="sm" type="button" disabled={!dirty || saving} onClick={() => void save()}><Save aria-hidden="true" size={15} />{saving ? 'Saving…' : 'Save RSVP settings'}</Button></div>
  </section>
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error && <Text className="mt-1.5" variant="error">{error}</Text>}</div>
}
