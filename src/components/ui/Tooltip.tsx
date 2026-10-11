import { useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)

  function show() {
    const bounds = rootRef.current?.getBoundingClientRect()
    if (bounds) setPosition({ left: bounds.right + 8, top: bounds.top + bounds.height / 2 })
  }

  return (
    <span
      ref={rootRef}
      className="block"
      onMouseEnter={show}
      onMouseLeave={() => setPosition(null)}
      onFocusCapture={show}
      onBlurCapture={() => setPosition(null)}
    >
      {children}
      {position && createPortal(
        <span
          className="pointer-events-none fixed z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground shadow-[var(--shadow-dialog)] lg:block"
          style={position}
          aria-hidden="true"
          role="tooltip"
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  )
}
