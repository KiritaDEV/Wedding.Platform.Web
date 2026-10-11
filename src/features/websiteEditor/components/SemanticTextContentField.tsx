import { Input } from '../../../components/ui/Input'
import { Textarea } from '../../../components/ui/Textarea'

export function SemanticTextContentField({ id, label, value, onChange, multiline = false, hidden = false, hideLabel = false, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; multiline?: boolean; hidden?: boolean; hideLabel?: boolean; placeholder?: string }) {
  const Control = multiline ? Textarea : Input
  return <div>
    <div className={hideLabel ? 'sr-only' : 'mb-1.5 flex items-center justify-between gap-2'}>
      <label className="text-xs font-medium" htmlFor={id}>{label}</label>
      {!hideLabel && hidden && <span className="text-[10px] font-medium text-foreground-muted">Hidden</span>}
    </div>
    <Control id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>
}
