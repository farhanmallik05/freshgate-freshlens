import React from "react";
import { type VerifyResponse } from "../../shared/contract";
import { type ExtensionError } from "../../shared/types";
import { ScoreRing } from "./ScoreRing";

export type ChipState = "idle" | "checking" | "done" | "empty" | "error" | "outdated";

interface BadgeChipProps {
  state: ChipState;
  response: VerifyResponse | null;
  error: ExtensionError | null;
  onOpenPanel: () => void;
  onTriggerCheck: () => void;
}

export const BadgeChip: React.FC<BadgeChipProps> = ({
  state,
  response,
  error,
  onOpenPanel,
  onTriggerCheck,
}) => {
  if (state === "idle") {
    return (
      <div className="fl-chip-container">
        <button
          className="fl-chip"
          onClick={onTriggerCheck}
          title="Analyze freshness of this response"
        >
          <span style={{ fontSize: "11px", color: "#a1a1aa" }}>🔍 Check freshness</span>
        </button>
      </div>
    );
  }

  if (state === "checking") {
    return (
      <div className="fl-chip-container">
        <div className="fl-chip" style={{ cursor: "wait" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
              animation: "pulse 1.2s infinite ease-in-out",
            }}
          />
          <span style={{ fontSize: "11px", color: "#d4d4d8" }}>Verifying live...</span>
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="fl-chip-container">
        <div className="fl-chip" onClick={onOpenPanel} title="All statements appear evergreen">
          <span style={{ fontSize: "11px", color: "#34d399" }}>✓ Evergreen</span>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="fl-chip-container">
        <button className="fl-chip fl-chip-stale" onClick={onTriggerCheck} title={error?.message}>
          <span style={{ fontSize: "11px" }}>⚠️ Verification failed (Retry)</span>
        </button>
      </div>
    );
  }

  if (state === "outdated") {
    return (
      <div className="fl-chip-container">
        <button className="fl-chip fl-chip-aging" onClick={onTriggerCheck}>
          <span style={{ fontSize: "11px" }}>↻ Content edited (Re-check)</span>
        </button>
      </div>
    );
  }

  if (state === "done" && response) {
    const { score, band, stale_count, claims_checked } = response.overall;
    const bandClass = `fl-chip-${band}`;

    let label = `${score} Fresh`;
    if (stale_count > 0) {
      label = `${score} · ${stale_count} Stale`;
    } else if (claims_checked === 0) {
      label = `${score} Fresh`;
    }

    return (
      <div className="fl-chip-container">
        <button
          className={`fl-chip ${bandClass}`}
          onClick={onOpenPanel}
          title="Click to view verified claims and evidence sources"
        >
          <ScoreRing score={score} band={band} size={18} strokeWidth={2.2} />
          <span style={{ fontSize: "11px", fontWeight: 600 }}>{label}</span>
        </button>
      </div>
    );
  }

  return null;
};
