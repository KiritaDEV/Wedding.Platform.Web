import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { editorDeviceCategory, useEditorDeviceCategory } from './responsiveViewport'

describe('Section semantic viewport boundaries', () => {
  it.each([[767, 'mobile'], [768, 'tablet'], [1279, 'tablet'], [1280, 'desktop']] as const)('%i resolves to %s', (width, viewport) => {
    expect(editorDeviceCategory(width)).toBe(viewport)
  })
})

function ViewportProbe() {
  return createElement('span', null, useEditorDeviceCategory())
}

describe('runtime viewport ownership', () => {
  it('uses a deterministic desktop fallback during server rendering', () => {
    expect(renderToStaticMarkup(createElement(ViewportProbe))).toBe('<span>desktop</span>')
  })
})
