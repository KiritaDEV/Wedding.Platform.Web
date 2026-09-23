import { useEffect, useMemo, useRef } from 'react'
import { collectRequiredFontIds } from '../websiteFonts/platformFonts'
import { ensureProjectFonts } from '../websiteFonts/fontLoader'
import { resolveSectionAppearanceForViewport } from '../websiteEditor/responsiveAppearance'
import { sectionCapability } from '../websiteCapabilities/lookup'
import { resolveSectionAppearance } from '../websiteEditor/sectionAppearance'
import { ClassicFilipinianaRenderer } from './templates/ClassicFilipinianaRenderer'
import { ModernEditorialRenderer } from './templates/ModernEditorialRenderer'
import type { WebsiteRendererProps } from './types'
import { WebsiteElementChangeContext } from './WebsiteElementChangeContext'
import { sectionsForAudience } from './audience'

const templateRenderers = {
  'classic-filipiniana-v1': ClassicFilipinianaRenderer,
  'modern-editorial-v1': ModernEditorialRenderer,
} as const

export function WebsiteRenderer(props: WebsiteRendererProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const Renderer = templateRenderers[props.website.templateKey as keyof typeof templateRenderers]
  const requiredFontIds = useMemo(() => collectRequiredFontIds(props.website), [props.website])
  const requiredFontSignature = requiredFontIds.sort().join('|')

  useEffect(() => {
    const documentTarget = rootRef.current?.ownerDocument
    if (documentTarget) ensureProjectFonts(documentTarget, requiredFontIds)
  }, [requiredFontSignature, requiredFontIds])

  useEffect(() => {
    if (props.mode !== 'editor' || props.scope?.kind === 'single-section' || !props.selectedSectionId) return
    const element = rootRef.current?.querySelector(`[data-preview-section="${CSS.escape(props.selectedSectionId)}"]`)
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [props.mode, props.scope, props.selectedSectionId])

  if (!Renderer) {
    return <div className="flex min-h-80 items-center justify-center bg-[#f7f0e6] p-8 text-center text-sm text-[#665d54]">This Template is not supported by this version of the renderer.</div>
  }

  const targetViewport = props.targetViewport ?? 'desktop'
  const website = {
    ...props.website,
    sections: sectionsForAudience(props.website.sections, props.audience).map((section) => {
      const capability = props.website.template ? sectionCapability(props.website.template.capabilities, section.type) : undefined
      const ownedAppearance = section.type === 'hero' || section.type === 'gallery' || section.type === 'blank'
        ? resolveSectionAppearance(section.appearance, targetViewport).appearance
        : section.appearance
      return {
        ...section,
        appearance: capability
          ? resolveSectionAppearanceForViewport(ownedAppearance, targetViewport, capability)
          : ownedAppearance,
      }
    }),
  }

  return <div ref={rootRef}><WebsiteElementChangeContext.Provider value={{ onGalleryAdd: props.onGalleryAdd, onElementChange: props.onElementChange, onTextDocumentChange: props.onTextDocumentChange, onAddColor: props.onAddColor }}><Renderer {...props} website={website as unknown as WebsiteRendererProps['website']} targetViewport={targetViewport} /></WebsiteElementChangeContext.Provider></div>
}
