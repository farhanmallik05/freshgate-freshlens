"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart2, ShieldCheck, Terminal, Settings } from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import { checkEngineReady } from "../lib/api";

export function Header() {
  const pathname = usePathname();
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    checkEngineReady().then((res) => setIsReady(res.ok));
    const isDemo = typeof window !== "undefined" && localStorage.getItem("fg_demo_mode") === "1";
    setDemoMode(isDemo);
  }, []);

  const navItems = [
    { label: "Live Feed", href: "/", icon: Activity },
    { label: "Overview", href: "/overview", icon: BarChart2 },
    { label: "Playground", href: "/verify", icon: Terminal },
    { label: "StaleBench", href: "/bench", icon: ShieldCheck },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const toggleDemo = () => {
    const next = !demoMode;
    setDemoMode(next);
    localStorage.setItem("fg_demo_mode", next ? "1" : "0");
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 w-full items-center justify-between border-b border-zinc-800/80 bg-[#09090b]/90 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-mono text-base font-bold tracking-tight">FreshGate</span>
          <span className="rounded bg-zinc-800 border border-zinc-700/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
            v1.0
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 font-sans">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                  active
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    active ? "text-emerald-400" : "text-zinc-400"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleDemo}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[11px] font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            demoMode
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold"
              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white"
          )}
        >
          {demoMode ? "Demo Mode ON" : "Live Mode"}
        </button>

        <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs">
          <span
            className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              isReady ? "bg-emerald-500" : "bg-amber-500"
            )}
          />
          <span className="font-mono text-[11px] text-zinc-300">
            {isReady ? "Engine: Ready" : "Engine: Standby"}
          </span>
        </div>
      </div>
    </header>
  );
}
