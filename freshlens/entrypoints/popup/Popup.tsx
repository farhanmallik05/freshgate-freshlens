import React, { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../../src/shared/settings";
import { checkHealth } from "../../src/background/engineClient";
import { getHistory } from "../../src/background/history";
import { ScoreRing } from "../../src/content/overlay/ScoreRing";
import { type ExtensionSettings, type HistoryItem } from "../../src/shared/types";

export const Popup: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    ok: boolean;
    latencyMs: number;
    error?: string;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [lastCheck, setLastCheck] = useState<HistoryItem | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      runHealthCheck(s);
    });

    getHistory().then((h) => {
      if (h.length > 0) {
        setLastCheck(h[0]);
      }
    });

    if (typeof chrome !== "undefined" && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          setCurrentUrl(tabs[0].url);
        }
      });
    }
  }, []);

  const runHealthCheck = async (s: ExtensionSettings) => {
    setCheckingHealth(true);
    const res = await checkHealth(s.engineUrl, s.apiKey);
    setHealthStatus(res);
    setCheckingHealth(false);
  };

  const isSupportedSite =
    currentUrl.includes("chatgpt.com") ||
    currentUrl.includes("claude.ai") ||
    currentUrl.includes("localhost") ||
    currentUrl.includes("demo-chat");

  const toggleDemoMode = async () => {
    if (!settings) return;
    const updated = await saveSettings({ demoMode: !settings.demoMode });
    setSettings(updated);
  };

  const handleCheckSelection = () => {
    if (typeof chrome === "undefined" || !chrome.tabs?.query) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "GET_CURRENT_SELECTION" }, (res) => {
          if (res?.text) {
            chrome.runtime.sendMessage({
              type: "CHECK_SELECTION",
              payload: { id: `sel_${Date.now()}`, text: res.text },
            });
          }
        });
      }
    });
  };

  const openOptions = () => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("entrypoints/options/index.html"));
    }
  };

  const openHistory = () => {
    window.open(chrome.runtime.getURL("entrypoints/history/index.html"));
  };

  if (!settings) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#71717a" }}>
        Loading FreshLens...
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", background: "#09090b", color: "#f4f4f5" }}>
      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "12px",
          borderBottom: "1px solid #27272a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "13px",
              color: "#000",
            }}
          >
            FL
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", lineHeight: 1.2 }}>
              FreshLens
            </div>
            <div style={{ fontSize: "10px", color: "#71717a" }}>
              Live AI Fact Inspector
            </div>
          </div>
        </div>

        <button
          onClick={toggleDemoMode}
          style={{
            fontSize: "11px",
            padding: "3px 8px",
            borderRadius: "9999px",
            border: `1px solid ${settings.demoMode ? "#10b981" : "#3f3f46"}`,
            background: settings.demoMode ? "rgba(16, 185, 129, 0.15)" : "#18181b",
            color: settings.demoMode ? "#34d399" : "#a1a1aa",
            cursor: "pointer",
            fontWeight: 600,
          }}
          title="Demo mode returns instant pre-computed verification fixtures without an active engine"
        >
          {settings.demoMode ? "Demo Mode ON" : "Live Engine"}
        </button>
      </div>

      {/* Active Tab State */}
      <div
        style={{
          marginTop: "12px",
          padding: "10px 12px",
          borderRadius: "8px",
          background: "#18181b",
          border: "1px solid #27272a",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ color: "#a1a1aa" }}>Current Tab:</span>
          <span style={{ fontWeight: 600, color: isSupportedSite ? "#34d399" : "#f59e0b" }}>
            {isSupportedSite ? "Supported AI Chat" : "General Webpage"}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
          <span style={{ color: "#71717a" }}>FreshGate Engine:</span>
          <span>
            {settings.demoMode ? (
              <span style={{ color: "#34d399" }}>Offline Mock (Ready)</span>
            ) : checkingHealth ? (
              <span style={{ color: "#a1a1aa" }}>Checking...</span>
            ) : healthStatus?.ok ? (
              <span style={{ color: "#34d399" }}>Connected ({healthStatus.latencyMs}ms)</span>
            ) : (
              <span style={{ color: "#ef4444" }}>Unreachable</span>
            )}
          </span>
        </div>
      </div>

      {/* Quick Action */}
      <div style={{ marginTop: "12px" }}>
        <button
          onClick={handleCheckSelection}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "#27272a",
            border: "1px solid #3f3f46",
            borderRadius: "6px",
            color: "#e4e4e7",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <span>🎯 Check selected text</span>
          <span style={{ fontSize: "10px", color: "#71717a" }}>(Alt+Shift+F)</span>
        </button>
      </div>

      {/* Last Check Summary */}
      {lastCheck && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "#18181b",
            border: "1px solid #27272a",
          }}
        >
          <div style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", marginBottom: "6px" }}>
            Last Inspection ({lastCheck.site})
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ScoreRing
              score={lastCheck.overall.score}
              band={lastCheck.overall.band}
              size={32}
              strokeWidth={3}
            />
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700 }}>
                Freshness: {lastCheck.overall.score}/100
              </div>
              <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                {lastCheck.overall.staleCount > 0
                  ? `${lastCheck.overall.staleCount} stale claims detected`
                  : "All claims verified current"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <div
        style={{
          marginTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          paddingTop: "12px",
          borderTop: "1px solid #27272a",
          fontSize: "12px",
        }}
      >
        <button
          onClick={openHistory}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          View History
        </button>
        <button
          onClick={openOptions}
          style={{
            background: "none",
            border: "none",
            color: "#60a5fa",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          Settings & Privacy
        </button>
      </div>
    </div>
  );
};
