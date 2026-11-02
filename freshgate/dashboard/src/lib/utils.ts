import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Band, Verdict } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBandBadge(band: Band) {
  switch (band) {
    case "fresh":
      return {
        bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
        pill: "bg-emerald-500",
        label: "Fresh",
      };
    case "aging":
      return {
        bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        pill: "bg-amber-500",
        label: "Aging",
      };
    case "stale":
      return {
        bg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        pill: "bg-rose-500",
        label: "Stale",
      };
  }
}

export function getVerdictBadge(verdict: Verdict) {
  switch (verdict) {
    case "current":
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        label: "Current",
      };
    case "stale":
      return {
        bg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
        label: "Outdated",
      };
    case "unverifiable":
      return {
        bg: "bg-zinc-500/10 border-zinc-500/20 text-zinc-400",
        label: "Unverifiable",
      };
  }
}

export function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return new Date(isoString).toLocaleDateString();
}
