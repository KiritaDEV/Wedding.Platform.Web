import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { IconButton } from '../../../components/ui/IconButton'
import { ZoomedMediaImage } from '../../websiteRenderer/ZoomedMediaImage'
import { calculateBackgroundMinimumZoom, clampBackgroundZoom, clampMediaPoint, clampMediaZoom, resolveBackgroundMediaGeometry, resolveContainedMediaGeometry, resolveMediaAspectRatio, resolveMediaCropGeometry, resolveSourcePointFromViewport, resolveSourcePointInViewport, type MediaAspectRatio } from '../../websiteElements/mediaCrop'
import { resetImageFraming } from './resetImageFraming'

type ImageFraming = { point: { x: number; y: number }; zoom: number }

export function FocalPointEditor({ url, point, zoom = 1, controlId = "image-framing", aspectRatio = "natural", previewAspectRatio, fit = "cover", sourceWidth = 1, sourceHeight = 1, allowZoomOut = false, minimumZoom: measuredMinimumZoom, onChange, onPointChange, onZoomChange, showReset = true, className = "", helpText, helpClassName = "", previewClassName = "", previewStyle, controlsClassName = "", controlButtonClassName = "", controlsHeading, controlsFooter }: { url: string; point: { x: number; y: number }; zoom?: number; controlId?: string; aspectRatio?: MediaAspectRatio; previewAspectRatio?: string; fit?: "cover" | "contain"; sourceWidth?: number; sourceHeight?: number; allowZoomOut?: boolean; minimumZoom?: number; onChange: (framing: ImageFraming) => void; onPointChange?: (point: ImageFraming["point"]) => void; onZoomChange?: (zoom: number) => void; showReset?: boolean; className?: string; helpText?: string; helpClassName?: string; previewClassName?: string; previewStyle?: React.CSSProperties; controlsClassName?: string; controlButtonClassName?: string; controlsHeading?: React.ReactNode; controlsFooter?: React.ReactNode }) {
  const draggingPointer = useRef<number | null>(null)
  const previewRef = useRef<HTMLButtonElement>(null)
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 })
  useEffect(() => { const element = previewRef.current; if (!element) return; const measure = () => setPreviewSize({ width: element.clientWidth, height: element.clientHeight }); measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect(); }, [])
  const minimumZoom = allowZoomOut ? measuredMinimumZoom ?? calculateBackgroundMinimumZoom(previewSize, { width: sourceWidth, height: sourceHeight }) : 1
  const disabled = fit === "contain"
  const effectiveZoom = Math.max(minimumZoom, zoom)
  const clampZoom = (value: number) => allowZoomOut ? clampBackgroundZoom(value, minimumZoom) : clampMediaZoom(value)
  const source = { width: sourceWidth, height: sourceHeight }
  const imageRect = fit === "contain"
    ? resolveContainedMediaGeometry(previewSize, source)
    : allowZoomOut
      ? resolveBackgroundMediaGeometry(previewSize, source, point, effectiveZoom)
      : resolveMediaCropGeometry(previewSize, source, point, effectiveZoom)
  const markerPosition = resolveSourcePointInViewport(imageRect, point)
  const choose = (element: HTMLElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect()
    const scaleX = previewSize.width / rect.width
    const scaleY = previewSize.height / rect.height
    const next = resolveSourcePointFromViewport(imageRect, { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY });
    if (onPointChange) onPointChange(next); else onChange({ point: next, zoom: clampZoom(zoom) })
  }
  return <div className={className}>
    <p className={`mb-2 text-xs text-foreground-muted ${helpClassName}`}>{disabled ? "Crop controls apply to Cover. Your focal point and zoom are preserved." : (helpText ?? "Click or tap to position the focal point, or drag the marker to fine-tune it.")}</p>
    <button ref={previewRef} className={`relative block w-full overflow-hidden rounded-lg bg-surface-muted ${previewClassName}`} style={{ ...previewStyle, aspectRatio: previewAspectRatio ?? resolveMediaAspectRatio(aspectRatio, { width: sourceWidth, height: sourceHeight }) }} type="button" disabled={disabled} onPointerDown={(event) => {
      const marker = (event.target as HTMLElement).closest('[data-focal-marker]')
      if (marker) {
        event.preventDefault()
        event.stopPropagation()
        draggingPointer.current = event.pointerId
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        choose(event.currentTarget, event.clientX, event.clientY)
      }
    }} onPointerMove={(event) => {
      if (draggingPointer.current !== event.pointerId) return
      event.preventDefault()
      event.stopPropagation()
      choose(event.currentTarget, event.clientX, event.clientY)
    }} onPointerUp={(event) => {
      if (draggingPointer.current !== event.pointerId) return
      event.preventDefault()
      event.stopPropagation()
      draggingPointer.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    }} onPointerCancel={(event) => {
      if (draggingPointer.current !== event.pointerId) return
      draggingPointer.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    }} onKeyDown={(event) => {
      const delta = event.shiftKey ? 0.1 : 0.025
      const next = { ...point }
      if (event.key === 'ArrowLeft') next.x -= delta; else if (event.key === 'ArrowRight') next.x += delta; else if (event.key === 'ArrowUp') next.y -= delta; else if (event.key === 'ArrowDown') next.y += delta; else return
      event.preventDefault(); const clamped = clampMediaPoint(next); if (onPointChange) onPointChange(clamped); else onChange({ point: clamped, zoom: clampZoom(zoom) })
    }} aria-label="Choose image focal point with pointer or arrow keys">
      {fit === "contain" ? <img className="block h-full w-full object-contain" src={url} alt="" /> : <ZoomedMediaImage allowZoomOut={allowZoomOut} className="h-full w-full" src={url} width={sourceWidth} height={sourceHeight} reference={{ focalPoint: point, zoom }} alt="" />}
      <span className="absolute grid size-11 touch-none -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center active:cursor-grabbing" data-focal-marker style={{ left: markerPosition.x, top: markerPosition.y }}>
        <span className="size-5 rounded-full border-2 border-white bg-accent shadow" />
      </span>
    </button>
    <div className={`mt-4 ${controlsClassName}`}>
      {controlsHeading && <div className="mb-3">{controlsHeading}</div>}
      <div className="flex items-center justify-between gap-3"><label className="text-sm font-medium" htmlFor={`${controlId}-zoom`}>Zoom</label><span className="text-xs tabular-nums text-foreground-muted">{effectiveZoom.toFixed(effectiveZoom < 1 ? 2 : 1)}×</span></div>
      <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <IconButton className={controlButtonClassName} type="button" size="sm" aria-label="Zoom out" disabled={disabled || effectiveZoom <= minimumZoom} onClick={() => { const next = clampZoom(effectiveZoom - 0.1); if (onZoomChange) onZoomChange(next); else onChange({ point, zoom: next }); }}><Minus size={16} /></IconButton>
        <input id={`${controlId}-zoom`} className="w-full cursor-pointer accent-accent" type="range" min={minimumZoom} max="3" step={allowZoomOut ? .01 : .1} value={effectiveZoom} disabled={disabled} onChange={(event) => { const next = clampZoom(Number(event.target.value)); if (onZoomChange) onZoomChange(next); else onChange({ point, zoom: next }); }} />
        <IconButton className={controlButtonClassName} type="button" size="sm" aria-label="Zoom in" disabled={disabled || effectiveZoom >= 3} onClick={() => { const next = clampZoom(effectiveZoom + 0.1); if (onZoomChange) onZoomChange(next); else onChange({ point, zoom: next }); }}><Plus size={16} /></IconButton>
      </div>
      {controlsFooter && <div className="mt-3">{controlsFooter}</div>}
    </div>
    {showReset && <Button className="mt-2" type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onChange(resetImageFraming())}>Reset image</Button>}
  </div>
}
