import type { ReactNode } from 'react'
import { Heading } from '../../../components/ui/Heading'
import { Text } from '../../../components/ui/Text'

export function WorkspaceSection({ eyebrow, title, description, children, wide = false }: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`mx-auto w-full px-4 py-7 sm:px-6 sm:py-9 lg:px-8 ${wide ? 'max-w-[1680px]' : 'max-w-6xl'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <Heading className="mt-1.5" level={1} variant="page">{title}</Heading>
      <Text className="mt-1 max-w-2xl" variant="muted">{description}</Text>
      <div className="mt-7">{children}</div>
    </div>
  )
}
