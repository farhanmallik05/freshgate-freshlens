import React, { useState } from "react";
import { ClaimResult } from "../types";
import { ScoreRing } from "./ScoreRing";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { CorrectionDiff } from "./CorrectionDiff";
import { getVerdictBadge, cn } from "../lib/utils";
import { Database, Zap, Sparkles } from "lucide-react";

interface ClaimCardProps {
  claimResult: ClaimResult;
  className?: string;
}

export function ClaimCard({ claimResult, className }: ClaimCardProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const verdictMeta = getVerdictBadge(claimResult.verdict);

  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-4 space-y-3 font-sans transition-all",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold border",
              verdictMeta.bg
            )}
          >
            {verdictMeta.label}
          </span>

          <span className="font-mono text-xs text-zinc-400 capitalize">
            {claimResult.claim.category.replace(/_/g, " ")}
          </span>

          {claimResult.claim.salience && (
            <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              {claimResult.claim.salience}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {claimResult.cache.hit ? (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              <Database className="h-3 w-3" />
              Cache Hit {claimResult.cache.age_s ? `(${claimResult.cache.age_s}s)` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
              <Zap className="h-3 w-3 text-amber-400" />
              Live Search
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <ScoreRing score={claimResult.freshness} band={claimResult.band} size="sm" />
            <span className="font-mono text-xs font-bold text-zinc-200 tabular-nums">
              {claimResult.freshness}/100
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm font-medium text-zinc-100">
        &ldquo;{claimResult.claim.text}&rdquo;
      </div>

      {claimResult.correction && (
        <CorrectionDiff
          originalText={claimResult.claim.text}
          correction={claimResult.correction}
        />
      )}

      {claimResult.reasoning && (
        <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-900/40 rounded-lg p-2.5 border border-zinc-800/60">
          <span className="font-semibold text-zinc-200">Judgement: </span>
          {claimResult.reasoning}
        </p>
      )}

      <div className="pt-1">
        <EvidenceDrawer
          evidence={claimResult.evidence}
          isOpen={evidenceOpen}
          onToggle={() => setEvidenceOpen(!evidenceOpen)}
        />
      </div>
    </div>
  );
}
