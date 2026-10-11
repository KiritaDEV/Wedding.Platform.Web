import { Bold, Italic, Palette, Strikethrough, Underline } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { canonicalizeTextDocument, limitTextDocument, restoreTextFormattingWhitespace, textDocumentFromElement, textDocumentFromHtml, textDocumentFromPlainText, textDocumentToHtml, textPlainText } from "../../websiteElements/textDocument";
import type { TextDocument, TextElement } from "../../websiteElements/types";
import { WEBSITE_ELEMENT_LIMITS } from "../../websiteElements/constants";
import { textFontCapabilities } from "../../websiteElements/text";
import type { TemplateDesignLibrary } from "../../websiteCapabilities/types";
import type { ProjectColor } from "../../websiteColors/projectColors";
import { resolveWebsiteColor } from "../../websiteColors/projectColors";
import type { ResponsiveViewport } from "../types";
import { TEXT_COMMAND_EVENT, type TextCommand } from "../textCommands";
import { FloatingFormattingToolbar } from "./FloatingFormattingToolbar";
import { captureTextRange, captureVisibleTextRange, commitPendingTextEdit, createTextEditSession, executeTextCommand, executeTextInlineColor, executeTextInlineCommand, preserveTextToolbarPointerDown, readTextCommandState, readTextInlineColorState, textCommandActiveAtRange, type TextCommandState, type TextInlineColorState } from "../textSelection";
import { WebsiteColorSwatchControl } from "./WebsiteColorSwatchControl";

export function TextCanvasEditor({ element, viewport, effectiveFontFamilyId, library, projectColors, onAddColor, onDocumentChange }: { element: TextElement; viewport: ResponsiveViewport; effectiveFontFamilyId?: string; library: TemplateDesignLibrary; projectColors: readonly ProjectColor[]; onAddColor: (value: string) => Promise<ProjectColor>; onDocumentChange: (elementId: string, document: TextDocument) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);
  const rangeRef = useRef<Range | null>(null);
  const editSession = useRef(createTextEditSession());
  const skipNextFormattingInput = useRef(false);
  const capabilities = textFontCapabilities(effectiveFontFamilyId);
  const isEmpty = !textPlainText(element.document).trim();
  const [commandState, setCommandState] = useState<TextCommandState>({ bold: false, italic: false, underline: false, strikeThrough: false });
  const [colorState, setColorState] = useState<TextInlineColorState>({ kind: "inherited" });
  const [toolbarRange, setToolbarRange] = useState<Range | null>(null);
  const refreshCommandState = () => { const editor = editorRef.current; if (editor) setCommandState(readTextCommandState(editor)); };
  const resolveColor = useCallback((colorId: string) => resolveWebsiteColor(colorId, library, projectColors), [library, projectColors]);
  useLayoutEffect(() => { if (editorRef.current && !focused.current) editorRef.current.innerHTML = textDocumentToHtml(element.document, resolveColor); }, [element.document, resolveColor]);
  const commit = (formattingReference?: TextDocument) => {
    const editor = editorRef.current;
    if (!editor) return;
    commitPendingTextEdit(
      editSession.current,
      () => {
        const document = canonicalizeTextDocument(textDocumentFromElement(editor));
        return formattingReference ? restoreTextFormattingWhitespace(formattingReference, document) : document;
      },
      (document) => onDocumentChange(element.id, document),
    );
  };
  const command = (name: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const formattingReference = canonicalizeTextDocument(textDocumentFromElement(editor));
    const inlineCommand = name === "bold" || name === "italic" || name === "underline" || name === "strikeThrough";
    const removingInlineCommand = inlineCommand && textCommandActiveAtRange(editor, rangeRef.current, name);
    const appliedInlineCommand = inlineCommand && !removingInlineCommand && executeTextInlineCommand(editor, rangeRef.current, name);
    if (!appliedInlineCommand) {
      // execCommand synchronously emits input. Its raw DOM is allowed to lose
      // inline-boundary whitespace, so only the reconciled commit below may be
      // persisted for commands that still require the browser implementation.
      skipNextFormattingInput.current = true;
      executeTextCommand(editor, rangeRef.current, name, value);
    }
    rangeRef.current = captureTextRange(editor);
    setToolbarRange(captureVisibleTextRange(editor));
    refreshCommandState();
    editSession.current.markDirty();
    commit(formattingReference);
  };
  const setInlineColor = (colorId?: string) => {
    const editor = editorRef.current;
    if (!editor || !executeTextInlineColor(editor, rangeRef.current, colorId, colorId ? resolveColor(colorId) : undefined)) return;
    rangeRef.current = captureTextRange(editor);
    setToolbarRange(captureVisibleTextRange(editor));
    setColorState(readTextInlineColorState(editor, rangeRef.current));
    editSession.current.markDirty();
    commit();
  };
  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;
    event.preventDefault();
    const clipboard = event.clipboardData;
    const html = clipboard.getData("text/html");
    const source = html ? textDocumentFromHtml(editor.ownerDocument, html) : textDocumentFromPlainText(clipboard.getData("text/plain"));
    const current = textDocumentFromElement(editor);
    const remainingCharacters = Math.max(0, WEBSITE_ELEMENT_LIMITS.text - textPlainText(current).length);
    const remainingBlocks = Math.max(1, 100 - current.children.length + 1);
    const document = limitTextDocument(source, remainingCharacters, remainingBlocks);
    executeTextCommand(editor, rangeRef.current, "insertHTML", textDocumentToHtml(document));
    rangeRef.current = captureTextRange(editor);
    refreshCommandState();
    editSession.current.markDirty();
    commit();
  };
  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ elementId: string; command: TextCommand }>).detail;
      if (detail.elementId !== element.id) return;
      command(detail.command);
    };
    const view = editorRef.current?.ownerDocument.defaultView;
    if (!view) return;
    view.addEventListener(TEXT_COMMAND_EVENT, handleCommand);
    return () => view.removeEventListener(TEXT_COMMAND_EVENT, handleCommand);
  });
  useEffect(() => {
    const editor = editorRef.current;
    const documentTarget = editor?.ownerDocument;
    if (!editor || !documentTarget) return;
    const capture = () => {
      const range = captureVisibleTextRange(editor);
      setToolbarRange(range);
      if (!range) return;
      rangeRef.current = range;
      refreshCommandState();
      setColorState(readTextInlineColorState(editor, range));
    };
    documentTarget.addEventListener("selectionchange", capture);
    return () => documentTarget.removeEventListener("selectionchange", capture);
  }, []);
  return <div className="relative m-0 min-h-[1.75em] w-full min-w-0 max-w-full p-0 [overflow-wrap:anywhere]" data-text-canvas-editor>
    <FloatingFormattingToolbar label="Text formatting" viewport={viewport} observeInOwnerRealm range={toolbarRange}>
      <Tool label="Bold" disabled={!capabilities.weights.includes(700)} pressed={commandState.bold} onPress={() => command("bold")}><Bold size={16} /></Tool><Tool label="Italic" disabled={!capabilities.italic} pressed={commandState.italic} onPress={() => command("italic")}><Italic size={16} /></Tool><Tool label="Underline" pressed={commandState.underline} onPress={() => command("underline")}><Underline size={16} /></Tool><Tool label="Strikethrough" pressed={commandState.strikeThrough} onPress={() => command("strikeThrough")}><Strikethrough size={16} /></Tool>
      <TextInlineColorControl state={colorState} library={library} projectColors={projectColors} onAddColor={onAddColor} onChange={setInlineColor} />
    </FloatingFormattingToolbar>
    {isEmpty && <span className="inline-edit-placeholder pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">Add text</span>}
    <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="Text content" aria-multiline="true" className="relative m-0 min-h-[1.75em] w-full min-w-0 max-w-full cursor-text p-0 outline-none [overflow-wrap:anywhere] [&>*]:m-0 [&>p+p]:mt-[1.5em] [&>p[data-text-empty-paragraph]]:!mt-0" onFocus={() => { focused.current = true; refreshCommandState(); }} onBlur={(event) => { if ((event.relatedTarget as Element | null)?.closest?.("[data-floating-formatting-toolbar]")) return; focused.current = false; setToolbarRange(null); commit(); }} onInput={() => { if (skipNextFormattingInput.current) { skipNextFormattingInput.current = false; refreshCommandState(); return; } editSession.current.markDirty(); commit(); refreshCommandState(); }} onKeyDown={(event) => { if (event.key === "Tab") event.preventDefault(); }} onPaste={paste} />
  </div>;
}

