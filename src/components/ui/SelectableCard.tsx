import { forwardRef } from 'react'

export type SelectableCardProps = Omit<React.ComponentProps<'button'>, 'aria-pressed'> & {
  selected: boolean
}

export const SelectableCard = forwardRef<HTMLButtonElement, SelectableCardProps>(function SelectableCard({ selected, className = '', type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} aria-pressed={selected} data-selected={selected} className={`cursor-pointer rounded-xl border text-left transition-colors xl:rounded-md ${selected ? 'border-2 border-accent' : 'border-border hover:bg-surface-muted'} ${className}`} {...props} />
})
