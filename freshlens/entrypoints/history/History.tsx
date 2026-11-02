import React, { useState, useEffect } from "react";
import { getHistory, removeHistoryItem, clearHistory } from "../../src/background/history";
import { ScoreRing } from "../../src/content/overlay/ScoreRing";
import { type HistoryItem } from "../../src/shared/types";
import { type Band } from "../../src/shared/contract";

export const History: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState<"all" | Band>("all");
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    getHistory().then((h) => {
      setHistory(h);
      if (h.length > 0) setSelectedItem(h[0]);
    });
  }, []);

  const handleDelete = async (id: string) => {
    await removeHistoryItem(id);
    const updated = history.filter((i) => i.id !== id);
    setHistory(updated);
    if (selectedItem?.id === id) {
      setSelectedItem(updated[0] || null);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Delete all inspection history?")) {
      await clearHistory();
      setHistory([]);
      setSelectedItem(null);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `freshlens-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const filteredHistory = history.filter((item) => {
    if (bandFilter !== "all" && item.overall.band !== bandFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const inText = item.sampleText.toLowerCase().includes(q);
      const inSite = item.site.toLowerCase().includes(q);
      const inClaims = item.claims.some((c) =>
        c.claim.text.toLowerCase().includes(q) || (c.correction && c.correction.toLowerCase().includes(q))
      );
      return inText || inSite || inClaims;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "40px auto", padding: "0 24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "16px",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>
            FreshLens Inspection History
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#71717a" }}>
            Audit log of verified assistant responses and evidence sources
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleExportJson}
            disabled={history.length === 0}
            style={{
              padding: "6px 12px",
              background: "#27272a",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              color: "#e4e4e7",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Export JSON
          </button>
          <button
            onClick={handleClearAll}
            disabled={history.length === 0}
            style={{
              padding: "6px 12px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "6px",
              color: "#f87171",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: "flex", gap: "12px", margin: "16px 0" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search claims, sites, or text..."
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            color: "#e4e4e7",
            fontSize: "13px",
          }}
        />

        <select
          value={bandFilter}
          onChange={(e) => setBandFilter(e.target.value as any)}
          style={{
            padding: "8px 12px",
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "6px",
            color: "#e4e4e7",
            fontSize: "13px",
          }}
        >
          <option value="all">All Freshness Bands</option>
          <option value="stale">Stale Only (&lt;45)</option>
          <option value="aging">Aging Only (45-74)</option>
          <option value="fresh">Fresh Only (&gt;=75)</option>
        </select>
      </div>

      {/* Content Columns */}
      {filteredHistory.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#71717a" }}>
          No inspection history found matching your filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "20px" }}>
          {/* List Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "680px", overflowY: "auto" }}>
            {filteredHistory.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  style={{
                    padding: "12px",
                    background: isSelected ? "#27272a" : "#18181b",
                    border: `1px solid ${isSelected ? "#10b981" : "#27272a"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "#34d399", textTransform: "uppercase" }}>
                      {item.site}
                    </span>
                    <span style={{ fontSize: "10px", color: "#71717a" }}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ScoreRing score={item.overall.score} band={item.overall.band} size={24} strokeWidth={2.5} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#f4f4f5",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.sampleText}
                      </div>
                      <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                        {item.overall.staleCount > 0 ? `${item.overall.staleCount} stale claims` : "Verified current"}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Details Column */}
          {selectedItem && (
            <div
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "20px",
                maxHeight: "680px",
                overflowY: "auto",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <ScoreRing
                    score={selectedItem.overall.score}
                    band={selectedItem.overall.band}
                    size={36}
                    strokeWidth={3.5}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
                      Freshness Score: {selectedItem.overall.score}/100
                    </h2>
                    <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                      Platform: {selectedItem.site} · Checked: {new Date(selectedItem.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  style={{
                    padding: "4px 8px",
                    background: "none",
                    border: "1px solid #3f3f46",
                    borderRadius: "4px",
                    color: "#f87171",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  Delete Record
                </button>
              </div>

              {/* Sample Response */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", marginBottom: "4px" }}>
                  Inspected Text
                </div>
                <div
                  style={{
                    background: "#09090b",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #27272a",
                    fontSize: "12px",
                    color: "#d4d4d8",
                    lineHeight: 1.5,
                  }}
                >
                  {selectedItem.sampleText}
                </div>
              </div>

              {/* Claims Breakdown */}
              <div>
                <div style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", marginBottom: "8px" }}>
                  Claims Breakdown ({selectedItem.claims.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {selectedItem.claims.map((c) => (
                    <div
                      key={c.claim.id}
                      style={{
                        padding: "10px 12px",
                        background: "#09090b",
                        border: "1px solid #27272a",
                        borderRadius: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background:
                              c.band === "stale"
                                ? "rgba(239, 68, 68, 0.15)"
                                : c.band === "aging"
                                ? "rgba(245, 158, 11, 0.15)"
                                : "rgba(16, 185, 129, 0.15)",
                            color:
                              c.band === "stale"
                                ? "#f87171"
                                : c.band === "aging"
                                ? "#fbbf24"
                                : "#34d399",
                          }}
                        >
                          {c.band.toUpperCase()} (Score {c.freshness})
                        </span>
                        <span style={{ fontSize: "11px", color: "#71717a" }}>
                          {c.claim.category}
                        </span>
                      </div>

                      <div style={{ fontSize: "12px", color: "#f4f4f5", marginBottom: "6px" }}>
                        "{c.claim.text}"
                      </div>

                      {c.correction && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#f87171",
                            background: "#18181b",
                            padding: "6px 8px",
                            borderRadius: "4px",
                            marginBottom: "6px",
                          }}
                        >
                          <strong>Correction: </strong>
                          {c.correction}
                        </div>
                      )}

                      {c.evidence.length > 0 && (
                        <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                          <span>Sources: </span>
                          {c.evidence.map((ev, i) => (
                            <a
                              key={ev.id || i}
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#38bdf8", marginRight: "8px", textDecoration: "underline" }}
                            >
                              {ev.domain}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
