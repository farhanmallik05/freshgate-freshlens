import React, { useState } from "react";
import { SCENARIOS, Scenario } from "./demo-data";
import {
  Activity,
  Zap,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Split,
  RefreshCw,
  PowerOff,
  CheckCircle,
} from "lucide-react";

export default function App() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [mode, setMode] = useState<"off" | "async" | "sync" | "correct">("correct");
  const [isSplitView, setIsSplitView] = useState(true);
  const [isEngineDown, setIsEngineDown] = useState(false);
  const [isCacheHit, setIsCacheHit] = useState(false);
  const [askCount, setAskCount] = useState(1);

  const handleSelectScenario = (sc: Scenario) => {
    setSelectedScenario(sc);
    setIsCacheHit(false);
    setAskCount(1);
  };

  const handleAskAgain = () => {
    setAskCount((prev) => prev + 1);
    setIsCacheHit(true);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-white">FreshGate</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                Split-Screen Live Demo
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Bifrost Gateway Plugin + Tavily Live Verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSplitView(!isSplitView)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
              isSplitView
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            <Split className="h-3.5 w-3.5" />
            Split Comparison
          </button>

          <button
            onClick={() => setIsEngineDown(!isEngineDown)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
              isEngineDown
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300 animate-pulse"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
            title="Simulate upstream engine crash to prove gateway fail-open"
          >
            <PowerOff className="h-3.5 w-3.5" />
            {isEngineDown ? "Engine Killed (Fail-Open Active)" : "Simulate Outage"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Scenario Buttons */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase tracking-wider">
              Select Production Lag Scenario:
            </span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">Plugin Mode:</span>
              {(["off", "async", "sync", "correct"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                    mode === m
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-bold"
                      : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SCENARIOS.map((sc) => {
              const active = selectedScenario.id === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/10 text-white font-semibold"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{sc.title}</span>
                    <span className="rounded bg-zinc-800 px-1 py-0.2 text-[10px] font-mono text-zinc-500">
                      {sc.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prompt Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider">
              Client Prompt sent to Bifrost Gateway:
            </span>
            <div className="text-sm font-medium text-white">&ldquo;{selectedScenario.prompt}&rdquo;</div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAskAgain}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-800/80 px-3 py-1.5 font-mono text-xs text-zinc-200 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Ask Again (Test Cache Hit #{askCount + 1})
            </button>
          </div>
        </div>

        {/* Cache & Volatility Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between">
            <span className="text-zinc-500">Prompt Volatility:</span>
            <span className="font-bold text-amber-400 capitalize">
              {selectedScenario.volatility}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between">
            <span className="text-zinc-500">Injected Cache TTL:</span>
            <span className="font-bold text-zinc-200">
              {selectedScenario.suggestedTTL ? `${selectedScenario.suggestedTTL}s` : "No-Store (0s)"}
            </span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 flex items-center justify-between">
            <span className="text-zinc-500">Bifrost Semantic Cache:</span>
            {isCacheHit ? (
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Cache Hit (0 credits)
              </span>
            ) : (
              <span className="font-bold text-zinc-400">Miss (Fresh Fetch)</span>
            )}
          </div>
        </div>

        {/* Comparison Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Without FreshGate */}
          {isSplitView && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-zinc-500" />
                  <span className="font-mono text-xs font-bold text-zinc-300">
                    Standard LLM Output (FreshGate OFF)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500">Raw Model Lag</span>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                  {selectedScenario.rawAnswer}
                </p>

                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Silent Hallucination / Staleness Risk: </span>
                    Model answer is anchored to obsolete pre-cutoff facts without verification.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Column: With FreshGate */}
          <div
            className={`rounded-xl border border-emerald-500/30 bg-zinc-950 p-5 space-y-4 ${
              !isSplitView ? "lg:col-span-2" : ""
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs font-bold text-emerald-400">
                  FreshGate Gateway Output (Mode: {mode.toUpperCase()})
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs">
                {isEngineDown ? (
                  <span className="text-rose-400 font-bold">x-freshgate-status: breaker_open</span>
                ) : (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">
                    Score: {selectedScenario.overallScore}/100
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {isEngineDown ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                    {selectedScenario.rawAnswer}
                  </p>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 font-mono">
                    <strong>Fail-Open Circuit Breaker Tripped:</strong> Upstream engine was
                    unreachable. Bifrost gracefully served user traffic without hanging or failing!
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-sans text-sm text-zinc-100 whitespace-pre-wrap leading-relaxed">
                    {mode === "correct"
                      ? selectedScenario.freshgateAnswer
                      : selectedScenario.rawAnswer}
                  </div>

                  {/* Verification Claim Drawer */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                      Tavily Verified Claims:
                    </span>
                    {selectedScenario.claims.map((c, i) => (
                      <div key={i} className="text-xs space-y-1 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200">{c.text}</span>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-bold ${
                              c.verdict === "stale"
                                ? "bg-rose-500/20 text-rose-400"
                                : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            {c.verdict.toUpperCase()} ({c.freshness}/100)
                          </span>
                        </div>
                        {c.correction && (
                          <div className="text-rose-300 text-[11px]">
                            &rarr; {c.correction}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                          <span>{c.reasoning}</span>
                          <a
                            href={c.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            Source ({c.sourceDomain}) <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
