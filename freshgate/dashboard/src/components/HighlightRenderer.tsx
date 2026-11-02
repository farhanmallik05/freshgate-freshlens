import React from "react";
import { ClaimResult } from "../types";
import { cn } from "../lib/utils";

interface HighlightRendererProps {
  text: string;
  claims: ClaimResult[];
  selectedClaimId: string | null;
  onSelectClaim: (claimId: string) => void;
  className?: string;
}

export function HighlightRenderer({
  text,
  claims,
  selectedClaimId,
  onSelectClaim,
  className,
}: HighlightRendererProps) {
  if (!text) {
    return <p className="text-zinc-400 text-sm italic">No text provided.</p>;
  }

  // Extract and normalize spans
  interface NormalizedSpan {
    start: number;
    end: number;
    claimRes: ClaimResult;
  }

  const validSpans: NormalizedSpan[] = [];

  claims.forEach((c) => {
    if (!c.claim.span) return;

    let start = 0;
    let end = 0;

    if (Array.isArray(c.claim.span)) {
      start = Number(c.claim.span[0]);
      end = Number(c.claim.span[1]);
    } else if (typeof c.claim.span === "object") {
      start = Number(c.claim.span.start);
      end = Number(c.claim.span.end);
    }

    if (isNaN(start) || isNaN(end)) return;

    // Clamp boundaries
    start = Math.max(0, Math.min(start, text.length));
    end = Math.max(start, Math.min(end, text.length));

    if (start < end) {
      validSpans.push({ start, end, claimRes: c });
    }
  });

  if (validSpans.length === 0) {
    return (
      <div className={cn("whitespace-pre-wrap text-zinc-200 text-sm leading-relaxed font-sans", className)}>
        {text}
      </div>
    );
  }

  // Interval Partitioning for overlapping & unicode spans
  const pointsSet = new Set<number>([0, text.length]);
  validSpans.forEach((s) => {
    pointsSet.add(s.start);
    pointsSet.add(s.end);
  });

  const sortedPoints = Array.from(pointsSet).sort((a, b) => a - b);
  const elements: React.ReactNode[] = [];

  const bandPriority: Record<string, number> = {
    stale: 3,
    aging: 2,
    fresh: 1,
  };

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const pStart = sortedPoints[i];
    const pEnd = sortedPoints[i + 1];
    if (pStart === pEnd) continue;

    const segmentText = text.slice(pStart, pEnd);

    // Find all claims covering [pStart, pEnd]
    const covering = validSpans.filter(
      (s) => s.start <= pStart && s.end >= pEnd
    );

    if (covering.length === 0) {
      elements.push(<span key={`plain-${pStart}-${pEnd}`}>{segmentText}</span>);
    } else {
      // Pick highest priority band
      covering.sort(
        (a, b) =>
          (bandPriority[b.claimRes.band] || 0) -
          (bandPriority[a.claimRes.band] || 0)
      );
      const primary = covering[0].claimRes;

      const bandClass =
        primary.band === "fresh"
          ? "fl-highlight-fresh"
          : primary.band === "aging"
          ? "fl-highlight-aging"
          : "fl-highlight-stale";

      const isSelected = selectedClaimId === primary.claim.id;

      elements.push(
        <mark
          key={`mark-${pStart}-${pEnd}`}
          tabIndex={0}
          role="button"
          aria-label={`Claim highlight: ${primary.claim.text}. Verdict: ${primary.verdict}, freshness: ${primary.freshness}/100`}
          onClick={() => onSelectClaim(primary.claim.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelectClaim(primary.claim.id);
            }
          }}
          className={cn(
            bandClass,
            isSelected && "ring-2 ring-white/80 ring-offset-1 ring-offset-zinc-950",
            "inline font-medium transition-all"
          )}
          title={`[${primary.verdict.toUpperCase()}] ${primary.freshness}/100: ${primary.claim.text}`}
        >
          {segmentText}
        </mark>
      );
    }
  }

  return (
    <div
      className={cn(
        "whitespace-pre-wrap text-zinc-200 text-sm leading-relaxed font-sans",
        className
      )}
    >
      {elements}
    </div>
  );
}
