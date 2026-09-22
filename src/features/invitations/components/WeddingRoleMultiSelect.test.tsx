import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WeddingRoleMultiSelect } from './WeddingRoleMultiSelect'

describe('WeddingRoleMultiSelect', () => {
  it('renders persisted and draft selections as independently removable chips', () => {
    const html = renderToStaticMarkup(<WeddingRoleMultiSelect
      catalog={[
        { id: 'best-man', key: 'best_man', name: 'Best Man', isBuiltin: true },
        { id: 'usher', key: null, name: 'Usher', isBuiltin: false },
      ]}
      draftRoles={[{ clientKey: 'reader', name: 'Reader' }]}
      selectedRoleIds={['best-man', 'usher']}
      selectedDraftKeys={['reader']}
      onChange={vi.fn()}
      onCreateDraftRole={vi.fn()}
    />)

    expect(html).toContain('Best Man')
    expect(html).toContain('Usher')
    expect(html).toContain('Reader')
    expect(html).toContain('aria-label="Remove Best Man"')
    expect(html).toContain('aria-label="Remove Usher"')
    expect(html).toContain('aria-label="Remove Reader"')
    expect(html.match(/Custom/g)).toHaveLength(2)
  })
})
