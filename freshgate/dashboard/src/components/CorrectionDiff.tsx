import React from "react";
import { ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface CorrectionDiffProps {
  originalText: string;
  correction: string | null;
  className?: string;
}

export function CorrectionDiff({
  originalText,
  correction,
  className,
}: CorrectionDiffProps) {
  if (!correction) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 space-y-2 font-mono text-xs",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-[11px] uppercase tracking-wider">
        <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
        <span>Freshness Correction</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1 rounded bg-rose-950/50 border border-rose-800/40 px-2.5 py-1.5 text-rose-200 line-through">
          {originalText}
        </div>

        <ArrowRight className="h-4 w-4 text-zinc-400 shrink-0 hidden sm:block" />

        <div className="flex-1 rounded bg-emerald-950/50 border border-emerald-800/40 px-2.5 py-1.5 text-emerald-300 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>{correction}</span>
        </div>
      </div>
    </div>
  );
}
