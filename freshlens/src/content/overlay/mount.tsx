import React from "react";
import ReactDOM from "react-dom/client";
import { type SiteAdapter } from "../adapters/types";
import { OverlayApp } from "./OverlayApp";
import { SHADOW_STYLES } from "./styles";
import { type ChipState } from "./BadgeChip";

export interface MountHandle {
  host: HTMLElement;
  shadowRoot: ShadowRoot;
  setResult: (response: any) => void;
  setError: (error: any) => void;
  setState: (state: ChipState) => void;
  setPopover: (detail: any) => void;
  unmount: () => void;
}

export function mountOverlay(
  anchorElement: HTMLElement,
  adapter: SiteAdapter,
  messageId: string,
  initialState: ChipState,
  onTriggerCheck: () => void,
  onScrollToClaim: (claimId: string) => void
): MountHandle {
  const host = document.createElement("div");
  host.className = "freshlens-host";
  host.id = `freshlens-root-${messageId}`;
  host.style.display = "inline-block";

  // Create isolated Shadow DOM
  const shadowRoot = host.attachShadow({ mode: "open" });

  // Injected CSS
  const styleEl = document.createElement("style");
  styleEl.textContent = SHADOW_STYLES;
  shadowRoot.appendChild(styleEl);

  const reactContainer = document.createElement("div");
  shadowRoot.appendChild(reactContainer);

  const root = ReactDOM.createRoot(reactContainer);
  root.render(
    <React.StrictMode>
      <OverlayApp
        adapter={adapter}
        messageId={messageId}
        initialState={initialState}
        onTriggerCheck={onTriggerCheck}
        onScrollToClaim={onScrollToClaim}
      />
    </React.StrictMode>
  );

  anchorElement.appendChild(host);

  return {
    host,
    shadowRoot,
    setResult: (response) => {
      window.dispatchEvent(
        new CustomEvent("fl-set-result", {
          detail: { messageId, response },
        })
      );
    },
    setError: (error) => {
      window.dispatchEvent(
        new CustomEvent("fl-set-error", {
          detail: { messageId, error },
        })
      );
    },
    setState: (state) => {
      window.dispatchEvent(
        new CustomEvent("fl-set-state", {
          detail: { messageId, state },
        })
      );
    },
    setPopover: (detail) => {
      window.dispatchEvent(
        new CustomEvent("fl-set-popover", {
          detail: { messageId, detail },
        })
      );
    },
    unmount: () => {
      root.unmount();
      host.remove();
    },
  };
}
