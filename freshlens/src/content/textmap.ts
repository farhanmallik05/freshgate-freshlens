export interface TextSlice {
  node: Text;
  start: number; // UTF-16 start offset in plainText
  end: number;   // UTF-16 end offset in plainText
}

export interface TextMapResult {
  plainText: string;
  textMap: TextSlice[];
}

export function buildTextMap(
  root: HTMLElement,
  ignoreCodeBlocks = true
): TextMapResult {
  const textMap: TextSlice[] = [];
  let plainText = "";

  const filter = (node: Node): number => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (
        el.tagName === "SCRIPT" ||
        el.tagName === "STYLE" ||
        el.tagName === "NOSCRIPT" ||
        el.getAttribute("aria-hidden") === "true" ||
        el.classList.contains("citation") ||
        el.tagName === "SUP"
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      if (ignoreCodeBlocks && (el.tagName === "PRE" || el.tagName === "CODE")) {
        return NodeFilter.FILTER_REJECT;
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return NodeFilter.FILTER_ACCEPT;
    }
    return NodeFilter.FILTER_SKIP;
  };

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    { acceptNode: filter }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      const textNode = currentNode as Text;
      const rawText = textNode.nodeValue || "";

      if (rawText.length > 0) {
        const start = plainText.length;
        const end = start + rawText.length;

        plainText += rawText;
        textMap.push({
          node: textNode,
          start,
          end,
        });
      }
    }
    currentNode = walker.nextNode();
  }

  return { plainText, textMap };
}

export function textToRange(
  textMap: TextSlice[],
  start: number,
  end: number
): Range | null {
  if (start < 0 || end <= start || textMap.length === 0) {
    return null;
  }

  let startNode: Text | null = null;
  let startOffset = 0;
  let endNode: Text | null = null;
  let endOffset = 0;

  for (const slice of textMap) {
    // Check start node
    if (!startNode && start >= slice.start && start < slice.end) {
      startNode = slice.node;
      startOffset = start - slice.start;
    }

    // Check end node (inclusive boundary for end)
    if (end > slice.start && end <= slice.end) {
      endNode = slice.node;
      endOffset = end - slice.start;
      break;
    }
  }

  // Handle case where end is exactly at end of textMap
  if (startNode && !endNode && textMap.length > 0) {
    const lastSlice = textMap[textMap.length - 1];
    if (end >= lastSlice.end) {
      endNode = lastSlice.node;
      endOffset = lastSlice.end - lastSlice.start;
    }
  }

  if (!startNode || !endNode) {
    return null;
  }

  try {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  } catch {
    return null;
  }
}
