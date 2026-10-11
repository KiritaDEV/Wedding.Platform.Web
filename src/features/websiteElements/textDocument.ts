import type { TextDocument } from "./types";
import { WEBSITE_ELEMENT_LIMITS } from "./constants";

export type TextRun = TextDocument["children"][number] extends infer Block
  ? Block extends { children: infer Runs } ? Runs extends Array<infer Run> ? Run : never
  : never : never;

export const emptyTextDocument = (): TextDocument => ({ type: "doc", children: [{ type: "paragraph", children: [{ text: "" }] }] });

export type TextDocumentPoint = { paragraph: number; offset: number };

export function applyTextInlineColor(document: TextDocument, start: TextDocumentPoint, end: TextDocumentPoint, colorId?: string): TextDocument {
  const children = document.children.map((block, paragraph) => {
    if (paragraph < start.paragraph || paragraph > end.paragraph) return block;
    const selectionStart = paragraph === start.paragraph ? start.offset : 0;
    const selectionEnd = paragraph === end.paragraph ? end.offset : block.children.reduce((total, run) => total + [...run.text].length, 0);
    let cursor = 0;
    const runs = block.children.flatMap((run) => {
      const characters = [...run.text];
      const runStart = cursor;
      const runEnd = cursor + characters.length;
      cursor = runEnd;
      const from = Math.max(0, selectionStart - runStart);
      const to = Math.min(characters.length, selectionEnd - runStart);
      if (from >= to) return [run];
      return [
        from > 0 ? { ...run, text: characters.slice(0, from).join("") } : null,
        { ...run, text: characters.slice(from, to).join(""), colorId },
        to < characters.length ? { ...run, text: characters.slice(to).join("") } : null,
      ].filter((value): value is TextRun => value !== null);
    });
    return { ...block, children: runs };
  });
  return canonicalizeTextDocument({ ...document, children });
}

export function canonicalizeTextDocument(document: TextDocument): TextDocument {
  const run = (value: TextRun): TextRun => {
    const marks = value.marks;
    const canonicalMarks = marks ? {
      ...(marks.bold === true ? { bold: true } : {}),
      ...(marks.italic === true ? { italic: true } : {}),
      ...(marks.underline === true ? { underline: true } : {}),
      ...(marks.strikethrough === true ? { strikethrough: true } : {}),
    } : {};
    return { text: typeof value.text === "string" ? value.text : "", ...(Object.keys(canonicalMarks).length ? { marks: canonicalMarks } : {}), ...(value.colorId ? { colorId: value.colorId } : {}) };
  };
  return {
    type: "doc",
    children: document.children.map((block) => {
      const children = block.children.map(run).filter((value) => value.text.length > 0).reduce<TextRun[]>((runs, value) => {
        const previous = runs.at(-1);
        if (previous && sameRunFormatting(previous, value)) previous.text += value.text;
        else runs.push(value);
        return runs;
      }, []);
      return { type: "paragraph", children: children.length ? children : [{ text: "" }] };
    }),
  };
}

/**
 * Some contentEditable implementations omit separator text nodes while wrapping
 * a selection with an inline mark. Restore only whitespace that was present in
 * the document immediately before that formatting command. If any authored
 * non-whitespace character changed, leave the candidate untouched.
 */
export function restoreTextFormattingWhitespace(reference: TextDocument, candidate: TextDocument): TextDocument {
  if (reference.children.length !== candidate.children.length) return candidate;
  const children = candidate.children.map((block, index) => {
    const source = reference.children[index];
    if (!source || source.type !== block.type) return block;
    return { ...block, children: restoreRunWhitespace(source.children, block.children) };
  });
  return { ...candidate, children };
}

function restoreRunWhitespace(reference: TextRun[], candidate: TextRun[]): TextRun[] {
  const sourceCharacters = reference.flatMap((run) => Array.from(run.text, (text) => ({ text, marks: run.marks, colorId: run.colorId })));
  const candidateCharacters = candidate.flatMap((run) => Array.from(run.text, (text) => ({ text, marks: run.marks, colorId: run.colorId })));
  // A blank paragraph is represented canonically by one empty run. Range
  // formatting can leave the candidate with no runs, but it must never
  // serialize as `children: []` because the document schema requires a run.
  if (sourceCharacters.length === 0 && candidateCharacters.length === 0) {
    return candidate.length ? candidate : [{ text: "" }];
  }
  const restored: Array<{ text: string; marks?: TextRun["marks"]; colorId?: string }> = [];
  let sourceIndex = 0;

  for (const character of candidateCharacters) {
    while (sourceIndex < sourceCharacters.length && isWhitespace(sourceCharacters[sourceIndex]!.text) && sourceCharacters[sourceIndex]!.text !== character.text) {
      restored.push(sourceCharacters[sourceIndex]!);
      sourceIndex += 1;
    }
    if (sourceCharacters[sourceIndex]?.text !== character.text) return candidate;
    restored.push(character);
    sourceIndex += 1;
  }
  while (sourceIndex < sourceCharacters.length && isWhitespace(sourceCharacters[sourceIndex]!.text)) {
    restored.push(sourceCharacters[sourceIndex]!);
    sourceIndex += 1;
  }
  if (sourceIndex !== sourceCharacters.length) return candidate;

  return restored.reduce<TextRun[]>((runs, character) => {
    const previous = runs.at(-1);
    if (previous && sameRunFormatting(previous, character)) previous.text += character.text;
    else runs.push({ text: character.text, ...(character.marks ? { marks: character.marks } : {}), ...(character.colorId ? { colorId: character.colorId } : {}) });
    return runs;
  }, []);
}

