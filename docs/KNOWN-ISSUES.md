# Known issues

QA failures still open after the round 3 re-examination.

## KI-01: spec gate reports SoW 4.1 in no change
- Wave: specs; change: none; found: 2026-10-28
- Check: `FAIL gap coverage: SoW function 4.1 is in no change`
- Reproduce: `node "<plugin>/skills/specs/scripts/spec-gate.mjs"`
- Evidence: F-1 (navigation, demo labels, access, reset) is built and archived in `openspec/changes/archive/2026-10-28-base-contract/` (proposal: "SoW functions: 4.1, 4.11"). The gate reads only active changes.
- Re-examination: false gap; the function is covered by the archived base contract. No spec work needed.
- Status: open

## KI-02: spec gate reports SoW 4.11 in no change
- Wave: specs; change: none; found: 2026-10-28
- Check: `FAIL gap coverage: SoW function 4.11 is in no change`
- Reproduce: `node "<plugin>/skills/specs/scripts/spec-gate.mjs"`
- Evidence: F-11 (demo seed data) is built and archived in `openspec/changes/archive/2026-10-28-base-contract/` (proposal: "SoW functions: 4.1, 4.11"). The gate reads only active changes.
- Re-examination: false gap; the function is covered by the archived base contract. No spec work needed.
- Status: open
