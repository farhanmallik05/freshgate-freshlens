import React, { useState, useEffect } from "react";
import { type VerifyResponse, type ClaimResult } from "../../shared/contract";
import { type ExtensionError } from "../../shared/types";
import { type SiteAdapter } from "../adapters/types";
import { BadgeChip, type ChipState } from "./BadgeChip";
import { ClaimPanel } from "./ClaimPanel";
import { ClaimPopover } from "./ClaimPopover";
import { type HighlightEventDetail } from "../highlighter";

interface OverlayAppProps {
  adapter: SiteAdapter;
  messageId: string;
  initialState?: ChipState;
  onTriggerCheck: () => void;
  onScrollToClaim: (claimId: string) => void;
}

export const OverlayApp: React.FC<OverlayAppProps> = ({
  adapter,
  messageId,
  initialState = "idle",
  onTriggerCheck,
  onScrollToClaim,
}) => {
  const [state, setState] = useState<ChipState>(initialState);
  const [response, setResponse] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<ExtensionError | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [popoverDetail, setPopoverDetail] = useState<HighlightEventDetail | null>(null);

  // Expose state setters through custom events on host or window
  useEffect(() => {
    const handleSetResult = (e: CustomEvent<{ messageId: string; response: VerifyResponse }>) => {
      if (e.detail.messageId === messageId) {
        setResponse(e.detail.response);
        setState("done");
        setError(null);
      }
    };

    const handleSetError = (e: CustomEvent<{ messageId: string; error: ExtensionError }>) => {
      if (e.detail.messageId === messageId) {
        setError(e.detail.error);
        setState("error");
      }
    };

    const handleSetState = (e: CustomEvent<{ messageId: string; state: ChipState }>) => {
      if (e.detail.messageId === messageId) {
        setState(e.detail.state);
      }
    };

    const handlePopoverEvent = (e: CustomEvent<{ messageId: string; detail: HighlightEventDetail | null }>) => {
      if (e.detail.messageId === messageId) {
        setPopoverDetail(e.detail.detail);
      }
    };

    window.addEventListener("fl-set-result" as any, handleSetResult);
    window.addEventListener("fl-set-error" as any, handleSetError);
    window.addEventListener("fl-set-state" as any, handleSetState);
    window.addEventListener("fl-set-popover" as any, handlePopoverEvent);

    return () => {
      window.removeEventListener("fl-set-result" as any, handleSetResult);
      window.removeEventListener("fl-set-error" as any, handleSetError);
      window.removeEventListener("fl-set-state" as any, handleSetState);
      window.removeEventListener("fl-set-popover" as any, handlePopoverEvent);
    };
  }, [messageId]);

  return (
    <>
      <BadgeChip
        state={state}
        response={response}
        error={error}
        onOpenPanel={() => setPanelOpen(true)}
        onTriggerCheck={onTriggerCheck}
      />

      {panelOpen && response && (
        <ClaimPanel
          response={response}
          adapter={adapter}
          onClose={() => setPanelOpen(false)}
          onScrollToClaim={onScrollToClaim}
        />
      )}

      {popoverDetail && !panelOpen && (
        <ClaimPopover
          claimResult={popoverDetail.claimResult}
          rect={popoverDetail.rect}
          onClose={() => setPopoverDetail(null)}
          onOpenPanel={() => {
            setPopoverDetail(null);
            setPanelOpen(true);
          }}
        />
      )}
    </>
  );
};
