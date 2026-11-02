import React, { useState, useEffect } from "react";
import { Landing } from "./Landing";
import { Playground } from "./Playground";
import { DemoChat } from "./DemoChat";

export const App: React.FC = () => {
  const [tab, setTab] = useState<"landing" | "playground" | "chat">("landing");

  // Support direct hash navigation for #demo-chat
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === "#demo-chat" || window.location.pathname.includes("demo-chat")) {
      setTab("chat");
    } else if (hash === "#playground") {
      setTab("playground");
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            onClick={() => setTab("landing")}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center font-bold text-xs text-zinc-950">
              FL
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-100">
              FreshLens
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
              v1.0.0
            </span>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2 text-xs">
            <button
              onClick={() => setTab("landing")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                tab === "landing"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab("playground")}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                tab === "playground"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Playground
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
                tab === "chat"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Demo Chat (/demo-chat)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {tab === "landing" && <Landing onNavigate={setTab} />}
        {tab === "playground" && <Playground />}
        {tab === "chat" && <DemoChat />}
      </main>
    </div>
  );
};
