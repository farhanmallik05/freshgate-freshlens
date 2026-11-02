export const SHADOW_STYLES = `
  :host {
    all: initial;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #e4e4e7;
    display: inline-block;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  .fl-chip-container {
    display: inline-flex;
    align-items: center;
    margin-top: 6px;
    margin-bottom: 6px;
  }

  .fl-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border-radius: 9999px;
    background: #18181b;
    border: 1px solid #27272a;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .fl-chip:hover {
    border-color: #3f3f46;
    background: #27272a;
  }

  .fl-chip-fresh {
    border-color: #065f46;
    color: #34d399;
  }

  .fl-chip-aging {
    border-color: #92400e;
    color: #fbbf24;
  }

  .fl-chip-stale {
    border-color: #991b1b;
    color: #f87171;
  }

  .fl-panel {
    position: fixed;
    top: 60px;
    right: 20px;
    width: 380px;
    max-height: calc(100vh - 80px);
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.6);
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: flFadeIn 0.2s ease-out;
  }

  @keyframes flFadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fl-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #27272a;
    background: #121215;
  }

  .fl-panel-body {
    padding: 12px 16px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .fl-claim-card {
    background: #18181b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 10px 12px;
    transition: border-color 0.15s ease;
  }

  .fl-claim-card:hover {
    border-color: #3f3f46;
  }

  .fl-popover {
    position: fixed;
    width: 320px;
    background: #09090b;
    border: 1px solid #27272a;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.7);
    z-index: 2147483647;
    pointer-events: auto;
    animation: flFadeIn 0.15s ease-out;
  }

  .fl-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }

  .fl-button-primary {
    background: #10b981;
    color: #ffffff;
  }
  .fl-button-primary:hover {
    background: #059669;
  }

  .fl-button-secondary {
    background: #27272a;
    color: #e4e4e7;
    border-color: #3f3f46;
  }
  .fl-button-secondary:hover {
    background: #3f3f46;
  }

  .fl-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .fl-badge-stale {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .fl-badge-aging {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  .fl-badge-fresh {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  .fl-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #18181b;
    border: 1px solid #10b981;
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 6px;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.6);
    z-index: 2147483647;
    animation: flFadeIn 0.2s ease-out;
  }
`;