function isWhitespace(value: string) {
  return /\s/u.test(value);
}

export function textPlainText(document: TextDocument) {
  return document.children.map((block) => block.children.map(({ text }) => text).join("")).join(" ").trim();
}

export function textDocumentToHtml(document: TextDocument, resolveColor?: (colorId: string) => string | undefined) {
  return document.children.map((block) => {
    const empty = block.children.every((run) => run.text.length === 0);
    return `<p${empty ? " data-text-empty-paragraph" : ""}>${empty ? "" : runsToHtml(block.children, resolveColor)}</p>`;
  }).join("");
}

function runsToHtml(runs: TextRun[], resolveColor?: (colorId: string) => string | undefined) {
  return runs.map((run) => {
    let value = escapeHtml(run.text).replace(/\n/g, "<br>");
    if (run.marks?.bold) value = `<strong>${value}</strong>`;
    if (run.marks?.italic) value = `<em>${value}</em>`;
    if (run.marks?.underline) value = `<u>${value}</u>`;
    if (run.marks?.strikethrough) value = `<s>${value}</s>`;
    if (run.colorId) {
      const color = resolveColor?.(run.colorId);
      value = `<span data-text-color-id="${escapeHtml(run.colorId)}"${color ? ` style="color:${escapeHtml(color)}"` : ""}>${value}</span>`;
    }
    return value;
  }).join("");
}

export function textDocumentFromElement(root: HTMLElement): TextDocument {
  const children: TextDocument["children"] = [];
  const appendNodes = (nodes: NodeListOf<ChildNode> | ChildNode[]) => Array.from(nodes).forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      if (text) children.push({ type: "paragraph", children: [{ text }] });
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "div" && Array.from(element.children).some((child) => ["div", "p", "ul", "ol", "li"].includes(child.tagName.toLowerCase()))) {
      appendNodes(element.childNodes);
    } else {
      children.push({ type: "paragraph", children: extractRuns(element) });
    }
  });
  appendNodes(root.childNodes);
  return { type: "doc", children: children.length ? children : [{ type: "paragraph", children: [{ text: "" }] }] };
}

/** Converts clipboard plain text into bounded paragraph-only canonical Text. */
export function textDocumentFromPlainText(value: string): TextDocument {
  const lines = value.replace(/\r\n?/g, "\n").split("\n").filter((line) => line.length > 0);
  return limitTextDocument({ type: "doc", children: lines.length ? lines.map((text) => ({ type: "paragraph" as const, children: [{ text }] })) : [{ type: "paragraph", children: [{ text: "" }] }] });
}

/** Parses clipboard HTML in its owner realm and emits only the canonical document model. */
export function textDocumentFromHtml(documentTarget: Document, html: string): TextDocument {
  const root = documentTarget.createElement("div");
  root.innerHTML = html;
  return textDocumentFromPasteElement(root);
}

/** Normalizes an already-parsed clipboard DOM without retaining DOM metadata. */
export function textDocumentFromPasteElement(root: HTMLElement): TextDocument {
  const children: TextDocument["children"] = [];
  const append = (nodes: NodeListOf<ChildNode> | ChildNode[]) => Array.from(nodes).forEach((node) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      if (text) children.push({ type: "paragraph", children: [{ text }] });
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "ul" || tag === "ol") {
      Array.from(element.children).filter((child) => child.tagName.toLowerCase() === "li").map(extractPastedRuns).filter(hasReadableRuns).forEach((runs) => children.push({ type: "paragraph", children: runs }));
      return;
    }
    if (tag === "table") {
      const rows = Array.from(element.querySelectorAll("tr")).map(extractPastedRuns).filter(hasReadableRuns);
      rows.forEach((runs) => children.push({ type: "paragraph", children: runs }));
      if (!rows.length && hasReadableRuns(extractPastedRuns(element))) children.push({ type: "paragraph", children: extractPastedRuns(element) });
      return;
    }
    const hasBlockChildren = Array.from(element.children).some((child) => ["p", "div", "ul", "ol", "li", "table", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote"].includes(child.tagName.toLowerCase()));
    if (tag === "div" && hasBlockChildren) append(element.childNodes);
    else {
      const runs = extractPastedRuns(element);
      if (hasReadableRuns(runs)) children.push({ type: "paragraph", children: runs });
    }
  });
  append(root.childNodes);
  return limitTextDocument({ type: "doc", children: children.length ? children : [{ type: "paragraph", children: [{ text: "" }] }] });
}

