import React from "react";
import { cn } from "../lib/utils";

interface DoubleBezelCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}

export function DoubleBezelCard({
  children,
  className,
  innerClassName,
  ...props
}: DoubleBezelCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-1.5 ring-1 ring-white/5 transition-all duration-200 hover:ring-white/10",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
