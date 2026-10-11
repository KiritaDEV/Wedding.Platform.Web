import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { InvitationFormDialog } from './InvitationFormDialog'

describe('InvitationFormDialog shell', () => {
  it('uses the shared contained full-screen-capable Dialog with stable regions', () => {
    const html = renderToStaticMarkup(<InvitationFormDialog open={false} eventId="event" mode="create" onClose={vi.fn()} />)
    expect(html).toContain('data-mobile-full-screen="true"')
    expect(html).toContain('New invitation')
    expect(html).toContain('overflow-y-auto')
    expect(html).toContain('Create invitation')
    expect(html).toContain('Add Guest')
    expect(html).toContain('Guest 1')
    expect(html).toContain('Guest / Other')
    expect(html).toContain('Unspecified')
  })

  it('renders the same architecture in edit mode', () => {
    const html = renderToStaticMarkup(<InvitationFormDialog open={false} eventId="event" invitationId="invitation" mode="edit" onClose={vi.fn()} />)
    expect(html).toContain('Edit invitation')
    expect(html).toContain('Save changes')
    expect(html).not.toContain('Move Guest')
  })
})
