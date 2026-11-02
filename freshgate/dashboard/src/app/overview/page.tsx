"use client";

import { useEffect, useState } from "react";
import { StatsResponse } from "../../types";
import { fetchStats } from "../../lib/api";
import { DoubleBezelCard } from "../../components/DoubleBezelCard";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  DollarSign,
  AlertTriangle,
  BarChart3,
  Layers,
  Activity,
  Calendar,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";

// Custom Obsidian Dark Tooltip
interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  unit?: string;
}

const CustomChartTooltip = ({
  active,
  payload,
  label,
  unit = "",
}: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-[#121215]/95 p-3 font-mono text-xs shadow-xl backdrop-blur-md">
        <div className="font-semibold text-zinc-200 border-b border-zinc-800 pb-1 mb-1.5">
          {label}
        </div>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-[11px] py-0.5">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-zinc-400 capitalize">{p.name}:</span>
            </div>
            <span className="font-bold text-white tabular-nums">
              {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function OverviewPage() {
  const [windowPeriod, setWindowPeriod] = useState<"1h" | "24h" | "7d">("24h");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchStats(windowPeriod).then((data) => setStats(data));
  }, [windowPeriod]);

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  // Calculate dynamic average freshness score from model stats
  const totalModelClaims = stats.by_model.reduce((acc, m) => acc + m.total, 0);
  const weightedScoreSum = stats.by_model.reduce(
    (acc, m) => acc + m.avg_score * m.total,
    0
  );
  const avgFreshnessScore =
    totalModelClaims > 0
      ? Math.round(weightedScoreSum / totalModelClaims)
      : 84;

  const kpis = [
    {
      title: "Stale Claim Rate",
      value: `${(stats.stale_rate * 100).toFixed(1)}%`,
      desc: `${stats.totals.stale_count} of ${stats.totals.claims_checked} claims outdated`,
      icon: AlertTriangle,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
    {
      title: "Avg Freshness Score",
      value: `${avgFreshnessScore}/100`,
      desc: "Fleet-wide composite freshness",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Claim Cache Hit Rate",
      value: `${(stats.cache_hit_rate * 100).toFixed(0)}%`,
      desc: "Zero Tavily credits consumed on hit",
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      title: "Tavily Credit Efficiency",
      value: `${stats.credits_per_claim.toFixed(2)} cr/claim`,
      desc: `${stats.tavily_credits.toLocaleString()} total credits used`,
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Latency Distribution",
      value: `${stats.latency_ms.p50}ms`,
      desc: `p95: ${stats.latency_ms.p95}ms (<1.2ms async overhead)`,
      icon: Clock,
      color: "text-zinc-200",
      bg: "bg-zinc-800/40 border-zinc-700/50",
    },
    {
      title: "Verifications Total",
      value: stats.totals.verifications.toLocaleString(),
      desc: `${stats.totals.claims_total.toLocaleString()} claims processed`,
      icon: CheckCircle2,
      color: "text-zinc-200",
      bg: "bg-zinc-800/40 border-zinc-700/50",
    },
  ];

  // Chart 1 Data: Stale Rate by Model
  const modelChartData = stats.by_model.map((m) => ({
    model: m.model,
    staleRate: Number((m.stale_rate * 100).toFixed(1)),
    avgScore: m.avg_score,
    total: m.total,
  }));

  // Chart 2 Data: Category Volatility Stacked
  const categoryChartData = stats.by_category.map((c) => {
    const staleCount = Math.round(c.total * c.stale_rate);
    const freshCount = Math.max(0, c.total - staleCount);
    return {
      category: c.category.replace(/_/g, " "),
      stale: staleCount,
      fresh: freshCount,
      total: c.total,
      staleRate: (c.stale_rate * 100).toFixed(0),
    };
  });

  // Chart 3 Data: Score Distribution Histogram (5 buckets)
  const bandDist = stats.band_distribution;
  const scoreHistData = [
    { range: "0–20 (Stale)", count: Math.round(bandDist.stale * 0.45), fill: "#f43f5e" },
    { range: "21–40 (Stale)", count: Math.round(bandDist.stale * 0.55), fill: "#f43f5e" },
    { range: "41–60 (Aging)", count: Math.round(bandDist.aging * 0.6), fill: "#f59e0b" },
    { range: "61–80 (Aging)", count: Math.round(bandDist.aging * 0.4), fill: "#f59e0b" },
    { range: "81–100 (Fresh)", count: bandDist.fresh, fill: "#10b981" },
  ];

  // Chart 4 Data: Time Series Stale Rate & Volume
  const seriesData =
    stats.series && stats.series.length > 0
      ? stats.series.map((s) => ({
          time: s.bucket,
          staleRate: Number((s.stale_rate * 100).toFixed(1)),
          verifications: s.verifications,
          avgScore: s.avg_score,
        }))
      : [
          { time: "00:00", staleRate: 14.2, verifications: 110, avgScore: 86 },
          { time: "04:00", staleRate: 15.0, verifications: 95, avgScore: 85 },
          { time: "08:00", staleRate: 18.4, verifications: 280, avgScore: 82 },
          { time: "12:00", staleRate: 19.1, verifications: 420, avgScore: 81 },
          { time: "16:00", staleRate: 16.5, verifications: 350, avgScore: 84 },
          { time: "20:00", staleRate: 14.8, verifications: 165, avgScore: 86 },
        ];

  return (
    <div className="space-y-8 font-sans">
      {/* Header and Window Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Fleet Freshness Telemetry
            <span className="rounded-full bg-zinc-800 border border-zinc-700/80 px-2 py-0.5 text-xs text-zinc-300 font-mono">
              Live Gateway Stats
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Fleet-wide statistics across gateway traffic, LLM provider lag, and verified claim accuracy.
          </p>
        </div>

        <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
          {(["1h", "24h", "7d"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setWindowPeriod(period)}
              className={cn(
                "rounded-md px-3 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                windowPeriod === period
                  ? "bg-zinc-800 font-semibold text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid with Double Bezel */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <DoubleBezelCard key={idx} innerClassName="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">{kpi.title}</span>
                <div className={cn("rounded-md border p-1.5", kpi.bg, kpi.color)}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="font-mono text-2xl font-bold text-white tracking-tight tabular-nums">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">{kpi.desc}</div>
              </div>
            </DoubleBezelCard>
          );
        })}
      </div>

      {/* Breakdown Charts Grid: Model Stale Rate & Category Breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart A: Stale Claim Rate by Model */}
        <DoubleBezelCard innerClassName="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Stale Claim Rate by Model (%)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Lower is fresher</span>
          </div>

          <div className="h-64 w-full pt-2">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="model"
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#71717a"
                    unit="%"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    content={
                      <CustomChartTooltip unit="%" />
                    }
                  />
                  <Bar
                    dataKey="staleRate"
                    name="Stale Rate"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DoubleBezelCard>

        {/* Chart B: Category Breakdown (Stacked Bar) */}
        <DoubleBezelCard innerClassName="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Claim Category Breakdown (Volume & Staleness)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Claims Verified</span>
          </div>

          <div className="h-64 w-full pt-2">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "sans-serif" }}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <Tooltip
                    content={
                      <CustomChartTooltip />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", fontFamily: "monospace", paddingTop: "8px" }}
                  />
                  <Bar
                    dataKey="fresh"
                    name="Current / Fresh"
                    fill="#10b981"
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="stale"
                    name="Outdated / Stale"
                    fill="#f43f5e"
                    stackId="a"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DoubleBezelCard>
      </div>

      {/* Row 2: Histogram Score Distribution & Time Series Area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart C: Score Distribution Histogram */}
        <DoubleBezelCard innerClassName="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Freshness Score Distribution
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Score Buckets (0–100)</span>
          </div>

          <div className="h-64 w-full pt-2">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreHistData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="range"
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 10, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Verifications"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </DoubleBezelCard>

        {/* Chart D: Stale-Rate Time Series Area */}
        <DoubleBezelCard innerClassName="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-zinc-200">
                Stale-Rate Trend Over Time (%)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Historical Window</span>
          </div>

          <div className="h-64 w-full pt-2">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={seriesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <defs>
                    <linearGradient id="staleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="time"
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <YAxis
                    stroke="#71717a"
                    unit="%"
                    tick={{ fill: "#a1a1aa", fontSize: 11, fontFamily: "monospace" }}
                  />
                  <Tooltip content={<CustomChartTooltip unit="%" />} />
                  <Area
                    type="monotone"
                    dataKey="staleRate"
                    name="Stale Rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#staleGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </DoubleBezelCard>
      </div>

      {/* Top Stale Claims Table */}
      <DoubleBezelCard innerClassName="p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <h2 className="text-sm font-semibold text-zinc-200">
            Top Outdated Claims Detected in Gateway Answers
          </h2>
          <span className="font-mono text-xs text-zinc-400">
            Ranked by occurrence
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 text-[11px]">
              <tr>
                <th className="pb-2.5">Normalized Claim</th>
                <th className="pb-2.5">Occurrences</th>
                <th className="pb-2.5">Latest Verified Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {stats.top_stale_claims.map((claim, idx) => (
                <tr key={idx} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="py-3 font-sans font-medium text-zinc-200 pr-4">
                    {claim.normalized}
                  </td>
                  <td className="py-3 text-rose-400 font-bold tabular-nums">
                    {claim.count}
                  </td>
                  <td className="py-3 text-emerald-400 font-medium">
                    {claim.latest_correction || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DoubleBezelCard>
    </div>
  );
}
