import React from "react";
import { Evidence, Authority } from "../types";
import { formatTimeAgo, cn } from "../lib/utils";
import { ExternalLink, Shield, CheckCircle2, AlertCircle } from "lucide-react";

interface EvidenceDrawerProps {
  evidence: Evidence[];
  isOpen: boolean;
  onToggle: () => void;
}

function getAuthorityBadge(auth: Authority) {
  switch (auth) {
    case "official":
      return {
        label: "Official Tier 1",
        bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        icon: CheckCircle2,
      };
    case "reputable":
      return {
        label: "Reputable News",
        bg: "bg-blue-500/15 text-blue-400 border-blue-500/30",
        icon: Shield,
      };
    case "community":
      return {
        label: "Community Source",
        bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        icon: AlertCircle,
      };
    default:
      return {
        label: "General Web",
        bg: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
        icon: AlertCircle,
      };
  }
}

export function EvidenceDrawer({
  evidence,
  isOpen,
  onToggle,
}: EvidenceDrawerProps) {
  if (!evidence || evidence.length === 0) {
    return (
      <div className="font-mono text-xs text-zinc-400">
        No external web evidence required (evergreen / common knowledge).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 font-mono text-xs font-medium text-emerald-400 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1.5 py-0.5"
      >
        <span>
          {isOpen ? "Hide Evidence" : `Inspect Evidence (${evidence.length} sources)`}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2.5 pt-1">
          {evidence.map((ev) => {
            const auth = getAuthorityBadge(ev.authority);
            const AuthIcon = auth.icon;
            const ageDisplay = ev.published_date
              ? formatTimeAgo(ev.published_date)
              : "undated";

            return (
              <div
                key={ev.id}
                className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-2 font-sans"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold",
                        auth.bg
                      )}
                    >
                      <AuthIcon className="h-3 w-3" />
                      {auth.label}
                    </span>
                    <span className="font-mono text-xs text-zinc-400">
                      {ev.domain}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-zinc-400">
                    Published: {ageDisplay}
                  </span>
                </div>

                <div className="text-xs font-medium text-zinc-200">
                  {ev.title}
                </div>

                {ev.snippet && (
                  <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-2">
                    &ldquo;{ev.snippet}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 font-mono text-[11px]">
                  <span className="text-zinc-400">
                    Relevance Score: {(ev.score * 100).toFixed(0)}%
                  </span>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline focus-visible:ring-1 focus-visible:ring-emerald-400"
                  >
                    <span>View primary source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
