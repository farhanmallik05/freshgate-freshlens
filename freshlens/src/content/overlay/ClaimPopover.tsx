import React from "react";
import { type ClaimResult } from "../../shared/contract";

interface ClaimPopoverProps {
  claimResult: ClaimResult;
  rect: DOMRect;
  onClose: () => void;
  onOpenPanel: () => void;
}

export const ClaimPopover: React.FC<ClaimPopoverProps> = ({
  claimResult,
  rect,
  onClose,
  onOpenPanel,
}) => {
  // Compute safe viewport position
  const top = Math.min(window.innerHeight - 200, Math.max(10, rect.bottom + 8));
  const left = Math.min(window.innerWidth - 340, Math.max(10, rect.left));

  const badgeClass = `fl-badge fl-badge-${claimResult.band}`;

  return (
    <div
      className="fl-popover"
      style={{ top: `${top}px`, left: `${left}px` }}
      onMouseLeave={onClose}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span className={badgeClass}>
          {claimResult.band.toUpperCase()} · Score {claimResult.freshness}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#a1a1aa",
            cursor: "pointer",
            fontSize: "14px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ fontSize: "12px", color: "#e4e4e7", marginBottom: "6px", fontStyle: "italic" }}>
        "{claimResult.claim.text}"
      </div>

      {claimResult.correction && (
        <div
          style={{
            background: "#18181b",
            padding: "6px 8px",
            borderRadius: "4px",
            borderLeft: "2px solid #ef4444",
            fontSize: "12px",
            color: "#f4f4f5",
            marginBottom: "8px",
          }}
        >
          <strong style={{ color: "#f87171" }}>Correction: </strong>
          {claimResult.correction}
        </div>
      )}

      {claimResult.evidence.length > 0 && (
        <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "8px" }}>
          <span>Sources: </span>
          {claimResult.evidence.slice(0, 2).map((ev, i) => (
            <a
              key={ev.id || i}
              href={ev.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#34d399", textDecoration: "underline", marginRight: "6px" }}
            >
              {ev.domain}
            </a>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onOpenPanel}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            fontSize: "11px",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Open details panel →
        </button>
      </div>
    </div>
  );
};
