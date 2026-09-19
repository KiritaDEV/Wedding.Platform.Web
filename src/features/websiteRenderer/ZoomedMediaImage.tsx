import { useEffect, useRef, useState } from 'react'
import { resolveBackgroundMediaGeometry, resolveMediaCropGeometry } from '../websiteElements/mediaCrop'

type Size = { width: number; height: number }

export function ZoomedMediaImage({ alt = '', allowZoomOut = false, className = '', fill = false, height, reference, src, width }: { alt?: string; allowZoomOut?: boolean; className?: string; fill?: boolean; height: number; reference: { focalPoint?: { x: number; y: number }; zoom?: number }; src: string; width: number }) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [container, setContainer] = useState<Size>({ width: 0, height: 0 })
  const point = reference.focalPoint ?? { x: 0.5, y: 0.5 }
  const zoom = reference.zoom ?? 1

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const measure = () => setContainer({ width: element.clientWidth, height: element.clientHeight })
    measure()
    // ResizeObserver reports fractional, untransformed layout dimensions. Integer
    // client sizes can leave a subpixel uncovered at a clamped crop edge.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainer({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const geometry = container.width && container.height ? (allowZoomOut ? resolveBackgroundMediaGeometry : resolveMediaCropGeometry)(container, { width, height }, point, zoom) : null

  return <span ref={containerRef} data-media-focal-x={geometry?.point.x ?? point.x} data-media-focal-y={geometry?.point.y ?? point.y} data-media-zoom={geometry?.zoom ?? zoom} data-background-minimum-zoom={allowZoomOut && geometry && 'minimumZoom' in geometry ? geometry.minimumZoom : undefined} className={`${fill ? 'absolute inset-0' : 'relative'} block overflow-hidden ${className}`}>
    <img className="invisible block h-full w-full object-cover" src={src} alt="" aria-hidden="true" />
    <img
      className={geometry ? 'absolute max-w-none' : 'absolute inset-0 h-full w-full object-cover object-center'}
      style={geometry ? { height: geometry.height, left: geometry.left, top: geometry.top, width: geometry.width } : undefined}
      src={src}
      alt={alt}
    />
  </span>
}
