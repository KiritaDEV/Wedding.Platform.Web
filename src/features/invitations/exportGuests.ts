import { listInvitations } from './api'
import type { InvitationListQuery } from './types'

function csvRow(values: string[]) {
  return values.map(value => {
    const safe = /^[\t\r\n]|^\s*[=+@-]/.test(value) ? "'" + value : value
    return '"' + safe.replaceAll('"', '""') + '"'
  }).join(',')
}

export async function guestListCsv(eventId: string, query: InvitationListQuery) {
  const rows = [csvRow(['Invitation', 'Invitation status', 'First name', 'Last name', 'Guest status', 'RSVP'])]
  let page = 1
  while (true) {
    const result = await listInvitations(eventId, { ...query, page })
    for (const invitation of result.data) {
      for (const guest of invitation.guests) {
        rows.push(csvRow([invitation.effectiveName, invitation.status, guest.firstName, guest.lastName ?? '', guest.status, guest.rsvpStatus]))
      }
    }
    if (page >= result.meta.pagination.lastPage) break
    page += 1
  }
  return '\uFEFF' + rows.join('\r\n') + '\r\n'
}
