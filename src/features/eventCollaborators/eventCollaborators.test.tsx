import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { EventSettingsPage } from '../../pages/workspace/EventSettingsPage'
import { EventWorkspaceContext } from '../events/workspace/EventWorkspaceContext'
import type { EventDetail } from '../events/types'
import { addCollaborator, getCollaborators, removeCollaborator } from './api'
import { apiRequest, ensureCsrfCookie } from '../../lib/api'

vi.mock('../../lib/api', async (original) => ({ ...await original<typeof import('../../lib/api')>(), apiRequest: vi.fn(), ensureCsrfCookie: vi.fn() }))

it.each(['owner', 'admin', null] as const)('Settings exposes collaborator administration only to Owner (%s)', (role) => {
  const event = { id: 'event-a', membershipRole: role, timeZone: 'Asia/Manila', eventDate: null, startTime: null, rsvpDeadline: null, rsvpIsOpen: false } as EventDetail
  const html = renderToStaticMarkup(<EventWorkspaceContext.Provider value={{ event, setEvent: vi.fn() }}><EventSettingsPage /></EventWorkspaceContext.Provider>)
  expect(html.includes('Collaborators')).toBe(role === 'owner')
  expect(html).toContain('Event timing')
  expect(html).toContain('RSVP responses')
})

it('API adapter sends normalized email only and scopes membership removal to its Event', async () => {
  const member = { id: 'membership/a', name: 'Partner', email: 'partner@example.com', role: 'admin' }
  vi.mocked(apiRequest).mockResolvedValueOnce({ data: member }).mockResolvedValueOnce(undefined).mockResolvedValueOnce({ data: [member] })
  expect(await addCollaborator('event/a', ' PARTNER@EXAMPLE.COM ')).toEqual(member)
  expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/events/event%2Fa/collaborators', { method: 'POST', body: { email: 'partner@example.com' } })
  await removeCollaborator('event/a', member.id)
  expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/events/event%2Fa/collaborators/membership%2Fa', { method: 'DELETE' })
  expect(ensureCsrfCookie).toHaveBeenCalledTimes(2)
  expect(await getCollaborators('event/a')).toEqual([member])
})

it('rejects malformed collaborator responses', async () => {
  vi.mocked(apiRequest).mockResolvedValueOnce({ data: [{ id: 'a', name: 'Partner', email: 'x@example.com', role: 'owner-imposter' }] })
  await expect(getCollaborators('event-a')).rejects.toThrow()
})
