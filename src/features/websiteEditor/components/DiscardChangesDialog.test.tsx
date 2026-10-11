import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DiscardChangesDialog } from './DiscardChangesDialog'

describe('DiscardChangesDialog', () => {
  it('offers an explicit save path for guarded composition switching', () => {
    const markup = renderToStaticMarkup(
      <DiscardChangesDialog open onCancel={() => undefined} onDiscard={() => undefined} onSave={() => undefined} />,
    )
    expect(markup).toContain('Save changes')
    expect(markup).toContain('Discard')
    expect(markup).toContain('Cancel')
  })

  it('disables every transition action while saving', () => {
    const markup = renderToStaticMarkup(
      <DiscardChangesDialog open saving onCancel={() => undefined} onDiscard={() => undefined} onSave={() => undefined} />,
    )
    expect(markup.match(/disabled=""/g)).toHaveLength(3)
    expect(markup).toContain('Saving...')
  })
})
