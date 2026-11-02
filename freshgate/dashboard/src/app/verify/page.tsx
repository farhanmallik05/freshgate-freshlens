"use client";

import { useState } from "react";
import { VerifyResponse } from "../../types";
import { requestVerification } from "../../lib/api";
import { ScoreRing } from "../../components/ScoreRing";
import { HighlightRenderer } from "../../components/HighlightRenderer";
import { DoubleBezelCard } from "../../components/DoubleBezelCard";
import { EvidenceDrawer } from "../../components/EvidenceDrawer";
import { CorrectionDiff } from "../../components/CorrectionDiff";
import { getBandBadge, getVerdictBadge, cn } from "../../lib/utils";
import {
  Sparkles,
  Check,
  Copy,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function VerifyPlayground() {
  const [inputText, setInputText] = useState(
    "Next.js 14 is the latest version and ChatGPT Plus costs $20 per month. Satya Nadella is the CEO of Microsoft."
  );
  const [depth, setDepth] = useState<"fast" | "thorough">("fast");
  const [maxClaims, setMaxClaims] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"annotated" | "corrected">("annotated");
  const [copied, setCopied] = useState(false);

  const handleVerify = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const data = await requestVerification(inputText, {
        depth,
        max_claims: maxClaims,
      });
      setResult(data);
      if (data.claims.length > 0) {
        setSelectedClaimId(data.claims[0].claim.id);
      }
    } catch (err) {
      console.error("Verification failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCorrected = () => {
    const textToCopy = result?.corrected_text || inputText;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const selectedClaim = result?.claims.find((c) => c.claim.id === selectedClaimId);
  const staleClaims = result?.claims.filter((c) => c.verdict === "stale") || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-sans">
              Freshness Verification Playground
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs text-emerald-400 font-mono">
                Interactive
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Paste any LLM output to extract atomic time-sensitive claims, search live sources via Tavily, and verify freshness with mathematical scoring.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setInputText(
                "Next.js 14 is the latest version and ChatGPT Plus costs $20 per month. Satya Nadella is the CEO of Microsoft."
              );
            }}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset Example
          </button>
        </div>
      </div>

      {/* Input Form with Double Bezel */}
      <DoubleBezelCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-zinc-400 font-medium">
              Input LLM Answer Text
            </label>
            <span className="text-[11px] font-mono text-zinc-400">
              {inputText.length} chars
            </span>
          </div>

          <textarea
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 placeholder-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-sans leading-relaxed transition-all"
            placeholder="Paste model output here..."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Depth:</span>
                <button
                  type="button"
                  onClick={() => setDepth(depth === "fast" ? "thorough" : "fast")}
                  className={cn(
                    "rounded border px-2.5 py-1 transition-colors",
                    depth === "fast"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-200"
                  )}
                >
                  {depth.toUpperCase()}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Max Claims:</span>
                <select
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(Number(e.target.value))}
                  className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                >
                  <option value={3}>3 claims</option>
                  <option value={5}>5 claims</option>
                  <option value={10}>10 claims</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleVerify}
              disabled={isLoading || !inputText.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 font-mono text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isLoading ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  <span>Verifying via Tavily...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Verify Freshness</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DoubleBezelCard>

      {/* Results View */}
      {result && (
        <div className="space-y-5">
          {/* Summary Banner with Double Bezel */}
          <DoubleBezelCard innerClassName="bg-zinc-950/90">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={result.overall.score} band={result.overall.band} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-sans">
                      Overall Freshness: {result.overall.score}/100
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase border",
                        getBandBadge(result.overall.band).bg
                      )}
                    >
                      {result.overall.band}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {result.overall.claims_checked} claims verified •{" "}
                    <span className={result.overall.stale_count > 0 ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                      {result.overall.stale_count} outdated
                    </span>{" "}
                    • {result.overall.unverifiable_count} unverifiable
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 text-xs font-mono text-zinc-300">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span>{result.latency_ms}ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>{result.usage.tavily_credits} Tavily Credits</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400">Cache:</span>
                  <span className={result.usage.cache_hits > 0 ? "text-emerald-400" : "text-zinc-400"}>
                    {result.usage.cache_hits} hits
                  </span>
                </div>
              </div>
            </div>
          </DoubleBezelCard>

          {/* Split Screen Workspace */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left 7 Cols: Text View */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("annotated")}
                    className={cn(
                      "font-mono text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      activeTab === "annotated"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Inline Highlight View
                  </button>
                  <button
                    onClick={() => setActiveTab("corrected")}
                    className={cn(
                      "font-mono text-xs font-medium px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      activeTab === "corrected"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-zinc-200"
                    )}
                  >
                    Corrected Text View
                  </button>
                </div>

                {activeTab === "annotated" ? (
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Dotted: Fresh
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Dashed: Aging
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Solid: Stale
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={handleCopyCorrected}
                    className="flex items-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 font-mono text-xs text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Copy Corrected Text</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-5 min-h-[260px] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {activeTab === "annotated" ? (
                  <HighlightRenderer
                    text={inputText}
                    claims={result.claims}
                    selectedClaimId={selectedClaimId}
                    onSelectClaim={(id) => setSelectedClaimId(id)}
                  />
                ) : (
                  <div className="space-y-4">
                    {staleClaims.length > 0 ? (
                      <div className="space-y-2 border-b border-zinc-800/80 pb-3">
                        <div className="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Detected Outdated Claims ({staleClaims.length})</span>
                        </div>
                        {staleClaims.map((c) => (
                          <CorrectionDiff
                            key={c.claim.id}
                            originalText={c.claim.text}
                            correction={c.correction}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-mono text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>All verified claims are current. No correction block required.</span>
                      </div>
                    )}

                    <div>
                      <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                        Full Output with Correction Append
                      </div>
                      <div className="font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed rounded-lg bg-zinc-900/60 border border-zinc-800/80 p-3.5">
                        {result.corrected_text || inputText}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right 5 Cols: Selected Claim Details */}
            <div className="lg:col-span-5 space-y-3">
              <div className="border-b border-zinc-800 pb-2 flex items-center justify-between">
                <span className="font-mono text-xs font-medium text-zinc-400">
                  Claim Inspection Panel
                </span>
                <span className="font-mono text-[11px] text-zinc-400">
                  {result.claims.length} atomic claims
                </span>
              </div>

              {selectedClaim ? (
                <DoubleBezelCard innerClassName="bg-zinc-950/90 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold border",
                          getVerdictBadge(selectedClaim.verdict).bg
                        )}
                      >
                        {getVerdictBadge(selectedClaim.verdict).label}
                      </span>
                      <span className="font-mono text-xs font-bold text-zinc-200">
                        Score: {selectedClaim.freshness}/100
                      </span>
                    </div>

                    <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-400 capitalize">
                      {selectedClaim.claim.category.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                      Extracted Claim Text:
                    </span>
                    <p className="text-sm font-medium text-zinc-100 mt-1 font-sans">
                      &ldquo;{selectedClaim.claim.text}&rdquo;
                    </p>
                  </div>

                  {selectedClaim.correction && (
                    <CorrectionDiff
                      originalText={selectedClaim.claim.text}
                      correction={selectedClaim.correction}
                    />
                  )}

                  {selectedClaim.reasoning && (
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                        LLM Judge Reasoning:
                      </span>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed font-sans bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800/80">
                        {selectedClaim.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Supporting Evidence Drawer */}
                  <div className="pt-2 border-t border-zinc-800/80">
                    <EvidenceDrawer
                      evidence={selectedClaim.evidence}
                      isOpen={true}
                      onToggle={() => {}}
                    />
                  </div>
                </DoubleBezelCard>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-xs text-zinc-400">
                  Select an inline highlighted claim to view deep evidence and reasoning.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
