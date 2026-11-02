import React from "react";
import { type Band } from "../../shared/contract";

interface ScoreRingProps {
  score: number;
  band: Band;
  size?: number;
  strokeWidth?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  band,
  size = 22,
  strokeWidth = 2.5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let strokeColor = "#10b981"; // fresh
  if (band === "aging") strokeColor = "#f59e0b";
  if (band === "stale") strokeColor = "#ef4444";

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#27272a"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontSize: size <= 24 ? "8px" : "10px",
          fontWeight: 700,
          color: strokeColor,
          lineHeight: 1,
        }}
      >
        {clampedScore}
      </span>
    </div>
  );
};
