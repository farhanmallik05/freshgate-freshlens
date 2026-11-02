import React from "react";
import { Band } from "../types";
import { getBandBadge, cn } from "../lib/utils";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";

interface ScoreRingProps {
  score: number;
  band?: Band;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function ScoreRing({
  score,
  band: explicitBand,
  size = "md",
  showIcon = false,
  className,
}: ScoreRingProps) {
  // Infer band if not provided
  const band: Band =
    explicitBand || (score >= 75 ? "fresh" : score >= 45 ? "aging" : "stale");
  const meta = getBandBadge(band);

  const radius = size === "lg" ? 28 : size === "md" ? 20 : 14;
  const stroke = size === "lg" ? 4 : size === "md" ? 3 : 2.5;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const Icon =
    band === "fresh" ? ShieldCheck : band === "aging" ? Clock : AlertTriangle;
  const dim =
    size === "lg" ? "h-16 w-16" : size === "md" ? "h-12 w-12" : "h-9 w-9";
  const textClass =
    size === "lg"
      ? "text-base font-bold"
      : size === "md"
      ? "text-xs font-bold"
      : "text-[10px] font-bold";

  const strokeColorClass =
    band === "fresh"
      ? "text-emerald-500"
      : band === "aging"
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <div
      role="meter"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Freshness score: ${clampedScore} out of 100 (${meta.label})`}
      className={cn("relative flex items-center justify-center font-mono", dim, className)}
    >
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-zinc-800/80"
          fill="none"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(strokeColorClass, "transition-all duration-700 ease-out")}
          fill="none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showIcon ? (
          <Icon className={cn("h-4 w-4", strokeColorClass)} />
        ) : (
          <span className={cn("leading-none tabular-nums text-white", textClass)}>
            {clampedScore}
          </span>
        )}
      </div>
    </div>
  );
}
