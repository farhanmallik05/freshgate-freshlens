import React, { useState } from "react";
import { DEMO_FIXTURES, getFixtureForText } from "../../src/demo/fixtures";
import { type VerifyResponse } from "../../src/shared/contract";

export const Playground: React.FC = () => {
  const [text, setText] = useState(
    "Next.js 14 is the latest stable release of the framework. It includes the App Router architecture."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"analysis" | "corrected">("analysis");

  const runVerification = async () => {
    setLoading(true);
    // Simulate brief network delay
    setTimeout(() => {
      const fixture = getFixtureForText(text);
      setResult(fixture);
      setLoading(false);
    }, 350);
  };

  const loadPreset = (presetText: string) => {
    setText(presetText);
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100 mb-1">
          Verification Playground
        </h1>
        <p className="text-xs text-zinc-400">
          Paste any AI chatbot response to extract factual claims and verify against live web data.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 font-medium">Try Presets:</span>
        <button
          onClick={() =>
            loadPreset(
              "Next.js 14 is the latest stable release of the framework. It includes the App Router architecture."
            )
          }
          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
        >
          Next.js 14 Release
        </button>
        <button
          onClick={() =>
            loadPreset(
              "Claude 3.5 Sonnet costs $3 per million input tokens and $15 per million output tokens. Prompt caching is not supported on this model."
            )
          }
          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
        >
          Claude 3.5 Sonnet Pricing
        </button>
        <button
          onClick={() =>
            loadPreset(
              "Elon Musk is the CEO of Twitter. He oversees day-to-day operations and executive leadership."
            )
          }
          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
        >
          Twitter CEO
        </button>
        <button
          onClick={() =>
            loadPreset(
              "The speed of light in vacuum is approximately 299,792,458 meters per second across all reference frames."
            )
          }
          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
        >
          Evergreen (Physics)
        </button>
      </div>

      {/* Input Box */}
      <div className="space-y-3">
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste an AI-generated answer here..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 leading-relaxed"
        />

        <div className="flex justify-end">
          <button
            onClick={runVerification}
            disabled={loading || !text.trim()}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Checking live truth..." : "Inspect Freshness"}
          </button>
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          {/* Summary Strip */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                  result.overall.band === "stale"
                    ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                    : result.overall.band === "aging"
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                    : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {result.overall.score}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Freshness Score: {result.overall.score}/100 ({result.overall.band.toUpperCase()})
                </h3>
                <p className="text-xs text-zinc-400">
                  {result.overall.stale_count} stale of {result.overall.claims_total} claims · Latency: {result.latency_ms}ms
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === "analysis"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Claims & Evidence
              </button>
              <button
                onClick={() => setActiveTab("corrected")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeTab === "corrected"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Corrected Text
              </button>
            </div>
          </div>

          {/* Tab 1: Claims & Evidence */}
          {activeTab === "analysis" && (
            <div className="space-y-3">
              {result.claims.map((c) => (
                <div
                  key={c.claim.id}
                  className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase tracking-wider ${
                        c.band === "stale"
                          ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                          : c.band === "aging"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {c.band} · Score {c.freshness}
                    </span>
                    <span className="text-zinc-500 text-[11px]">{c.claim.category}</span>
                  </div>

                  <p className="text-xs text-zinc-300 font-mono italic">
                    "{c.claim.text}"
                  </p>

                  {c.correction && (
                    <div className="bg-zinc-900 border-l-2 border-rose-500 px-3 py-2 rounded text-xs text-zinc-200">
                      <strong className="text-rose-400">Live Correction: </strong>
                      {c.correction}
                    </div>
                  )}

                  {c.reasoning && (
                    <p className="text-[11px] text-zinc-400">{c.reasoning}</p>
                  )}

                  {c.evidence.length > 0 && (
                    <div className="text-[11px] pt-1 border-t border-zinc-800/60 flex flex-wrap gap-2 items-center">
                      <span className="text-zinc-500">Live Sources:</span>
                      {c.evidence.map((ev, i) => (
                        <a
                          key={i}
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline font-medium"
                        >
                          {ev.domain} ({ev.authority})
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab 2: Corrected Text */}
          {activeTab === "corrected" && (
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap">
              {result.corrected_text || text}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
