type TextVariant = 'body' | 'muted' | 'helper' | 'caption' | 'error'
type TextElement = 'p' | 'span' | 'div'

export type TextProps = React.HTMLAttributes<HTMLElement> & {
  variant?: TextVariant
  as?: TextElement
}

const variants: Record<TextVariant, string> = {
  body: 'text-sm',
  muted: 'text-sm text-foreground-muted',
  helper: 'text-xs text-foreground-muted',
  caption: 'text-[11px] text-foreground-muted',
  error: 'text-sm text-danger',
}

export function Text({ variant = 'body', as: Component = 'p', className = '', ...props }: TextProps) {
  return <Component className={`${variants[variant]} ${className}`} {...props} />
}
