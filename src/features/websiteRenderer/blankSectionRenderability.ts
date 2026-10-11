import type { ResolvedWebsiteMedia, ResponsiveViewport, WebsiteSection } from '../websiteEditor/types'
import { resolveOwnedSectionAppearance } from '../websiteEditor/sectionAppearance'
import type { WebsiteElement } from '../websiteElements/types'
import { resolveSectionComposition } from '../websiteEditor/sectionComposition'
import { isElementRenderable } from './elementRenderability'
import { resolveBackgroundMediaForDevice } from '../websiteMedia/backgroundMedia'
import { textPlainText } from '../websiteElements/textDocument'

export function hasIntentionalSectionSurface(section: WebsiteSection, targetViewport: ResponsiveViewport = 'desktop'): boolean {
  const appearance = resolveOwnedSectionAppearance(section.appearance, targetViewport)
  if (appearance.backgroundTreatment !== 'inherit') return true
  const decorative = appearance.decorativeAppearance
  const background = decorative?.background
  return Boolean(
    background?.colorId
    || background?.customColor
    || (background?.texture && background.texture !== 'none')
    || (background?.pattern && background.pattern !== 'none')
    || (background?.overlay && background.overlay !== 'none')
    || (decorative?.frame?.style && decorative.frame.style !== 'none'),
  )
}

export function isHeroSectionRenderable(section: WebsiteSection, templateKey: string, media: Record<string, ResolvedWebsiteMedia>, eventDate: string | null, targetViewport: ResponsiveViewport = 'desktop'): boolean {
  if (section.type !== 'hero') return true
  const appearance = resolveOwnedSectionAppearance(section.appearance, targetViewport)
  const isRenderable = (element: WebsiteElement): boolean => element.type === 'compositionGroup'
    ? element.children.some(isRenderable)
    : element.type === 'text'
      ? textPlainText(element.document).length > 0
    : isElementRenderable(element, templateKey, 'public', media, eventDate)
  return resolveSectionComposition(section, targetViewport).composition.childFlow.elements.some(isRenderable)
    || Boolean(resolveBackgroundMediaForDevice(appearance.backgroundMedia, targetViewport)?.assetId)
    || hasIntentionalSectionSurface(section, targetViewport)
    || Boolean(appearance.height)
}

export function isBlankSectionRenderable(
  section: WebsiteSection,
  templateKey: string,
  media: Record<string, ResolvedWebsiteMedia>,
  eventDate: string | null,
  targetViewport: ResponsiveViewport = 'desktop',
): boolean {
  if (section.type !== 'blank') return true
  const flow = resolveSectionComposition(section, targetViewport).composition.childFlow
  const isRenderable = (element: WebsiteElement): boolean => element.type === 'compositionGroup'
    ? element.children.some(isRenderable)
    : isElementRenderable(element, templateKey, 'public', media, eventDate)
  return flow.elements.some(isRenderable)
    || hasIntentionalSectionSurface(section, targetViewport)
}

export function isGallerySectionRenderable(section: WebsiteSection, templateKey: string, media: Record<string, ResolvedWebsiteMedia>, eventDate: string | null, targetViewport: ResponsiveViewport = 'desktop'): boolean {
  if (section.type !== 'gallery') return true
  if (section.content.semantic.items.some(({ mediaId }) => Boolean(media[mediaId]))) return true
  const isRenderable = (element: WebsiteElement): boolean => element.isHidden
    ? false
    : element.type === 'compositionGroup'
    ? element.children.some(isRenderable)
    : element.type === 'text'
      ? textPlainText(element.document).trim().length > 0
      : isElementRenderable(element, templateKey, 'public', media, eventDate)
  return resolveSectionComposition(section, targetViewport).composition.childFlow.elements.some(isRenderable)
}
