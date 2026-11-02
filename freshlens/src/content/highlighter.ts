import { type ClaimResult, type Band } from "../shared/contract";
import { type AnchorResult } from "./anchor";

export interface HighlightEventDetail {
  claimResult: ClaimResult;
  rect: DOMRect;
  clientX: number;
  clientY: number;
}

export type HighlightCallback = (detail: HighlightEventDetail | null) => void;

const HIGHLIGHT_STYLE_ID = "freshlens-highlight-styles";

function ensureHighlightStyles() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent = `
    ::highlight(fl-fresh) {
      background-color: rgba(16, 185, 129, 0.16);
      text-decoration: underline solid #10b981 2px;
      text-underline-offset: 3px;
      cursor: pointer;
    }
    ::highlight(fl-aging) {
      background-color: rgba(245, 158, 11, 0.20);
      text-decoration: underline dashed #f59e0b 2px;
      text-underline-offset: 3px;
      cursor: pointer;
    }
    ::highlight(fl-stale) {
      background-color: rgba(239, 68, 68, 0.20);
      text-decoration: underline wavy #ef4444 2px;
      text-underline-offset: 3px;
      cursor: pointer;
    }
    .fl-mark {
      border-radius: 2px;
      padding: 0 1px;
      cursor: pointer;
    }
    .fl-mark-fresh {
      background-color: rgba(16, 185, 129, 0.16);
      text-decoration: underline solid #10b981 2px;
      text-underline-offset: 3px;
    }
    .fl-mark-aging {
      background-color: rgba(245, 158, 11, 0.20);
      text-decoration: underline dashed #f59e0b 2px;
      text-underline-offset: 3px;
    }
    .fl-mark-stale {
      background-color: rgba(239, 68, 68, 0.20);
      text-decoration: underline wavy #ef4444 2px;
      text-underline-offset: 3px;
    }
  `;
  document.head.appendChild(style);
}

export class Highlighter {
  private container: HTMLElement;
  private anchoredClaims: Map<string, { result: ClaimResult; range: Range }> = new Map();
  private markWrappers: HTMLElement[] = [];
  private onHoverCallback: HighlightCallback | null = null;
  private onClickCallback: HighlightCallback | null = null;
  private supportsCustomHighlight: boolean;
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.supportsCustomHighlight = typeof (window as any).Highlight !== "undefined" && typeof (CSS as any).highlights !== "undefined";
    ensureHighlightStyles();
    this.bindEvents();
  }

  public applyHighlights(anchors: AnchorResult[], claims: ClaimResult[]): void {
    this.clear();

    const claimMap = new Map<string, ClaimResult>();
    for (const c of claims) {
      claimMap.set(c.claim.id, c);
    }

    const freshRanges: Range[] = [];
    const agingRanges: Range[] = [];
    const staleRanges: Range[] = [];

    for (const anchor of anchors) {
      if (!anchor.range) continue;
      const claimResult = claimMap.get(anchor.claimId);
      if (!claimResult) continue;

      this.anchoredClaims.set(anchor.claimId, {
        result: claimResult,
        range: anchor.range,
      });

      if (claimResult.band === "fresh") {
        freshRanges.push(anchor.range);
      } else if (claimResult.band === "aging") {
        agingRanges.push(anchor.range);
      } else if (claimResult.band === "stale") {
        staleRanges.push(anchor.range);
      }
    }

    if (this.supportsCustomHighlight) {
      try {
        const CSSHighlights = (CSS as any).highlights;
        const freshHighlight = new (window as any).Highlight(...freshRanges);
        const agingHighlight = new (window as any).Highlight(...agingRanges);
        const staleHighlight = new (window as any).Highlight(...staleRanges);

        CSSHighlights.set("fl-fresh", freshHighlight);
        CSSHighlights.set("fl-aging", agingHighlight);
        CSSHighlights.set("fl-stale", staleHighlight);
        return;
      } catch (err) {
        console.warn("CSS Custom Highlight API failed, falling back to mark wrapping:", err);
      }
    }

    // Fallback: wrap ranges in <mark> elements
    this.applyMarkFallback(anchors, claimMap);
  }

  private applyMarkFallback(anchors: AnchorResult[], claimMap: Map<string, ClaimResult>) {
    for (const anchor of anchors) {
      if (!anchor.range) continue;
      const claimResult = claimMap.get(anchor.claimId);
      if (!claimResult) continue;

      try {
        const mark = document.createElement("mark");
        mark.className = `fl-mark fl-mark-${claimResult.band}`;
        mark.setAttribute("data-fl-claim", anchor.claimId);
        mark.title = `[${claimResult.band.toUpperCase()}] ${claimResult.reasoning || ""}`;

        anchor.range.surroundContents(mark);
        this.markWrappers.push(mark);
      } catch {
        // surroundContents can fail if range splits partial non-text nodes
      }
    }
  }

  private bindEvents() {
    let rAfTimer: number | null = null;

    this.mouseMoveHandler = (e: MouseEvent) => {
      if (rAfTimer) cancelAnimationFrame(rAfTimer);
      rAfTimer = requestAnimationFrame(() => {
        const hit = this.hitTest(e.clientX, e.clientY);
        if (this.onHoverCallback) {
          if (hit) {
            this.onHoverCallback({
              claimResult: hit.result,
              rect: hit.rect,
              clientX: e.clientX,
              clientY: e.clientY,
            });
          } else {
            this.onHoverCallback(null);
          }
        }
      });
    };

    this.clickHandler = (e: MouseEvent) => {
      const hit = this.hitTest(e.clientX, e.clientY);
      if (hit && this.onClickCallback) {
        this.onClickCallback({
          claimResult: hit.result,
          rect: hit.rect,
          clientX: e.clientX,
          clientY: e.clientY,
        });
      }
    };

    this.container.addEventListener("mousemove", this.mouseMoveHandler);
    this.container.addEventListener("click", this.clickHandler);
  }

  private hitTest(x: number, y: number): { result: ClaimResult; rect: DOMRect } | null {
    for (const [, { result, range }] of this.anchoredClaims) {
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
          return { result, rect: r };
        }
      }
    }
    return null;
  }

  public onHover(cb: HighlightCallback): void {
    this.onHoverCallback = cb;
  }

  public onClick(cb: HighlightCallback): void {
    this.onClickCallback = cb;
  }

  public scrollToClaim(claimId: string): void {
    const anchored = this.anchoredClaims.get(claimId);
    if (!anchored) return;

    const rects = anchored.range.getClientRects();
    if (rects.length > 0) {
      const r = rects[0];
      window.scrollTo({
        top: window.scrollY + r.top - 120,
        behavior: "smooth",
      });
    }
  }

  public clear(): void {
    if (this.supportsCustomHighlight) {
      try {
        const CSSHighlights = (CSS as any).highlights;
        CSSHighlights.delete("fl-fresh");
        CSSHighlights.delete("fl-aging");
        CSSHighlights.delete("fl-stale");
      } catch {
        // Ignore
      }
    }

    // Teardown fallback mark wrappers
    for (const mark of this.markWrappers) {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      }
    }
    this.markWrappers = [];
    this.anchoredClaims.clear();
  }

  public destroy(): void {
    this.clear();
    if (this.mouseMoveHandler) {
      this.container.removeEventListener("mousemove", this.mouseMoveHandler);
    }
    if (this.clickHandler) {
      this.container.removeEventListener("click", this.clickHandler);
    }
  }
}
