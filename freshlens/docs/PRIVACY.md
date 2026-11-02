# FreshLens Privacy Policy & Data Architecture

## 1. Core Commitment
FreshLens is designed with privacy-first principles. We do not operate tracking servers, sell browsing data, or train models on user inputs.

## 2. What Data Is Processed
- **Assistant Message Text:** When an assistant response is checked (automatically or manually), the visible text of that specific response is extracted.
- **Verification Endpoint:** The extracted text is sent directly to the user's configured FreshGate Engine (by default `http://localhost:3001` or a private operator instance) or verified locally in Demo Mode.

## 3. What Is NEVER Processed or Sent
- **User Prompts:** Your personal questions and instructions are NEVER sent by default. (An optional setting exists if you explicitly want the engine to use prompt context for higher claim extraction accuracy).
- **Page Metadata:** The webpage URL, conversation ID, account profile information, and page titles are completely stripped.
- **Authentication Credentials:** Cookies, bearer tokens for ChatGPT/Claude, and session headers are never read or transmitted.
- **No Third-Party Analytics:** FreshLens contains no Google Analytics, telemetry scripts, or remote advertising SDKs.

## 4. Local Storage
- **Settings:** Stored locally in `chrome.storage.local`.
- **Session Cache:** Verified claim results are cached in `chrome.storage.session` for 30 minutes to prevent redundant API queries. This cache clears automatically when the browser closes.
- **History:** The last 20 verified responses are stored locally in `chrome.storage.local` for the user's personal review and can be cleared with one click in Options.
