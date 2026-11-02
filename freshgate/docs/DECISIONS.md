# FreshGate Architecture Decision Records (ADR)

## ADR-001: Monorepo Organization
- **Status:** Accepted
- **Context:** FreshGate comprises an LLM gateway plugin (Go), a verification engine (TypeScript/Hono), a web dashboard (Next.js), a benchmarking harness, and a demo app.
- **Decision:** Place all FreshGate components inside `freshgate/` with shared contracts in `freshgate/shared/` and `engine/src/contract/schemas.ts`. FreshLens remains an independent repository in `freshlens/` consuming engine contracts.
- **Consequences:** Clean separation of concerns with single source of truth for contracts.

## ADR-002: In-Tree vs .so Bifrost Plugin
- **Status:** Accepted
- **Context:** Go dynamic `.so` plugins require strict CGO, identical Go toolchain, identical build flags, and identical dependency trees, which often fails across host operating systems.
- **Decision:** Primary deployment compiles FreshGate directly into the Bifrost container (in-tree built-in plugin architecture), with a fallback REST microservice hook.
- **Consequences:** Deterministic builds in Docker across Windows, macOS, and Linux.

## ADR-003: Continuous Freshness Scoring vs Binary Fact Checking
- **Status:** Accepted
- **Context:** Real-world claims are not strictly true or false; knowledge decays over time, and source authority varies.
- **Decision:** Implement continuous score (0–100) using prior staleness $P = 1 - 0.5^{D/H}$ and composite authority-recency-confidence $C = 0.5A + 0.3R + 0.2K$.
- **Consequences:** More nuanced and honest scoring matching real-world information volatility.
