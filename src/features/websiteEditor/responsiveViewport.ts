import { useEffect, useState } from 'react'
import type { ResponsiveViewport } from './types'

const TABLET_MIN_WIDTH = 768
const DESKTOP_MIN_WIDTH = 1280

export const EDITOR_DEVICE_VIEWPORTS: Record<ResponsiveViewport, Readonly<{ width: number; height: number }>> = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
}

export const PREVIEW_WIDTHS: Record<Exclude<ResponsiveViewport, 'desktop'>, number> = {
  tablet: EDITOR_DEVICE_VIEWPORTS.tablet.width,
  mobile: EDITOR_DEVICE_VIEWPORTS.mobile.width,
}

export function editorDeviceCategory(width: number): ResponsiveViewport {
  if (width >= DESKTOP_MIN_WIDTH) return 'desktop'
  if (width >= TABLET_MIN_WIDTH) return 'tablet'
  return 'mobile'
}

export function accessiblePreviewViewports(category: ResponsiveViewport): ResponsiveViewport[] {
  if (category === 'desktop') return ['desktop', 'tablet', 'mobile']
  if (category === 'tablet') return ['tablet', 'mobile']
  return ['mobile']
}

export function useEditorDeviceCategory(): ResponsiveViewport {
  const [category, setCategory] = useState<ResponsiveViewport>(() => typeof window === 'undefined' ? 'desktop' : editorDeviceCategory(window.innerWidth))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setCategory(editorDeviceCategory(window.innerWidth))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return category
}
