import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DecorativeAssetLayer } from './DecorativeAssetLayer'
import { resolveDecorativeExecution } from './templateDecorativeAssets'

describe('four-corner decorative asset execution', () => {
  it('keeps all reflected corners inside one zero-inset Section frame host', () => {
    const decoration = resolveDecorativeExecution('classic-filipiniana-v1', 'frame', 'ornamental', 'desktop')
    expect(decoration?.type).toBe('asset')
    if (!decoration) return

    const markup = renderToStaticMarkup(<DecorativeAssetLayer decoration={decoration} className="z-[20]" />)
    expect(markup).toMatch(/^<span[^>]*class="pointer-events-none absolute inset-0 z-\[20\]"/)
    expect(markup.match(/width:min\(50%, clamp\(48px, 8vw, 112px\)\);aspect-ratio:1/g)).toHaveLength(4)
    expect(markup).toContain('top:0;left:0;transform:none;transform-origin:center')
    expect(markup).toContain('top:0;right:0;transform:scaleX(-1);transform-origin:center')
    expect(markup).toContain('right:0;bottom:0;transform:scale(-1, -1);transform-origin:center')
    expect(markup).toContain('bottom:0;left:0;transform:scaleY(-1);transform-origin:center')
  })
})
