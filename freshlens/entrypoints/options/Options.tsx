import React, { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../../src/shared/settings";
import { checkHealth, requestEnginePermission } from "../../src/background/engineClient";
import { clearHistory } from "../../src/background/history";
import { clearCache } from "../../src/background/cache";
import { PrivacyPanel } from "./PrivacyPanel";
import { type ExtensionSettings } from "../../src/shared/types";

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleUpdate = async (patch: Partial<ExtensionSettings>) => {
    if (!settings) return;
    const updated = await saveSettings(patch);
    setSettings(updated);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!settings) return;
    setTesting(true);

    // Request origin permission if needed
    await requestEnginePermission(settings.engineUrl);

    const res = await checkHealth(settings.engineUrl, settings.apiKey);
    setTestResult(res);
    setTesting(false);
  };

  const handleClearAllData = async () => {
    if (confirm("Clear local verification cache and history?")) {
      await clearHistory();
      await clearCache();
      alert("Local history and session cache cleared.");
    }
  };

  const handleExport = () => {
    if (!settings) return;
    const exportable = { ...settings, apiKey: "" }; // Exclude key by default
    const blob = new Blob([JSON.stringify(exportable, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "freshlens-settings.json";
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        await handleUpdate(json);
        alert("Settings imported successfully.");
      } catch {
        alert("Failed to parse settings JSON file.");
      }
    };
    reader.readAsText(file);
  };

  if (!settings) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: "680px", margin: "40px auto", padding: "0 20px" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "14px",
              color: "#000",
            }}
          >
            FL
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              FreshLens Configuration
            </h1>
            <p style={{ margin: 0, fontSize: "12px", color: "#71717a" }}>
              Tailor live fact-verification, Tavily depth, and privacy behavior
            </p>
          </div>
        </div>

        {savedFeedback && (
          <span style={{ fontSize: "12px", color: "#34d399", fontWeight: 600 }}>
            ✓ Settings saved
          </span>
        )}
      </div>

      {/* Main Settings Form */}
      <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Engine Connection */}
        <div style={{ background: "#18181b", padding: "16px", borderRadius: "8px", border: "1px solid #27272a" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#f4f4f5" }}>
            FreshGate Engine Connection
          </h2>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
              Engine Base URL
            </label>
            <input
              type="text"
              value={settings.engineUrl}
              onChange={(e) => handleUpdate({ engineUrl: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: "6px",
                color: "#e4e4e7",
                fontSize: "13px",
                boxSizing: "border-box",
              }}
              placeholder="http://localhost:3001"
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
              Engine API Key (Bearer)
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type={showKey ? "text" : "password"}
                value={settings.apiKey}
                onChange={(e) => handleUpdate({ apiKey: e.target.value })}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  color: "#e4e4e7",
                  fontSize: "13px",
                }}
                placeholder="Optional if engine auth is disabled"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  padding: "8px 12px",
                  background: "#27272a",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                  color: "#e4e4e7",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <div style={{ fontSize: "11px", color: "#71717a", marginTop: "4px" }}>
              API key is stored locally in chrome.storage.local and never synced to external clouds.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                border: "none",
                borderRadius: "6px",
                color: "#000",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {testing ? "Testing..." : "Test Connection (/healthz)"}
            </button>

            {testResult && (
              <span
                style={{
                  fontSize: "12px",
                  color: testResult.ok ? "#34d399" : "#ef4444",
                  fontWeight: 500,
                }}
              >
                {testResult.ok
                  ? `✓ Engine reachable (${testResult.latencyMs}ms)`
                  : `✗ Error: ${testResult.error}`}
              </span>
            )}
          </div>
        </div>

        {/* Verification Options */}
        <div style={{ background: "#18181b", padding: "16px", borderRadius: "8px", border: "1px solid #27272a" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#f4f4f5" }}>
            Verification Depth & Scope
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
                Verification Depth
              </label>
              <select
                value={settings.depth}
                onChange={(e) => handleUpdate({ depth: e.target.value as any })}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  color: "#e4e4e7",
                  fontSize: "13px",
                }}
              >
                <option value="fast">Fast (~1 credit/claim, search snippets)</option>
                <option value="thorough">Thorough (up to 2 credits, page extract)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#a1a1aa", marginBottom: "4px" }}>
                Max Claims Checked per Answer
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.maxClaims}
                onChange={(e) => handleUpdate({ maxClaims: parseInt(e.target.value, 10) || 5 })}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "6px",
                  color: "#e4e4e7",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.demoMode}
                onChange={(e) => handleUpdate({ demoMode: e.target.checked })}
              />
              <span>
                <strong>Demo Mode (Offline Fixtures):</strong> Use instant pre-computed verification fixtures for hackathon testing without an active engine.
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.ignoreCodeBlocks}
                onChange={(e) => handleUpdate({ ignoreCodeBlocks: e.target.checked })}
              />
              <span>
                <strong>Ignore Code Blocks:</strong> Skip programming source snippets inside `pre` and `code` tags.
              </span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.includePrompt}
                onChange={(e) => handleUpdate({ includePrompt: e.target.checked })}
              />
              <span>
                <strong>Include Prompt for Context:</strong> (Default OFF) Send your question to the engine to assist in claim extraction.
              </span>
            </label>
          </div>
        </div>

        {/* Per-Site Auto Check */}
        <div style={{ background: "#18181b", padding: "16px", borderRadius: "8px", border: "1px solid #27272a" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#f4f4f5" }}>
            Auto-Check by Platform
          </h2>
          <div style={{ display: "flex", gap: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={settings.autoCheck.chatgpt}
                onChange={(e) =>
                  handleUpdate({ autoCheck: { ...settings.autoCheck, chatgpt: e.target.checked } })
                }
              />
              ChatGPT
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={settings.autoCheck.claude}
                onChange={(e) =>
                  handleUpdate({ autoCheck: { ...settings.autoCheck, claude: e.target.checked } })
                }
              />
              Claude.ai
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={settings.autoCheck.demo}
                onChange={(e) =>
                  handleUpdate({ autoCheck: { ...settings.autoCheck, demo: e.target.checked } })
                }
              />
              Demo Chat / Localhost
            </label>
          </div>
        </div>

        {/* Data & Backup */}
        <div style={{ background: "#18181b", padding: "16px", borderRadius: "8px", border: "1px solid #27272a" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#f4f4f5" }}>
            Data & Backup
          </h2>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={handleExport}
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
              Export Settings JSON
            </button>

            <label
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
              Import JSON
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </label>

            <button
              onClick={handleClearAllData}
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
              Clear Cache & History
            </button>
          </div>
        </div>

        {/* Live Privacy Panel */}
        <PrivacyPanel settings={settings} />
      </div>
    </div>
  );
};
