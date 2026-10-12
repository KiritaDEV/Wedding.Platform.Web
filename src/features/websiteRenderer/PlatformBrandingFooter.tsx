import type { RenderableWebsite } from '../websiteEditor/types'
import { resolveClassicFilipinianaDesign } from './templates/classicFilipiniana/design'
import { resolveModernEditorialDesign } from './templates/modernEditorial/design'

/** Platform presentation only: never part of the authored section tree. */
export function PlatformBrandingFooter({ website }: { website: RenderableWebsite }) {
  const classic = website.templateKey === 'classic-filipiniana-v1'
  const prefix = classic ? 'cf' : 'me'
  const design = classic
    ? resolveClassicFilipinianaDesign(website.designSettings)
    : resolveModernEditorialDesign(website.designSettings)

  return (
    <footer
      data-platform-branding="kirita"
      aria-label="Platform branding"
      className="w-full px-4 py-4 text-center text-xs leading-relaxed"
      style={{
        ...design,
        backgroundImage: 'none',
        backgroundColor: '#000',
        color: '#d4d4d4',
        fontFamily: `var(--${prefix}-body-font)`,
      }}
    >
      <p className="flex flex-wrap items-center justify-center">
        <span>Powered by</span>
        <img src={`${import.meta.env.BASE_URL}branding/kirita-orange.png`} alt="Kirita" width={108} height={36} className="-ml-2 block h-auto w-[108px] max-w-full" />
      </p>
    </footer>
  )
}
