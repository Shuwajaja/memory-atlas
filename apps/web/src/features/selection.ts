import { sliceCodePoints, utf16OffsetToCodePoint } from '../domain/provenance';

export interface TextSpan {
  start: number;
  end: number;
  text: string;
}

export function selectionWithin(root: HTMLElement): TextSpan | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = document.createRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const full = root.textContent ?? '';
  const start16 = before.toString().length;
  const end16 = start16 + range.toString().length;
  const start = utf16OffsetToCodePoint(full, start16);
  const end = utf16OffsetToCodePoint(full, end16);
  if (start === null || end === null || start >= end) return null;
  return { start, end, text: sliceCodePoints(full, start, end) };
}
