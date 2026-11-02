# FreshLens Agent Working Rules & Protocol

## Working Rules
1. **Never ask questions:** Choose the most conservative architectural option, log it in `docs/DECISIONS.md`, and continue.
2. **`docs/SPEC.md` is the source of truth:** Contracts change only via `SPEC.md` plus an entry in `docs/CHANGELOG.md`.
3. **Real code only:** No stubs, placeholders, or fake mock strings in shipped production paths.
4. **Run everything you build:** Never claim a pass you did not verify with actual command execution.
5. **Small conventional commits, no secrets:** All credentials stay in local environment or encrypted browser storage.
6. **Stay inside current step scope:** Log any out-of-scope issues in `docs/PROGRESS.md` under Known Issues.

## Handoff Format
Every task concludes with:
- `FILES`
- `COMMANDS RUN + RESULTS`
- `ACCEPTANCE` ([x] or [ ] with evidence)
- `DECISIONS`
- `KNOWN ISSUES`
- `NEXT`
And mirrors into `docs/PROGRESS.md`.
