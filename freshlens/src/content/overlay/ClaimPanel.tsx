import React, { useState } from "react";
import { type VerifyResponse, type ClaimResult } from "../../shared/contract";
import { type SiteAdapter } from "../adapters/types";
import { ScoreRing } from "./ScoreRing";
import { executeFixWithFreshContext } from "../actions/fixPrompt";
import { generateMarkdownReport, copyToClipboard } from "../actions/copyReport";

interface ClaimPanelProps {
  response: VerifyResponse;
  adapter: SiteAdapter;
  onClose: () => void;
  onScrollToClaim: (claimId: string) => void;
}

export const ClaimPanel: React.FC<ClaimPanelProps> = ({
  response,
  adapter,
  onClose,
  onScrollToClaim,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedEvId, setExpandedEvId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFix = () => {
    const res = executeFixWithFreshContext(adapter, response);
    if (res.success) {
      showToast("Inserted prompt into chat! Review and press send.");
    } else {
      showToast("No stale claims to remediate, or input box not found.");
    }
  };

  const handleCopyCorrected = async () => {
    const text = response.corrected_text || "No correction available.";
    const ok = await copyToClipboard(text);
    showToast(ok ? "Copied corrected answer!" : "Failed to copy.");
  };

  const handleCopyReport = async () => {
    const report = generateMarkdownReport(response);
    const ok = await copyToClipboard(report);
    showToast(ok ? "Copied Markdown report!" : "Failed to copy.");
  };

  // Sort claims: stale -> aging -> fresh
  const sortedClaims = [...response.claims].sort((a, b) => {
    const order = { stale: 0, aging: 1, fresh: 2 };
    return order[a.band] - order[b.band];
  });

  const { score, band, claims_total, stale_count } = response.overall;

  return (
    <>
      <div className="fl-panel">
        {/* Header */}
        <div className="fl-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ScoreRing score={score} band={band} size={28} strokeWidth={3} />
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "#f4f4f5" }}>
                Freshness {score}/100
              </div>
              <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                {stale_count > 0 ? `${stale_count} stale claims found` : "All claims verified current"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#a1a1aa",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Action Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "10px 16px",
            borderBottom: "1px solid #27272a",
            background: "#141417",
          }}
        >
          {stale_count > 0 && (
            <button className="fl-button fl-button-primary" onClick={handleFix}>
              ✨ Fix with fresh context
            </button>
          )}
          <button className="fl-button fl-button-secondary" onClick={handleCopyCorrected}>
            Copy correction
          </button>
          <button className="fl-button fl-button-secondary" onClick={handleCopyReport}>
            Report
          </button>
        </div>

        {/* Body Claims List */}
        <div className="fl-panel-body">
          {sortedClaims.map((item) => {
            const badgeClass = `fl-badge fl-badge-${item.band}`;
            const isEvOpen = expandedEvId === item.claim.id;

            return (
              <div key={item.claim.id} className="fl-claim-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span className={badgeClass}>{item.band.toUpperCase()}</span>
                  <span style={{ fontSize: "11px", color: "#71717a" }}>
                    Score {item.freshness} · {item.claim.category}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#f4f4f5",
                    marginBottom: "6px",
                    cursor: "pointer",
                  }}
                  onClick={() => onScrollToClaim(item.claim.id)}
                  title="Click to jump to highlight"
                >
                  "{item.claim.text}"
                </div>

                {item.correction && (
                  <div
                    style={{
                      background: "#27272a",
                      padding: "6px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#f87171",
                      marginBottom: "6px",
                    }}
                  >
                    <strong>Update: </strong>
                    {item.correction}
                  </div>
                )}

                {item.reasoning && (
                  <div style={{ fontSize: "11px", color: "#a1a1aa", marginBottom: "6px" }}>
                    {item.reasoning}
                  </div>
                )}

                {item.evidence.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedEvId(isEvOpen ? null : item.claim.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#34d399",
                        fontSize: "11px",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline",
                      }}
                    >
                      {isEvOpen ? "Hide evidence ▲" : `View ${item.evidence.length} sources ▼`}
                    </button>

                    {isEvOpen && (
                      <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {item.evidence.map((ev, i) => (
                          <div
                            key={ev.id || i}
                            style={{
                              padding: "6px",
                              background: "#09090b",
                              borderRadius: "4px",
                              border: "1px solid #27272a",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "none" }}
                              >
                                {ev.domain} ({ev.authority})
                              </a>
                              {ev.published_date && (
                                <span style={{ color: "#71717a" }}>
                                  {ev.published_date.slice(0, 10)}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#d4d4d8", marginTop: "3px" }}>
                              {ev.snippet}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Metrics */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #27272a",
            fontSize: "10px",
            color: "#71717a",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Tavily Credits: {response.usage.tavily_credits}</span>
          <span>Engine Latency: {response.latency_ms}ms</span>
          <span>Verified via FreshGate</span>
        </div>
      </div>

      {toastMessage && <div className="fl-toast">{toastMessage}</div>}
    </>
  );
};
