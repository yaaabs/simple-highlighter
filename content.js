const HIGHLIGHT_CLASS = "simple-highlighter-mark";

let lastUserRange = null;

function isTextNode(node) {
  return node && node.nodeType === Node.TEXT_NODE;
}

function isEditable(node) {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return false;
  return !!el.closest("input, textarea, [contenteditable='true']");
}

function getSelectionRange() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!range || range.collapsed) return null;
  return range;
}

function isRangeUsable(range) {
  if (!range || range.collapsed) return false;
  const container = range.commonAncestorContainer;
  if (!container) return false;
  if (container.nodeType === Node.DOCUMENT_NODE) return false;
  return document.contains(container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement);
}

function getActiveOrLastRange() {
  const active = getSelectionRange();
  if (active && !isEditable(active.commonAncestorContainer)) return active;
  if (lastUserRange && isRangeUsable(lastUserRange) && !isEditable(lastUserRange.commonAncestorContainer)) return lastUserRange;
  return null;
}

function getTextNodesInRange(range) {
  const root = range.commonAncestorContainer;

  if (isTextNode(root)) {
    if (!root.nodeValue || root.nodeValue.trim().length === 0) return [];
    if (!range.intersectsNode(root)) return [];
    if (root.parentElement?.closest(`.${HIGHLIGHT_CLASS}`)) return [];
    if (isEditable(root)) return [];
    return [root];
  }

  const walkerRoot = root?.nodeType === Node.ELEMENT_NODE ? root : root?.parentElement;
  if (!walkerRoot) return [];
  const walker = document.createTreeWalker(
    walkerRoot,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node || !node.nodeValue || node.nodeValue.trim().length === 0) return NodeFilter.FILTER_REJECT;
        if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement?.closest(`.${HIGHLIGHT_CLASS}`)) return NodeFilter.FILTER_REJECT;
        if (isEditable(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }
  return nodes;
}

function wrapTextNodePortion(node, startOffset, endOffset, color) {
  if (!isTextNode(node)) return false;
  if (startOffset === endOffset) return false;

  let target = node;
  if (startOffset > 0) {
    target = target.splitText(startOffset);
    endOffset -= startOffset;
  }
  if (endOffset < target.nodeValue.length) {
    target.splitText(endOffset);
  }

  const span = document.createElement("span");
  span.className = HIGHLIGHT_CLASS;
  span.dataset.simpleHighlighter = "1";
  span.style.backgroundColor = color;
  span.style.borderRadius = "0.15em";
  span.style.padding = "0.05em 0";
  span.style.boxDecorationBreak = "clone";
  span.style.webkitBoxDecorationBreak = "clone";

  target.parentNode.insertBefore(span, target);
  span.appendChild(target);
  return true;
}

function highlightSelection(color) {
  const range = getActiveOrLastRange();
  if (!range) return { ok: false, message: "Select some text first." };
  if (isEditable(range.commonAncestorContainer)) return { ok: false, message: "Highlighting is disabled in editable fields." };

  const nodes = getTextNodesInRange(range);
  if (nodes.length === 0) return { ok: false, message: "Nothing highlightable selected." };

  let changed = 0;
  for (const node of nodes) {
    let start = 0;
    let end = node.nodeValue.length;
    if (node === range.startContainer) start = range.startOffset;
    if (node === range.endContainer) end = range.endOffset;
    if (start < 0) start = 0;
    if (end > node.nodeValue.length) end = node.nodeValue.length;
    if (start >= end) continue;

    if (wrapTextNodePortion(node, start, end, color)) changed += 1;
  }

  window.getSelection()?.removeAllRanges();

  if (changed === 0) return { ok: false, message: "No changes applied." };
  return { ok: true, message: `Highlighted (${changed}).` };
}

function unwrapMark(markEl) {
  const parent = markEl.parentNode;
  if (!parent) return;
  while (markEl.firstChild) parent.insertBefore(markEl.firstChild, markEl);
  parent.removeChild(markEl);
  parent.normalize();
}

function eraseSelection() {
  const range = getActiveOrLastRange();
  if (!range) return { ok: false, message: "Select highlighted text to erase." };
  if (isEditable(range.commonAncestorContainer)) return { ok: false, message: "Erasing is disabled in editable fields." };

  const marks = Array.from(document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)).filter((el) => {
    try {
      return range.intersectsNode(el);
    } catch {
      return false;
    }
  });

  if (marks.length === 0) return { ok: false, message: "No highlights found in selection." };
  marks.forEach(unwrapMark);
  window.getSelection()?.removeAllRanges();
  return { ok: true, message: `Erased (${marks.length}).` };
}

function clearAllHighlights() {
  const marks = Array.from(document.querySelectorAll(`.${HIGHLIGHT_CLASS}`));
  if (marks.length === 0) return { ok: false, message: "No highlights on this page." };
  marks.forEach(unwrapMark);
  return { ok: true, message: `Cleared (${marks.length}).` };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (request.action === "highlight") {
      sendResponse(highlightSelection(request.color || "#fff59d"));
      return;
    }
    if (request.action === "erase") {
      sendResponse(eraseSelection());
      return;
    }
    if (request.action === "clearAll") {
      sendResponse(clearAllHighlights());
      return;
    }

    sendResponse({ ok: false, message: "Unknown action." });
  } catch (e) {
    sendResponse({ ok: false, message: "Action failed." });
  }
});

document.addEventListener(
  "selectionchange",
  () => {
    try {
      const range = getSelectionRange();
      if (!range) return;
      if (isEditable(range.commonAncestorContainer)) return;
      if (range.commonAncestorContainer?.nodeType === Node.ELEMENT_NODE) {
        if (range.commonAncestorContainer.closest?.(`.${HIGHLIGHT_CLASS}`)) return;
      }
      lastUserRange = range.cloneRange();
    } catch {
      // ignore
    }
  },
  { passive: true }
);
