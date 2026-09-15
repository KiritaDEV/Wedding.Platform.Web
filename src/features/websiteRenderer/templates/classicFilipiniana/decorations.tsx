import type { CSSProperties } from 'react'
import { getTemplateAsset } from '../assets'

const divider = getTemplateAsset('classic-filipiniana-v1', 'section-divider')
const sprig = getTemplateAsset('classic-filipiniana-v1', 'botanical-sprig')
const foundation = getTemplateAsset('classic-filipiniana-v1', 'foundation-ornament')

function mask(src: string): CSSProperties {
  return {
    maskImage: `url(${src})`,
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    maskSize: 'contain',
  }
}

export function ClassicSectionDivider() {
  return <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 z-[1] h-7 w-40 -translate-x-1/2 -translate-y-1/2 bg-[var(--cf-border)] opacity-55 sm:h-8 sm:w-64" style={mask(divider.src)} />
}

export function ClassicFoundationOrnament({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block h-6 w-36 bg-[var(--cf-accent)] ${className}`} style={mask(foundation.src)} />
}

export function ClassicBotanicalSprig({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block bg-[var(--cf-secondary)] opacity-55 ${className}`} style={mask(sprig.src)} />
}
