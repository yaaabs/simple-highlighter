var SIMPLE_HIGHLIGHTER_VERSION = "1.1.1";

if (globalThis.__simpleHighlighterVersion !== SIMPLE_HIGHLIGHTER_VERSION) {
  globalThis.__simpleHighlighterVersion = SIMPLE_HIGHLIGHTER_VERSION;

  const HIGHLIGHT_CLASS = "simple-highlighter-mark";
  const DEFAULT_COLOR = "#fff59d";

  let lastUserRange = null;

  function isTextNode(node) {
    return node?.nodeType === Node.TEXT_NODE;
  }

  function isEditable(node) {
    if (!node) return false;

    const element =
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return false;
    if (element.closest("input, textarea")) return true;

    return element.isContentEditable === true;
  }

  function getSelectionRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    if (!range || range.collapsed) return null;

    return range;
  }

  function isNodeInDocument(node) {
    if (!node) return false;

    const element =
      node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return !!element && document.documentElement.contains(element);
  }

  function isRangeUsable(range) {
    if (!range || range.collapsed) return false;

    try {
      return (
        isNodeInDocument(range.commonAncestorContainer) &&
        isNodeInDocument(range.startContainer) &&
        isNodeInDocument(range.endContainer)
      );
    } catch {
      return false;
    }
  }

  function getActionRange(disabledMessage) {
    const activeRange = getSelectionRange();
    if (activeRange && isEditable(activeRange.commonAncestorContainer)) {
      return { error: { ok: false, message: disabledMessage } };
    }

    if (activeRange) return { range: activeRange };

    if (
      lastUserRange &&
      isRangeUsable(lastUserRange) &&
      !isEditable(lastUserRange.commonAncestorContainer)
    ) {
      return { range: lastUserRange };
    }

    return { error: { ok: false, message: "Select some text first." } };
  }

  function closestHighlight(node) {
    const element =
      node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    return element?.closest?.(`.${HIGHLIGHT_CLASS}`) || null;
  }

  function getSafeColor(color) {
    if (typeof color !== "string") return DEFAULT_COLOR;
    if (!CSS.supports("background-color", color)) return DEFAULT_COLOR;
    return color;
  }

  function applyHighlightStyle(mark, color) {
    mark.className = HIGHLIGHT_CLASS;
    mark.dataset.simpleHighlighter = "1";
    mark.dataset.simpleHighlighterColor = getSafeColor(color);
    mark.style.backgroundColor = getSafeColor(color);
    mark.style.borderRadius = "0.15em";
    mark.style.padding = "0.05em 0";
    mark.style.boxDecorationBreak = "clone";
    mark.style.webkitBoxDecorationBreak = "clone";
  }

  function getTextNodesInRange(range) {
    const root = range.commonAncestorContainer;

    if (isTextNode(root)) {
      if (!root.nodeValue?.trim()) return [];
      if (!range.intersectsNode(root)) return [];
      if (closestHighlight(root)) return [];
      if (isEditable(root)) return [];
      return [root];
    }

    const walkerRoot =
      root?.nodeType === Node.ELEMENT_NODE ? root : root?.parentElement;
    if (!walkerRoot) return [];

    const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
        if (closestHighlight(node)) return NodeFilter.FILTER_REJECT;
        if (isEditable(node)) return NodeFilter.FILTER_REJECT;

        try {
          return range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        } catch {
          return NodeFilter.FILTER_REJECT;
        }
      },
    });

    const nodes = [];
    let current = walker.nextNode();

    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }

    return nodes;
  }

  function getHighlightsInRange(range) {
    return Array.from(document.querySelectorAll(`.${HIGHLIGHT_CLASS}`)).filter(
      (mark) => {
        try {
          return range.intersectsNode(mark);
        } catch {
          return false;
        }
      },
    );
  }

  function wrapTextNodePortion(node, startOffset, endOffset, color) {
    if (!isTextNode(node)) return false;
    if (!node.parentNode) return false;

    let start = Math.max(0, startOffset);
    let end = Math.min(node.nodeValue.length, endOffset);
    if (start >= end) return false;

    try {
      let target = node;

      if (start > 0) {
        target = target.splitText(start);
        end -= start;
        start = 0;
      }

      if (end < target.nodeValue.length) {
        target.splitText(end);
      }

      const span = document.createElement("span");
      applyHighlightStyle(span, color);
      target.parentNode.insertBefore(span, target);
      span.appendChild(target);

      return true;
    } catch {
      return false;
    }
  }

  function highlightSelection(color) {
    const { range, error } = getActionRange(
      "Highlighting is disabled inside editable fields.",
    );
    if (error) return error;

    let changed = 0;

    for (const mark of getHighlightsInRange(range)) {
      applyHighlightStyle(mark, color);
      changed += 1;
    }

    for (const node of getTextNodesInRange(range)) {
      let start = 0;
      let end = node.nodeValue.length;

      if (node === range.startContainer) start = range.startOffset;
      if (node === range.endContainer) end = range.endOffset;

      if (wrapTextNodePortion(node, start, end, color)) changed += 1;
    }

    window.getSelection()?.removeAllRanges();
    lastUserRange = null;

    if (changed === 0) return { ok: false, message: "Nothing selected to highlight." };

    return {
      ok: true,
      message: `Highlighted ${changed} section${changed === 1 ? "" : "s"}.`,
    };
  }

  function unwrapMark(mark) {
    const parent = mark.parentNode;
    if (!parent) return false;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
    parent.normalize();
    return true;
  }

  function eraseSelection() {
    const { range, error } = getActionRange(
      "Erasing is disabled inside editable fields.",
    );
    if (error) {
      if (error.message === "Select some text first.") {
        return { ok: false, message: "Select highlighted text to erase." };
      }
      return error;
    }

    const marks = getHighlightsInRange(range);
    if (marks.length === 0) {
      return { ok: false, message: "No highlighted text found in the selection." };
    }

    let removed = 0;
    marks.forEach((mark) => {
      if (unwrapMark(mark)) removed += 1;
    });

    window.getSelection()?.removeAllRanges();
    lastUserRange = null;

    return {
      ok: true,
      message: `Erased ${removed} highlight${removed === 1 ? "s" : "s"}.`,
    };
  }

  function clearAllHighlights() {
    const marks = Array.from(document.querySelectorAll(`.${HIGHLIGHT_CLASS}`));
    if (marks.length === 0) {
      return { ok: false, message: "No highlights on this page." };
    }

    let removed = 0;
    marks.forEach((mark) => {
      if (unwrapMark(mark)) removed += 1;
    });
    lastUserRange = null;

    return {
      ok: true,
      message: `Cleared ${removed} highlight${removed === 1 ? "s" : "s"}.`,
    };
  }

  function runRequest(request) {
    try {
      if (request.action === "ping") {
        return { ok: true, version: SIMPLE_HIGHLIGHTER_VERSION };
      }

      if (request.action === "highlight") {
        return highlightSelection(request.color || DEFAULT_COLOR);
      }

      if (request.action === "erase") {
        return eraseSelection();
      }

      if (request.action === "clearAll") {
        return clearAllHighlights();
      }

      return { ok: false, message: "Unknown action." };
    } catch {
      return { ok: false, message: "Action failed." };
    }
  }

  globalThis.__simpleHighlighterApi = {
    version: SIMPLE_HIGHLIGHTER_VERSION,
    run: runRequest,
  };

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    sendResponse(runRequest(request));
  });

  document.addEventListener(
    "selectionchange",
    () => {
      try {
        const range = getSelectionRange();
        if (!range) return;
        if (isEditable(range.commonAncestorContainer)) return;

        lastUserRange = range.cloneRange();
      } catch {
        // Selection can be transient while a page is mutating.
      }
    },
    { passive: true },
  );
}
