import type { CSSProperties } from 'react'
import { getTemplateAsset } from '../assets'

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

export function ClassicFoundationOrnament({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block h-6 w-36 bg-[var(--cf-accent)] ${className}`} style={mask(foundation.src)} />
}

export function ClassicBotanicalSprig({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block bg-[var(--cf-secondary)] opacity-55 ${className}`} style={mask(sprig.src)} />
}
