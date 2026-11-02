import React, { useState } from "react";
import { checkHealth } from "../../src/background/engineClient";

export const Onboarding: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    latencyMs: number;
    error?: string;
  } | null>(null);

  const runTest = async () => {
    setTesting(true);
    const res = await checkHealth("http://localhost:3001");
    setTestResult(res);
    setTesting(false);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "60px auto", padding: "0 24px" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#10b981",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "22px",
            color: "#000",
            marginBottom: "16px",
          }}
        >
          FL
        </div>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: 800 }}>
          Welcome to FreshLens
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#a1a1aa" }}>
          Live factual freshness & anti-staleness inspection for ChatGPT and Claude
        </p>
      </div>

      {/* 3 Step Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Step 1 */}
        <div
          style={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#27272a",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              1
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
              Verify Engine or Keep Demo Mode Enabled
            </h2>
          </div>
          <p style={{ margin: "0 0 12px 34px", fontSize: "13px", color: "#a1a1aa" }}>
            FreshLens is pre-configured with <strong>Demo Mode ON</strong> so you can test all features
            instantly without running a backend. If you are running the FreshGate Engine locally, verify connectivity below:
          </p>
          <div style={{ marginLeft: "34px" }}>
            <button
              onClick={runTest}
              disabled={testing}
              style={{
                padding: "8px 14px",
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                color: "#f4f4f5",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {testing ? "Testing http://localhost:3001..." : "Test Local Engine (/healthz)"}
            </button>
            {testResult && (
              <span
                style={{
                  marginLeft: "12px",
                  fontSize: "12px",
                  color: testResult.ok ? "#34d399" : "#f59e0b",
                }}
              >
                {testResult.ok
                  ? `✓ Engine connected (${testResult.latencyMs}ms)`
                  : "Engine not running yet; Demo Mode will serve offline fixtures."}
              </span>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div
          style={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#27272a",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              2
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
              Open Any ChatGPT or Claude Conversation
            </h2>
          </div>
          <p style={{ margin: "0 0 0 34px", fontSize: "13px", color: "#a1a1aa" }}>
            Navigate to <strong>chatgpt.com</strong> or <strong>claude.ai</strong>. As soon as the assistant completes an answer, FreshLens analyzes time-sensitive claims automatically.
          </p>
        </div>

        {/* Step 3 */}
        <div
          style={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "10px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "#27272a",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "12px",
              }}
            >
              3
            </span>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
              Hover Highlights & Remediate with One Click
            </h2>
          </div>
          <p style={{ margin: "0 0 12px 34px", fontSize: "13px", color: "#a1a1aa" }}>
            Claims are highlighted by freshness tier (solid green, dashed amber, wavy red). Click the badge to open the inspection drawer, or click <strong>"Fix with fresh context"</strong> to insert an evidence-backed update prompt.
          </p>
          <div style={{ marginLeft: "34px" }}>
            <a
              href="http://localhost:3000/verify"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "#10b981",
                borderRadius: "6px",
                color: "#000",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Try FreshLens on Interactive Demo Page →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