export function limitTextDocument(document: TextDocument, maximumCharacters: number = WEBSITE_ELEMENT_LIMITS.text, maximumBlocks = 100): TextDocument {
  let remaining = Math.max(0, maximumCharacters);
  const trimRuns = (runs: TextRun[]) => runs.flatMap((run) => {
    if (remaining <= 0) return [];
    const characters = [...run.text];
    const text = characters.slice(0, remaining).join("");
    remaining -= Math.min(characters.length, remaining);
    return text ? [{ ...run, text }] : [];
  });
  const children: TextDocument["children"] = [];
  document.children.slice(0, maximumBlocks).forEach((block) => {
    const runs = trimRuns(block.children);
    if (runs.length) children.push({ type: "paragraph", children: runs });
  });
  return { type: "doc", children: children.length ? children : [{ type: "paragraph", children: [{ text: "" }] }] };
}

function extractRuns(root: Element): TextRun[] {
  const runs: TextRun[] = [];
  const visit = (node: Node, marks: NonNullable<TextRun["marks"]>, colorId?: string) => {
    if (node.nodeType === 3) {
      const text = node.textContent ?? "";
      // A text node containing only whitespace can be the authored separator
      // between adjacent inline elements (for example `Lorem <strong>ipsum</strong>`).
      // Only an actually empty node is ignorable.
      if (text.length === 0) return;
      const compactMarks = Object.fromEntries(Object.entries(marks).filter(([, value]) => value)) as NonNullable<TextRun["marks"]>;
      const previous = runs.at(-1);
      const formatted = { marks: Object.keys(compactMarks).length ? compactMarks : undefined, colorId };
      if (previous && sameRunFormatting(previous, formatted)) previous.text += text;
      else runs.push({ text, ...(formatted.marks ? { marks: formatted.marks } : {}), ...(colorId ? { colorId } : {}) });
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    if (element.tagName === "BR") { runs.push({ text: "\n", ...(Object.keys(marks).length ? { marks } : {}), ...(colorId ? { colorId } : {}) }); return; }
    const tag = element.tagName.toLowerCase();
    const next = { ...marks };
    const nextColorId = element.dataset?.textColorId ?? colorId;
    if (tag === "b" || tag === "strong") next.bold = true;
    if (tag === "i" || tag === "em") next.italic = true;
    if (tag === "u") next.underline = true;
    if (tag === "s" || tag === "strike" || tag === "del") next.strikethrough = true;
    element.childNodes.forEach((child) => visit(child, next, nextColorId));
  };
  root.childNodes.forEach((node) => visit(node, {}));
  return runs.length ? runs : [{ text: "" }];
}

function sameMarks(first: TextRun["marks"] | undefined, second: NonNullable<TextRun["marks"]>): boolean {
  const firstEntries = Object.entries(first ?? {});
  const secondEntries = Object.entries(second);
  return firstEntries.length === secondEntries.length && firstEntries.every(([key, value]) => second[key as keyof typeof second] === value);
}

function sameRunFormatting(first: Pick<TextRun, "marks" | "colorId">, second: Pick<TextRun, "marks" | "colorId">): boolean {
  return first.colorId === second.colorId && sameMarks(first.marks, second.marks ?? {});
}

function extractPastedRuns(root: Element): TextRun[] {
  const runs: TextRun[] = [];
  const appendText = (text: string, marks: NonNullable<TextRun["marks"]>) => {
    if (!text) return;
    const compactMarks = Object.fromEntries(Object.entries(marks).filter(([, value]) => value)) as NonNullable<TextRun["marks"]>;
    const previous = runs.at(-1);
    if (previous && JSON.stringify(previous.marks ?? {}) === JSON.stringify(compactMarks)) previous.text += text;
    else runs.push({ text, ...(Object.keys(compactMarks).length ? { marks: compactMarks } : {}) });
  };
  const visit = (node: Node, marks: NonNullable<TextRun["marks"]>) => {
    if (node.nodeType === 3) { appendText(node.textContent ?? "", marks); return; }
    if (node.nodeType !== 1) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "br") { appendText("\n", marks); return; }
    if (tag === "ul" || tag === "ol") {
      Array.from(element.children).filter((child) => child.tagName.toLowerCase() === "li").forEach((item, index) => {
        if (runs.length && index === 0) appendText(" ", marks);
        if (index > 0) appendText(" ", marks);
        item.childNodes.forEach((child) => visit(child, marks));
      });
      return;
    }
    const next = { ...marks };
    if (tag === "b" || tag === "strong") next.bold = true;
    if (tag === "i" || tag === "em") next.italic = true;
    if (tag === "u") next.underline = true;
    if (tag === "s" || tag === "strike" || tag === "del") next.strikethrough = true;
    element.childNodes.forEach((child) => visit(child, next));
  };
  root.childNodes.forEach((node) => visit(node, {}));
  return runs;
}

function hasReadableRuns(runs: TextRun[]) {
  return runs.some((run) => run.text.length > 0);
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);


