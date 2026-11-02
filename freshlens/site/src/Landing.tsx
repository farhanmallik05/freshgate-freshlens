import React, { useState } from "react";

export const Landing: React.FC<{ onNavigate: (tab: "landing" | "playground" | "chat") => void }> = ({
  onNavigate,
}) => {
  const [showFixed, setShowFixed] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-20">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Geek Room Hackathon · Tavily Problem Statement #1
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-100 tracking-tight leading-tight">
          Never Trust Stale AI Answers Again.
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
          Frontier AI models sound completely confident even when their training data is months out of date.
          <strong> FreshLens</strong> highlights outdated facts inside ChatGPT and Claude in real time,
          backed by live web verification via the <strong>Tavily API</strong>.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <a
            href="/downloads/freshlens-latest.zip"
            download="freshlens-latest.zip"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-sm transition shadow-lg shadow-emerald-500/10"
          >
            Download Extension (ZIP)
          </a>
          <button
            onClick={() => onNavigate("chat")}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-lg text-sm transition"
          >
            Open Live Demo Chat →
          </button>
          <button
            onClick={() => onNavigate("playground")}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-lg text-sm transition"
          >
            Interactive Playground
          </button>
        </div>
      </div>

      {/* Interactive Before/After Visual */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
            <span className="text-xs text-zinc-400 font-mono ml-2">ChatGPT Answer Inspection</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Toggle View:</span>
            <button
              onClick={() => setShowFixed(false)}
              className={`px-2.5 py-1 rounded transition ${
                !showFixed
                  ? "bg-zinc-800 text-zinc-200 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Outdated Response
            </button>
            <button
              onClick={() => setShowFixed(true)}
              className={`px-2.5 py-1 rounded transition ${
                showFixed
                  ? "bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              FreshLens Verified
            </button>
          </div>
        </div>

        {/* Message bubble */}
        <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800/80 font-sans text-sm leading-relaxed text-zinc-300 relative">
          <div className="flex items-center gap-2 mb-3 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-400">Assistant:</span>
            <span>Regarding Next.js framework releases...</span>
          </div>

          {!showFixed ? (
            <p>
              <span className="bg-rose-500/20 text-rose-300 underline decoration-wavy decoration-rose-500 decoration-2 px-1 rounded">
                Next.js 14 is the latest stable release of the framework.
              </span>{" "}
              It includes the App Router architecture. React 19 support is currently experimental and not ready for production use.
            </p>
          ) : (
            <div className="space-y-3">
              <p>
                <span className="bg-emerald-500/20 text-emerald-300 underline decoration-solid decoration-emerald-500 decoration-2 px-1 rounded">
                  Next.js 15 is generally available and stable as of October 2024.
                </span>{" "}
                It includes full support for React 19, async request lifecycles, and Server Actions.
              </p>
              <div className="bg-zinc-900 border-l-2 border-emerald-500 p-2.5 rounded text-xs text-zinc-400">
                <span className="text-emerald-400 font-semibold">Tavily Live Source: </span>
                nextjs.org/blog/next-15 · Published Oct 21, 2024 (Authority: official)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Core Value Pillars */}
      <div className="grid sm:grid-cols-3 gap-6">
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <div className="text-xl">🌐</div>
          <h3 className="text-base font-bold text-zinc-200">Live Tavily Verification</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Extracts atomic factual claims and re-verifies them against primary authoritative web sources using Tavily Search & Extract.
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <div className="text-xl">📊</div>
          <h3 className="text-base font-bold text-zinc-200">0–100 Freshness Scores</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every statement receives an empirical score with accessible multi-channel indicators: solid green, dashed amber, and wavy red.
          </p>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <div className="text-xl">✨</div>
          <h3 className="text-base font-bold text-zinc-200">One-Click Remediation</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Click "Fix with fresh context" to auto-assemble an evidence-grounded follow-up prompt and inject it into the chat box without sending.
          </p>
        </div>
      </div>

      {/* How it Works Pipeline */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-zinc-100">How FreshLens Works</h2>
          <p className="text-xs text-zinc-400">Zero host DOM contamination with strict Shadow DOM isolation</p>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-bold">01 / Detect</span>
            <h4 className="font-semibold text-zinc-200">Completion Observer</h4>
            <p className="text-zinc-400">
              MutationObserver waits for 1200ms of DOM silence after streaming finishes.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-bold">02 / Prioritize</span>
            <h4 className="font-semibold text-zinc-200">Heuristic Prior</h4>
            <p className="text-zinc-400">
              Identifies volatile categories (releases, pricing, laws) and skips evergreen facts.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-bold">03 / Verify</span>
            <h4 className="font-semibold text-zinc-200">Tavily Engine</h4>
            <p className="text-zinc-400">
              Queries live web sources with category-specific recency and domain authority filters.
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
            <span className="font-mono text-emerald-400 font-bold">04 / Highlight</span>
            <h4 className="font-semibold text-zinc-200">CSS Highlight API</h4>
            <p className="text-zinc-400">
              Paints non-destructive browser highlights with isolated Shadow DOM cards.
            </p>
          </div>
        </div>
      </div>

      {/* 30-Second Judge Quickstart */}
      <div className="bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg font-bold text-emerald-400">
          ⏱️ Try It in 30 Seconds (Hackathon Judge Guide)
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 leading-relaxed">
          <li>
            Download the pre-built zip:{" "}
            <a
              href="/downloads/freshlens-latest.zip"
              download
              className="text-emerald-400 underline font-semibold"
            >
              freshlens-latest.zip
            </a>{" "}
            and extract it.
          </li>
          <li>
            Open Chrome and navigate to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">chrome://extensions</code>.
          </li>
          <li>
            Toggle <strong>Developer mode</strong> on (top right) and click <strong>Load unpacked</strong>.
          </li>
          <li>
            Select the extracted folder. FreshLens is now loaded with <strong>Demo Mode ON</strong>!
          </li>
          <li>
            Open the <button onClick={() => onNavigate("chat")} className="text-emerald-400 underline font-semibold">Live Demo Chat</button> tab to test instant highlighting and popovers.
          </li>
        </ol>
      </div>

      {/* Footer */}
      <footer className="pt-8 border-t border-zinc-800 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          FreshLens · Built for Geek Room Global AI Hackathon (Tavily Track #1)
        </div>
        <div className="flex gap-4">
          <a
            href="https://github.com/maximhq/bifrost"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition"
          >
            Also available as FreshGate Bifrost Gateway Plugin →
          </a>
        </div>
      </footer>
    </div>
  );
};
