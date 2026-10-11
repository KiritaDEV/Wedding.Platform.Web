import { Check, X } from 'lucide-react'
import { useEffectEvent, useLayoutEffect, useRef, type CSSProperties, type ClipboardEvent, type FormEvent, type ReactNode } from 'react'
import { normalizeTextContent } from '../../websiteElements/text'
import { useInlineEdit } from './InlineEditContext'
import { advanceInlineEditLifecycle, type InlineEditLifecycle } from './inlineEditLifecycle'
import { inlineTargetKey, type InlineEditingTarget, type InlineFieldPath } from './types'

type Props = {
  sectionId: string
  path: InlineFieldPath
  value: string
  fallback?: string
  showFallbackInEditor?: boolean
  placeholder: string
  label: string
  multiline?: boolean
  className?: string
  elementId?: string
  compact?: boolean
  inputStyle?: CSSProperties
  renderValue?: (value: string) => ReactNode
}

export function EditableText(props: Props) {
  const editor = useInlineEdit()
  const target: InlineEditingTarget = props.elementId
      ? { sectionId: props.sectionId, elementId: props.elementId, path: props.path, label: props.label, multiline: props.multiline }
    : { sectionId: props.sectionId, path: props.path, label: props.label, multiline: props.multiline }
  const active = editor?.activeTarget && inlineTargetKey(editor.activeTarget) === inlineTargetKey(target)
  const entryValueRef = useRef(props.value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const compactEditorRef = useRef<HTMLSpanElement>(null)
  const activeKey = active ? inlineTargetKey(target) : null
  const lifecycleRef = useRef<InlineEditLifecycle>({ activeKey: null, entryValue: props.value })
  const currentValue = useEffectEvent(() => props.value)

  useLayoutEffect(() => {
    const transition = advanceInlineEditLifecycle(lifecycleRef.current, activeKey, currentValue())
    lifecycleRef.current = transition.lifecycle
    if (!transition.began) return
    entryValueRef.current = transition.lifecycle.entryValue
    const control = props.compact ? compactEditorRef.current : inputRef.current
    if (props.compact && compactEditorRef.current) compactEditorRef.current.textContent = transition.lifecycle.entryValue
    control?.focus()
  }, [activeKey, props.compact])

  if (!editor) {
    const display = props.value.trim() || props.fallback || null
    if (props.className) return <span className={`${props.multiline ? 'whitespace-pre-line ' : ''}${props.className}`}>{display}</span>
    return props.multiline ? <span className="whitespace-pre-line">{display}</span> : <>{display}</>
  }

  function cancel() {
    editor?.updateValue(target, entryValueRef.current)
    editor?.finishEdit()
  }
  function done() { editor?.finishEdit() }
  function change(value: string) { editor?.updateValue(target, value) }
  function compactInput(event: FormEvent<HTMLSpanElement>) {
    const value = normalizeTextContent(event.currentTarget.textContent ?? '')
    if (event.currentTarget.textContent !== value) event.currentTarget.textContent = value
    change(value)
  }
  function compactPaste(event: ClipboardEvent<HTMLSpanElement>) {
    event.preventDefault()
    const value = normalizeTextContent(event.clipboardData.getData('text/plain'))
    const selection = event.currentTarget.ownerDocument.getSelection()
    if (!selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (!event.currentTarget.contains(range.commonAncestorContainer)) return
    range.deleteContents()
    const text = event.currentTarget.ownerDocument.createTextNode(value)
    range.insertNode(text)
    range.setStartAfter(text)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    change(normalizeTextContent(event.currentTarget.textContent ?? ''))
  }

  if (active) {
    const controlClass = `w-full min-w-0 resize-y overflow-hidden border-0 border-b border-[var(--editor-chrome-focus)] bg-[var(--editor-chrome-surface)] px-1 py-0.5 text-[var(--editor-chrome-on-surface)] outline-none ring-2 ring-[color-mix(in_srgb,var(--editor-chrome-focus)_38%,transparent)] ${props.className ?? ''}`
    const inheritedTypography: CSSProperties = { fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', fontStyle: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit', textAlign: 'inherit', textDecoration: 'inherit', textTransform: 'inherit', ...props.inputStyle }
    return <span className={`relative z-30 flex w-full max-w-full items-stretch ${props.compact ? 'min-h-[1.75em]' : 'flex-col gap-1'}`} onClick={(event) => event.stopPropagation()}>
      {props.compact
        ? <span ref={compactEditorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label={props.label} className={controlClass} style={inheritedTypography} onBeforeInput={(event) => { if (event.nativeEvent.inputType === 'insertParagraph' || event.nativeEvent.inputType === 'insertLineBreak') event.preventDefault() }} onInput={compactInput} onPaste={compactPaste} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); done() } else if (event.key === 'Escape') { event.preventDefault(); cancel() } }} />
        : props.multiline
        ? <textarea ref={(node) => { inputRef.current = node }} rows={3} aria-label={props.label} className={controlClass} style={inheritedTypography} value={props.value} onChange={(event) => change(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancel() } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); done() } }} />
        : <input ref={(node) => { inputRef.current = node }} aria-label={props.label} className={controlClass} style={inheritedTypography} value={props.value} onChange={(event) => change(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); done() } else if (event.key === 'Escape') { event.preventDefault(); cancel() } }} />}
      {!props.compact && <span className="flex justify-end gap-1 text-[10px] font-sans font-normal leading-none">
        <button type="button" className="rounded-full bg-[var(--editor-chrome-strong)] p-1.5 text-[var(--editor-chrome-on-strong)] shadow-[var(--editor-chrome-shadow)]" onClick={done} aria-label={`Done editing ${props.label}`} title="Done"><Check size={12} /></button>
        <button type="button" className="rounded-full border border-[color-mix(in_srgb,var(--editor-chrome-focus)_30%,transparent)] bg-[var(--editor-chrome-surface)] p-1.5 text-[var(--editor-chrome-on-surface)] shadow-[var(--editor-chrome-shadow)]" onClick={cancel} aria-label={`Cancel editing ${props.label}`} title="Cancel"><X size={12} /></button>
      </span>}
    </span>
  }

  const display = props.value.trim() ? props.value : props.showFallbackInEditor ? props.fallback : null
  return <button
    type="button"
    className={`inline-edit-target max-w-full cursor-text rounded-sm border-0 bg-transparent p-0 text-inherit outline-none ${props.elementId ? 'block w-full' : ''} ${props.multiline ? 'whitespace-pre-line' : ''} ${props.className ?? ''}`}
    style={props.elementId ? { textAlign: 'inherit', textTransform: props.inputStyle?.textTransform ?? 'inherit' } : undefined}
    aria-label={`Edit ${props.label}`}
    onClick={(event) => { event.stopPropagation(); entryValueRef.current = props.value; editor.requestEdit(target) }}
  >{display ? (props.renderValue?.(props.value) ?? display) : <span className="inline-edit-placeholder">{props.placeholder}</span>}</button>
}
