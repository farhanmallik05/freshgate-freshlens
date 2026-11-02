"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { VerifyResponse } from "../types";
import { fetchVerifications } from "../lib/api";
import { getBandBadge, formatTimeAgo, cn } from "../lib/utils";
import { ScoreRing } from "../components/ScoreRing";
import { ClaimCard } from "../components/ClaimCard";
import { DoubleBezelCard } from "../components/DoubleBezelCard";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Pause,
  Play,
  Clock,
  Zap,
  Database,
  Filter,
  Sparkles,
  Inbox,
} from "lucide-react";

export default function LiveFeedPage() {
  const [items, setItems] = useState<VerifyResponse[]>([]);
  const [queuedItems, setQueuedItems] = useState<VerifyResponse[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filterBand, setFilterBand] = useState<string>("all");
  const [filterModel, setFilterModel] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] = useState<string>("");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const parentRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    setIsLoadingInitial(true);
    fetchVerifications(50, filterBand, filterModel)
      .then((res) => {
        setItems(res.items);
        if (res.items.length > 0) {
          setExpandedId(res.items[0].id);
        }
      })
      .finally(() => {
        setIsLoadingInitial(false);
      });
  }, [filterBand, filterModel]);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource("/api/engine/v1/events");

    eventSource.addEventListener("verification.completed", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload && payload.id) {
          // Normalize payload in case engine emitted summary
          const normalized: VerifyResponse = {
            id: payload.id,
            status: payload.status || "completed",
            created_at: payload.created_at || new Date().toISOString(),
            latency_ms: payload.latency_ms || 145,
            overall: payload.overall || {
              score: payload.overall_score ?? 90,
              band: payload.band ?? (payload.overall_score >= 75 ? "fresh" : payload.overall_score >= 45 ? "aging" : "stale"),
              claims_total: payload.stale_count ? payload.stale_count + 1 : 1,
              claims_checked: payload.stale_count ? payload.stale_count + 1 : 1,
              stale_count: payload.stale_count ?? 0,
              unverifiable_count: 0,
            },
            claims: payload.claims || [],
            corrected_text: payload.corrected_text || null,
            usage: payload.usage || {
              tavily_credits: 1,
              llm_tokens: { in: 120, out: 60 },
              cache_hits: 0,
            },
            context: payload.context || {
              model: payload.model || "gpt-4o",
              provider: "gateway",
              source: "gateway",
            },
          };

          setLatestAnnouncement(
            `New verification ${normalized.id} received: score ${normalized.overall.score}, ${normalized.overall.band}`
          );

          if (isPaused) {
            setQueuedItems((prev) => [normalized, ...prev]);
          } else {
            setItems((prev) => [normalized, ...prev.slice(0, 499)]);
          }
        }
      } catch (err) {
        console.error("Error parsing SSE verification event", err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isPaused]);

  const flushQueuedItems = () => {
    if (queuedItems.length === 0) return;
    setItems((prev) => [...queuedItems, ...prev].slice(0, 500));
    setQueuedItems([]);
    setIsPaused(false);
  };

  const copyMarkdown = (item: VerifyResponse) => {
    let md = `### FreshGate Verification: ${item.id}\n`;
    md += `- **Overall Score:** ${item.overall.score}/100 (${item.overall.band})\n`;
    md += `- **Model:** ${item.context?.model || "unknown"} via ${item.context?.provider || "gateway"}\n`;
    md += `- **Claims Checked:** ${item.overall.claims_checked} (Stale: ${item.overall.stale_count})\n\n`;
    md += `#### Verified Claims\n`;
    item.claims.forEach((c) => {
      md += `- **${c.claim.text}** -> ${c.verdict.toUpperCase()} (Freshness: ${c.freshness}/100)\n`;
      if (c.correction) {
        md += `  - *Correction:* ${c.correction}\n`;
      }
      if (c.evidence && c.evidence.length > 0) {
        md += `  - *Source:* [${c.evidence[0].domain}](${c.evidence[0].url})\n`;
      }
    });

    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Distinct model options extracted from stream
  const availableModels = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.context?.model) set.add(item.context.model);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterBand !== "all" && item.overall.band !== filterBand) return false;
      if (filterModel !== "all" && item.context?.model !== filterModel) return false;
      return true;
    });
  }, [items, filterBand, filterModel]);

  // TanStack Virtualizer for 500+ items
  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Screen Reader ARIA Live Notification */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {latestAnnouncement}
      </div>

      {/* Top Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Operational Verification Stream
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time Tavily search verification of LLM responses passing through Bifrost Gateway.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Band Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-zinc-400 ml-1.5" />
            <select
              aria-label="Filter by band"
              value={filterBand}
              onChange={(e) => setFilterBand(e.target.value)}
              className="bg-transparent text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 pr-2 cursor-pointer font-mono text-[11px]"
            >
              <option value="all" className="bg-zinc-900 text-zinc-200">All Bands</option>
              <option value="fresh" className="bg-zinc-900 text-emerald-400">Fresh (≥75)</option>
              <option value="aging" className="bg-zinc-900 text-amber-400">Aging (45–74)</option>
              <option value="stale" className="bg-zinc-900 text-rose-400">Stale (&lt;45)</option>
            </select>
          </div>

          {/* Model Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
            <span className="font-mono text-[10px] text-zinc-400 ml-1.5 uppercase">Model:</span>
            <select
              aria-label="Filter by model"
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="bg-transparent text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 pr-2 cursor-pointer font-mono text-[11px]"
            >
              <option value="all" className="bg-zinc-900 text-zinc-200">All Models</option>
              {availableModels.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              isPaused
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
            )}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span>{isPaused ? "Resume Stream" : "Pause Stream"}</span>
          </button>
        </div>
      </div>

      {/* Paused Unread Badge */}
      {isPaused && queuedItems.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-mono text-amber-300">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            <span>
              Stream paused: {queuedItems.length} incoming verification(s) buffered.
            </span>
          </div>
          <button
            type="button"
            onClick={flushQueuedItems}
            className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1 font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            <Play className="h-3 w-3" />
            <span>Catch Up Now</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingInitial ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-zinc-900/40 p-1.5 ring-1 ring-white/5">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-zinc-800" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-48 rounded bg-zinc-800" />
                    <div className="h-2.5 w-32 rounded bg-zinc-800/60" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <DoubleBezelCard innerClassName="p-12 text-center space-y-3">
          <Inbox className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-300 font-medium font-sans">
            No verifications in this window matching filters
          </p>
          <p className="text-xs text-zinc-400">
            Send a query through the Bifrost Gateway or test an answer in the Verify Playground.
          </p>
        </DoubleBezelCard>
      ) : (
        /* Virtualized Feed Container */
        <div
          ref={parentRef}
          className="h-[680px] overflow-y-auto pr-1"
          style={{ contain: "strict" }}
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = filteredItems[virtualRow.index];
              if (!item) return null;

              const isExpanded = expandedId === item.id;
              const bandMeta = getBandBadge(item.overall.band);

              return (
                <div
                  key={item.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-4"
                >
                  <DoubleBezelCard innerClassName="p-0 overflow-hidden">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                      <div className="flex items-center gap-3">
                        <ScoreRing
                          score={item.overall.score}
                          band={item.overall.band}
                          size="md"
                        />

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-zinc-200">
                              {item.id}
                            </span>
                            <span className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                              {item.context?.model || "gpt-4o"}
                            </span>
                            <span className="rounded bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                              {item.context?.source || "gateway"}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.2 font-mono text-[10px] font-semibold uppercase border",
                                bandMeta.bg
                              )}
                            >
                              {bandMeta.label}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 mt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-zinc-400" />
                              {formatTimeAgo(item.created_at)}
                            </span>
                            <span>•</span>
                            <span>{item.latency_ms}ms</span>
                            <span>•</span>
                            <span>{item.usage.tavily_credits} Tavily credit(s)</span>
                            {item.usage.cache_hits > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                  <Zap className="h-3 w-3" />
                                  {item.usage.cache_hits} cache hit
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => copyMarkdown(item)}
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          title="Copy Markdown Summary"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 text-zinc-400" />
                              <span>Copy MD</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex items-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-mono text-xs font-medium text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <span>{item.claims.length} claims</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Claims Section */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
                        {item.claims.length === 0 ? (
                          <p className="text-xs font-mono text-zinc-400">
                            No extracted claims in this record.
                          </p>
                        ) : (
                          item.claims.map((claimResult) => (
                            <ClaimCard
                              key={claimResult.claim.id}
                              claimResult={claimResult}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </DoubleBezelCard>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
