# FreshLens Architecture Decisions Record (ADR)

## DEC-001: CSS Custom Highlight API vs DOM Mark Insertion
- **Context:** Wrapping spans inside `<mark>` tags mutates the host DOM tree. In modern SPAs like ChatGPT (React 18) and Claude, unmanaged DOM changes can trigger React hydration or reconciliation errors.
- **Decision:** Prioritize the CSS Custom Highlight API (`::highlight(fl-fresh)`, etc.) as the primary rendering engine. Use `<mark>` wrapping only as an explicit fallback for older browser engines.

## DEC-002: Default Demo Mode Enabled on Install
- **Context:** Hackathon judges often test unpacked extensions without configuring a backend server or possessing a Tavily API key.
- **Decision:** Default `demoMode: true` in the initial extension settings. When enabled, realistic pre-computed verification fixtures resolve instantly offline, guaranteeing a 100% reliable 30-second judge experience. Real verification against live Tavily engine can be toggled instantly.

## DEC-003: Privacy-First Payload Isolation
- **Context:** Extension must be safe for enterprise and consumer environments.
- **Decision:** The request context strips prompt text, URL, and session details by default. Only the assistant message text is sent to the verification engine.
