import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { createSemanticId } from '../createSemanticId'
import type { ResolvedSchedule } from '../sharedContent'
import { scheduleContentSchema, type ScheduleActivity, type ScheduleDay } from '../../websiteElements/scheduleContent'
const newActivity = (): ScheduleActivity => ({ id: createSemanticId('schedule-activity'), title: null, startTime: null, endTime: null, description: null, location: null, mapUrl: null, imageMediaId: null, visible: true })
export function ScheduleElementEditor({ element, onChange }: { element: ResolvedSchedule; onChange: (element: ResolvedSchedule) => void }) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const change = (days: ScheduleDay[]) => onChange({ ...element, days })
  const updateDay = (id: string, update: Partial<ScheduleDay>) => change(element.days.map((day) => day.id === id ? { ...day, ...update } : day))
  const updateActivity = (day: ScheduleDay, id: string, update: Partial<ScheduleActivity>) => updateDay(day.id, { activities: day.activities.map((activity) => activity.id === id ? { ...activity, ...update } : activity) })
  const move = <T,>(values: T[], index: number, offset: -1 | 1): T[] => { const next = [...values]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next }
  const removeDay = (id: string) => { change(element.days.filter((day) => day.id !== id)); setDeletingId(null) }
  const result = scheduleContentSchema.safeParse({ days: element.days })
  const count = element.days.reduce((total, day) => total + day.activities.length, 0)
  return <div className="space-y-4" data-schedule-element-editor>
    <h3 className="text-sm font-semibold">Schedule</h3>
    {!result.success && <div role="alert" className="text-sm text-destructive">{result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' ')} Correct these fields before saving.</div>}
    {element.days.map((day, di) => <fieldset key={day.id} className="space-y-2 rounded-md border border-border p-3">
      <legend className="text-sm font-semibold">Day {di + 1}</legend>
      <Input aria-label={`Day ${di + 1} title`} placeholder="Day title" value={day.title ?? ''} onChange={(event) => updateDay(day.id, { title: event.target.value })} />
      <Input aria-label={`Day ${di + 1} date`} placeholder="YYYY-MM-DD" value={day.date ?? ''} onChange={(event) => updateDay(day.id, { date: event.target.value })} />
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={day.visible} onChange={(event) => updateDay(day.id, { visible: event.target.checked })} />Show Day {di + 1}</label>
      <div className="flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="secondary" disabled={!di} onClick={() => change(move(element.days, di, -1))}>Day up</Button>
        <Button type="button" size="sm" variant="secondary" disabled={di === element.days.length - 1} onClick={() => change(move(element.days, di, 1))}>Day down</Button>
        <Button type="button" size="sm" variant="secondary" disabled={element.days.length >= 20 || count + day.activities.length > 100} onClick={() => change([...element.days.slice(0, di + 1), { ...structuredClone(day), id: createSemanticId('schedule-day'), activities: day.activities.map((activity) => ({ ...activity, id: createSemanticId('schedule-activity') })) }, ...element.days.slice(di + 1)])}>Duplicate Day</Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => day.activities.length ? setDeletingId(day.id) : removeDay(day.id)}>Delete Day</Button>
      </div>
      {deletingId === day.id && <div role="alert" className="space-y-2 text-sm">Delete this Day and all its Activities?<div className="flex gap-2"><Button type="button" size="sm" onClick={() => removeDay(day.id)}>Confirm delete Day</Button><Button type="button" size="sm" variant="secondary" onClick={() => setDeletingId(null)}>Cancel</Button></div></div>}
      {day.activities.map((activity, ai) => <fieldset key={activity.id} className="space-y-2 rounded border border-border p-2">
        <legend className="text-sm">Activity {ai + 1}</legend>
        {(['title', 'startTime', 'endTime', 'location', 'mapUrl'] as const).map((field) => <Input key={field} aria-label={`Day ${di + 1} Activity ${ai + 1} ${field}`} placeholder={{ title: 'Title', startTime: 'Start HH:mm', endTime: 'End HH:mm', location: 'Location', mapUrl: 'Map URL' }[field]} value={activity[field] ?? ''} onChange={(event) => updateActivity(day, activity.id, { [field]: event.target.value })} />)}
        <textarea aria-label={`Day ${di + 1} Activity ${ai + 1} description`} className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm" value={activity.description ?? ''} onChange={(event) => updateActivity(day, activity.id, { description: event.target.value })} />
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={activity.visible} onChange={(event) => updateActivity(day, activity.id, { visible: event.target.checked })} />Show Activity {ai + 1}</label>
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="secondary" disabled={!ai} onClick={() => updateDay(day.id, { activities: move(day.activities, ai, -1) })}>Activity up</Button>
          <Button type="button" size="sm" variant="secondary" disabled={ai === day.activities.length - 1} onClick={() => updateDay(day.id, { activities: move(day.activities, ai, 1) })}>Activity down</Button>
          <Button type="button" size="sm" variant="secondary" disabled={count >= 100} onClick={() => updateDay(day.id, { activities: [...day.activities.slice(0, ai + 1), { ...activity, id: createSemanticId('schedule-activity') }, ...day.activities.slice(ai + 1)] })}>Duplicate Activity</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => updateDay(day.id, { activities: day.activities.filter(({ id }) => id !== activity.id) })}>Delete Activity</Button>
        </div>
        <label className="block text-sm">Move Activity to Day<select aria-label={`Move Day ${di + 1} Activity ${ai + 1} to Day`} className="ml-2 rounded border border-border bg-background p-1" value={day.id} onChange={(event) => change(element.days.map((target) => target.id === day.id ? { ...target, activities: target.activities.filter(({ id }) => id !== activity.id) } : target.id === event.target.value ? { ...target, activities: [...target.activities, activity] } : target))}>{element.days.map((target, index) => <option key={target.id} value={target.id}>{target.title?.trim() || `Day ${index + 1}`}</option>)}</select></label>
      </fieldset>)}
      <Button type="button" size="sm" variant="secondary" disabled={count >= 100} onClick={() => updateDay(day.id, { activities: [...day.activities, newActivity()] })}>Add Activity</Button>
    </fieldset>)}
    <Button type="button" size="sm" variant="secondary" disabled={element.days.length >= 20} onClick={() => change([...element.days, { id: createSemanticId('schedule-day'), date: null, title: null, visible: true, activities: [] }])}>Add Day</Button>
  </div>
}