function Tool({ label, pressed, disabled, onPress, children }: { label: string; pressed?: boolean; disabled?: boolean; onPress: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} className={`grid size-9 place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-40 ${pressed ? "bg-accent text-accent-foreground" : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"}`} onPointerDown={(event) => { if (!disabled) preserveTextToolbarPointerDown(event); }} onClick={() => { if (!disabled) onPress(); }}>{children}</button>;
}

export function TextInlineColorControl({ state, library, templateColors = library.colors, projectColors, onAddColor, onChange }: { state: TextInlineColorState; library: TemplateDesignLibrary; templateColors?: TemplateDesignLibrary["colors"]; projectColors: readonly ProjectColor[]; onAddColor: (value: string) => Promise<ProjectColor>; onChange: (colorId?: string) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <button type="button" aria-label="Text Color" title="Text Color" aria-haspopup="dialog" aria-expanded={open} data-inline-color-state={state.kind} className="grid size-9 place-items-center rounded-md text-foreground-muted outline-none hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent/40" onPointerDown={preserveTextToolbarPointerDown} onClick={() => setOpen((value) => !value)}><Palette size={16} /></button>
    {open && <div role="dialog" aria-label="Text Color" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-surface p-3 shadow-[var(--shadow-dialog)]" onPointerDown={(event) => event.stopPropagation()}><WebsiteColorSwatchControl label="Text Color choices" colorId={state.kind === "uniform" ? state.colorId : undefined} inheritSelected={state.kind === "inherited"} inheritLabel="Inherit color" allowedTemplateColorIds={templateColors.map(({ id }) => id)} templateColors={templateColors} projectColors={projectColors} showUnresolvedWarning={false} onChange={(colorId) => { onChange(colorId); setOpen(false); }} onAddColor={onAddColor} /></div>}
  </div>;
}