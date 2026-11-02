# FreshGate Autonomous Multi-Agent Rules & Conventions

## 1. Canonical Working Rules
1. **Never ask questions:** Choose the most conservative option, log it in `docs/DECISIONS.md`, and continue.
2. **`docs/SPEC.md` is the source of truth:** Change contracts only via `SPEC.md` plus a line in `docs/CHANGELOG.md`.
3. **Real code only:** No stubs, mocks, or fake data in shipped runtime paths.
4. **Run everything you build:** Never claim a pass you did not personally execute and observe; if you cannot run commands, say so first and provide exact reproduction commands.
5. **Small conventional commits, no secrets:** Never commit tokens, credentials, or `.env` files.
6. **Scope discipline:** Stay strictly inside the current step's scope; log out-of-scope discoveries under "Known issues" in `docs/PROGRESS.md`.

---

## 2. Mandatory Handoff Format
Every step completion MUST conclude with the following headers, and be mirrored verbatim into `docs/PROGRESS.md`:

```markdown
### FILES
- [List of modified or created files]

### COMMANDS RUN + RESULTS
- [Exact terminal commands executed and verbatim output]

### ACCEPTANCE
- [x] [Acceptance criterion 1 with proof]
- [x] [Acceptance criterion 2 with proof]

### DECISIONS
- [Architecture or design decisions logged in docs/DECISIONS.md]

### KNOWN ISSUES
- [Identified limitations or future improvements]

### NEXT
- [Immediate next prompt or step id]
```

---

## 3. Engineering Conventions
- **TypeScript:** Strict mode enabled (`noImplicitAny`, `strictNullChecks`).
- **Validation:** Zod validation at every network and module boundary. Never use `any`.
- **Logging:** Structured JSON logs (Pino or equivalent) with correlation IDs; never log message content or secrets.
- **Tests:** Co-located or in dedicated `test/` suites matching code structure.
- **Definition of Done:** Code written, formatted, linted, unit and integration tests passing, verified via runtime execution.
