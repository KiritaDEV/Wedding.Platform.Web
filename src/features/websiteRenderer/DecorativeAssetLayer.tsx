import { DECORATIVE_CORNER_PLACEMENTS, getDecorativeAssetStyle, getDecorativeCssFrameStyle, resolveDecorativeCornerSize } from './decorativeExecution'
import type { ResolvedDecorativeExecution } from './templateDecorativeAssets'

export function DecorativeAssetLayer({ decoration, className = '', cornerSizeOverride }: { decoration: ResolvedDecorativeExecution; className?: string; cornerSizeOverride?: string }) {
  if (decoration.type === 'cssFrame') return <span aria-hidden="true" className={`pointer-events-none absolute ${className}`} style={getDecorativeCssFrameStyle(decoration.execution, decoration.tint)} />
  if (decoration.execution.position === 'fourCorners') {
    const baseStyle = getDecorativeAssetStyle(decoration)
    const cornerSize = cornerSizeOverride ?? resolveDecorativeCornerSize(decoration.execution)
    return <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>{DECORATIVE_CORNER_PLACEMENTS.map(({ key, style }) => <span key={key} className="absolute" style={{ ...baseStyle, ...style, width: cornerSize, aspectRatio: '1', backgroundSize: 'contain', maskSize: 'contain', WebkitMaskSize: 'contain' }} />)}</span>
  }
  return <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} style={getDecorativeAssetStyle(decoration)} />
}
