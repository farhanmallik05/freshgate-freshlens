# FreshLens: Technical Requirements Document (TRD)

## 1. System Architecture

```text
Host Webpage (ChatGPT / Claude / Demo Chat)
  │
  ├── [Content Script]
  │     ├── Site Adapters (Selector strategies + fallback)
  │     ├── Completion Observer (MutationObserver + 1200ms debounce)
  │     ├── TextMap Engine (TreeWalker -> UTF-16 offset mapping)
  │     ├── Claim Anchor & Highlighter (CSS Custom Highlight API + <mark> fallback)
  │     └── Shadow DOM Host (#freshlens-root)
  │           └── React 18 UI (BadgeChip, ScoreRing, ClaimPanel, Popovers)
  │
  ├── [Chrome Messaging Bus] (Typed Zod Messages)
  │
  └── [Background Service Worker]
        ├── Settings Store (chrome.storage.local)
        ├── Session Cache (chrome.storage.session sha256 LRU)
        ├── Engine Client (POST /v1/verify + Bearer Auth)
        └── Offline Demo Fixture Provider
```

## 2. Key Technical Decisions

### 2.1 CSS Custom Highlight API vs DOM Mutation
- Direct `<mark>` wrapping inside active React applications (like ChatGPT or Claude) risks breaking React's internal fiber tree and causing reconciliation crashes.
- FreshLens uses the modern standard **CSS Custom Highlight API** (`CSS.highlights.set("fl-fresh", ...)`). This paints highlights purely at the rendering engine level without altering host DOM node structures.
- A fallback `<mark data-fl-claim>` injector is maintained with deterministic teardown for environments without Highlight API support.

### 2.2 TextMap UTF-16 Offset Alignment
- The FreshGate Engine computes claim spans as `[start, end]` character offsets into the plain text sent by the extension.
- The `TextMap` module uses a `TreeWalker` to traverse DOM text nodes, normalize whitespace consistently, and index exact text slices:
  ```ts
  interface TextSlice {
    node: Text;
    start: number; // offset in plainText
    end: number;   // offset in plainText
  }
  ```
- Mapping back from offsets to DOM `Range`:
  `textToRange(map, start, end)` locates the start node and end node with character offsets and constructs a native `Range`.

### 2.3 Shadow DOM Isolation
- All UI components (the floating message badge, the claim details drawer, and hover popovers) are rendered inside a closed/open Shadow Root attached to `#freshlens-root`.
- Tailwind CSS rules are compiled directly into an injected `<style>` tag inside the Shadow Root, guaranteeing total immunity against host CSS reset rules or typography variables.

### 2.4 Fail-Safe Privacy
- Assistant text is extracted cleanly.
- Page URLs, user chat histories, and prompt texts are stripped by default.
- Host permissions are requested progressively at runtime if connecting to a custom enterprise engine URL.

## 3. Performance Budgets
- Content script initialization: < 10ms.
- Message completion debounce: 1200ms of DOM silence without streaming indicators.
- TextMap parsing of 5,000 words: < 15ms.
- Highlight range creation (10 claims): < 5ms.
- Memory: Session LRU cache capped at 100 entries.
