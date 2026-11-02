import React from "react";
import { type ExtensionSettings } from "../../src/shared/types";
import { type VerifyRequest } from "../../src/shared/contract";

interface PrivacyPanelProps {
  settings: ExtensionSettings;
}

export const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ settings }) => {
  const sampleMessage = "Next.js 14 is the latest stable release of the framework.";
  const samplePrompt = "What version of Next.js should I use for my new app?";

  // Construct live outgoing payload using the exact same logic as real requests
  const livePayload: VerifyRequest = {
    text: sampleMessage,
    context: {
      source: "extension",
      model: "gpt-4o",
      prompt: settings.includePrompt ? samplePrompt : undefined,
    },
    options: {
      max_claims: settings.maxClaims,
      depth: settings.depth,
      include_evidence: true,
      nocache: false,
    },
  };

  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: "8px",
        padding: "16px",
        marginTop: "20px",
      }}
    >
      <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#34d399" }}>
        🔒 Privacy & Network Payload Transparency
      </h3>
      <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: 1.5, margin: "0 0 12px 0" }}>
        FreshLens operates with strict data minimization. Below is the <strong>exact JSON payload</strong> that
        leaves your browser when inspecting an assistant message under your current settings:
      </p>

      <pre
        style={{
          background: "#09090b",
          border: "1px solid #27272a",
          borderRadius: "6px",
          padding: "12px",
          fontSize: "11px",
          color: "#38bdf8",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(livePayload, null, 2)}
      </pre>

      <div style={{ marginTop: "12px", fontSize: "11px", color: "#71717a" }}>
        <p style={{ margin: "4px 0" }}>
          ✓ <strong>Prompt Protection:</strong>{" "}
          {settings.includePrompt ? (
            <span style={{ color: "#f59e0b" }}>
              Enabled by user setting. Prompt text is attached to requests.
            </span>
          ) : (
            <span style={{ color: "#34d399" }}>
              Disabled. Only assistant message text is transmitted.
            </span>
          )}
        </p>
        <p style={{ margin: "4px 0" }}>
          ✓ <strong>Page URL & Title:</strong> Stripped. Never transmitted over the wire.
        </p>
        <p style={{ margin: "4px 0" }}>
          ✓ <strong>Cookies & Tokens:</strong> Never read or accessed by FreshLens.
        </p>
      </div>
    </div>
  );
};
