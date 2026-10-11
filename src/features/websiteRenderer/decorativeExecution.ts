import type { CSSProperties } from 'react'
import type { DecorativeAssetExecution, DecorativeCssFrameExecution, ResolvedDecorativeAsset } from './templateDecorativeAssets'

const sizeValues: Record<NonNullable<DecorativeAssetExecution['size']>, string> = { auto: 'auto', cover: 'cover', contain: 'contain', tileSmall: '96px', tileMedium: '192px', tileLarge: '320px', fullFrame: 'contain', corners: 'clamp(48px, 8vw, 112px)' }
const positionValues = { center: 'center', top: 'top', bottom: 'bottom', left: 'left', right: 'right' } as const

export function resolveDecorativeStrengthOpacity(strength: NonNullable<DecorativeAssetExecution['strength']>, authoredStrength?: number): number {
  const normalized = Math.min(100, Math.max(10, authoredStrength ?? strength.default))
  return strength.minOpacity + ((normalized - 10) / 90) * (strength.maxOpacity - strength.minOpacity)
}

export function getDecorativeAssetStyle(asset: ResolvedDecorativeAsset): CSSProperties {
  const { execution, source, tint } = asset
  const repeat = execution.repeat ? `${execution.repeat.x ? 'repeat' : 'no-repeat'} ${execution.repeat.y ? 'repeat' : 'no-repeat'}` : 'no-repeat'
  const position = execution.position && execution.position !== 'fourCorners' ? positionValues[execution.position] : 'center'
  const common: CSSProperties = { opacity: execution.opacity ?? 1, mixBlendMode: execution.blendMode ?? 'normal', backgroundRepeat: repeat, backgroundSize: sizeValues[execution.size ?? 'auto'], backgroundPosition: position }
  if (execution.renderMode === 'image') return { ...common, backgroundImage: `url("${source}")` }
  return { ...common, backgroundColor: tint ?? 'currentColor', maskImage: `url("${source}")`, WebkitMaskImage: `url("${source}")`, maskRepeat: repeat, WebkitMaskRepeat: repeat, maskSize: common.backgroundSize, WebkitMaskSize: common.backgroundSize, maskPosition: position, WebkitMaskPosition: position }
}

export function getDecorativeCssFrameStyle(execution: DecorativeCssFrameExecution, tint: string): CSSProperties {
  return { inset: execution.inset === 'small' ? '12px' : '20px', borderStyle: 'solid', borderWidth: `${execution.baseThicknessPx}px`, borderColor: tint, opacity: execution.opacity }
}

export function resolveDecorativeCornerSize(execution: DecorativeAssetExecution): string {
  const base = execution.cornerBaseSize
  if (!base) return sizeValues[execution.size ?? 'auto']
  return `min(50%, clamp(${base.minimumPx}px, ${base.fluidVw}vw, ${base.maximumPx}px))`
}

export const DECORATIVE_CORNER_PLACEMENTS = [
  { key: 'top-left', style: { top: 0, left: 0, transform: 'none', transformOrigin: 'center' } },
  { key: 'top-right', style: { top: 0, right: 0, transform: 'scaleX(-1)', transformOrigin: 'center' } },
  { key: 'bottom-right', style: { right: 0, bottom: 0, transform: 'scale(-1, -1)', transformOrigin: 'center' } },
  { key: 'bottom-left', style: { bottom: 0, left: 0, transform: 'scaleY(-1)', transformOrigin: 'center' } },
] as const
