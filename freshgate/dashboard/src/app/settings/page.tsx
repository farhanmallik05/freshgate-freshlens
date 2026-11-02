"use client";

import { useEffect, useState } from "react";
import { checkEngineReady } from "../../lib/api";
import { DoubleBezelCard } from "../../components/DoubleBezelCard";
import { CheckCircle2, XCircle, RefreshCw, Server, Layers } from "lucide-react";
import { cn } from "../../lib/utils";

export default function SettingsPage() {
  const [engineReady, setEngineReady] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const testHealth = async () => {
    setIsChecking(true);
    const res = await checkEngineReady();
    setEngineReady(res.ok);
    setIsChecking(false);
  };

  useEffect(() => {
    testHealth();
    setDemoMode(localStorage.getItem("fg_demo_mode") === "1");
  }, []);

  const toggleDemo = () => {
    const next = !demoMode;
    setDemoMode(next);
    localStorage.setItem("fg_demo_mode", next ? "1" : "0");
  };

  return (
    <div className="space-y-8 max-w-4xl font-sans">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h1 className="text-xl font-bold tracking-tight text-white">
          Gateway Configuration & Operator Reference
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Bifrost plugin HTTP headers, engine connectivity diagnostics, and runtime offline demo mode.
        </p>
      </div>

      {/* Connectivity Card with Double Bezel */}
      <DoubleBezelCard innerClassName="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Server className="h-4 w-4 text-emerald-400" />
            <span>Freshness Engine Health & Readiness</span>
          </div>
          <button
            type="button"
            onClick={testHealth}
            disabled={isChecking}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-800/80 px-3 py-1 font-mono text-xs text-zinc-300 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
            <span>Test Health (/readyz)</span>
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          {engineReady === null ? (
            <div className="h-4 w-4 rounded-full bg-zinc-600 animate-pulse" />
          ) : engineReady ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="font-mono text-xs font-semibold text-white">
              {engineReady
                ? "Engine Service Online & Verified"
                : "Engine Standby (Offline or Demo Fallback Mode)"}
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
              Engine URL: http://localhost:8787 (Docker: http://engine:8787)
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
          <div>
            <div className="text-xs font-semibold text-zinc-200">Offline Demo Mode</div>
            <div className="text-[11px] text-zinc-400">
              Serve deterministic seeded verifications and simulated telemetry for offline evaluation
            </div>
          </div>
          <button
            type="button"
            onClick={toggleDemo}
            className={cn(
              "rounded-lg border px-3 py-1 font-mono text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              demoMode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            )}
          >
            {demoMode ? "Enabled" : "Disabled"}
          </button>
        </div>
      </DoubleBezelCard>

      {/* Bifrost Plugin Header Cheat Sheet with Double Bezel */}
      <DoubleBezelCard innerClassName="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white border-b border-zinc-800/80 pb-3">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span>Bifrost Plugin HTTP Header Contract (SPEC Section 8)</span>
        </div>

        <div className="space-y-4 text-xs font-mono">
          <div>
            <div className="font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Inbound Request Headers (Client to Gateway):</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2 text-zinc-400">
              <div>
                <span className="text-emerald-400 font-semibold">x-freshgate-mode:</span>{" "}
                <span className="text-zinc-200">off | async | sync | correct</span> (default from config)
              </div>
              <div>
                <span className="text-emerald-400 font-semibold">x-freshgate-max-claims:</span>{" "}
                <span className="text-zinc-200">1..10</span> (number of claims to select and verify)
              </div>
              <div>
                <span className="text-emerald-400 font-semibold">x-freshgate-depth:</span>{" "}
                <span className="text-zinc-200">fast | thorough</span> (Tavily search depth)
              </div>
              <div>
                <span className="text-emerald-400 font-semibold">x-bf-cache-key:</span>{" "}
                <span className="text-zinc-200">&lt;string&gt;</span> (opt-in Bifrost semantic cache key)
              </div>
            </div>
          </div>

          <div>
            <div className="font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Outbound Response Headers (Gateway to Client):</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5 space-y-2 text-zinc-400">
              <div>
                <span className="text-amber-400 font-semibold">x-freshgate-id:</span>{" "}
                <span className="text-zinc-200">fg_&lt;ulid&gt;</span> (deterministic tracing ID)
              </div>
              <div>
                <span className="text-amber-400 font-semibold">x-freshgate-status:</span>{" "}
                <span className="text-zinc-200">queued | completed | timeout | skipped | error | off</span>
              </div>
              <div>
                <span className="text-amber-400 font-semibold">x-freshgate-score:</span>{" "}
                <span className="text-zinc-200">0..100</span> (present in sync and correct modes)
              </div>
              <div>
                <span className="text-amber-400 font-semibold">x-freshgate-band:</span>{" "}
                <span className="text-zinc-200">fresh | aging | stale</span>
              </div>
              <div>
                <span className="text-amber-400 font-semibold">x-freshgate-stale-claims:</span>{" "}
                <span className="text-zinc-200">&lt;int&gt;</span> (count of outdated facts detected)
              </div>
            </div>
          </div>
        </div>
      </DoubleBezelCard>
    </div>
  );
}
