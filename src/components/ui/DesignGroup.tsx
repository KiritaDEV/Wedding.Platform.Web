export function DesignGroup({ icon, title, children, className = '' }: {
  icon?: React.ReactNode
  title: string
  children: React.ReactNode
  className?: string
}) {
  return <fieldset className={`mb-5 ${className}`}>
    <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">{icon}{title}</legend>
    {children}
  </fieldset>
}
