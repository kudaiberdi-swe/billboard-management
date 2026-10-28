# 0002. Repo layout and shared code

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

One front app and one Convex backend (ADR-0001). Some pure logic must give the same answer in the browser and on the server: planned-shows calculation (SoW F-6 AC4), slot packing inside the 12-slot cycle (F-7), demo analytics generator (ADR-0005), date and hour math in Kazakhstan time (ADR-0004). Project `CLAUDE.md`: "UI strings are in Russian only, from one shared strings module." `.fde-echo.json` checks expect the front in `src/` and Convex functions in `convex/`.

## Options

1. **Single package at the repo root**: `src/` (front), `convex/` (backend), `convex/lib/` (pure shared logic, imported by both), `src/strings.ts` (all Russian UI text). Pros: no workspace tooling; matches the default Convex + Vite template and the `.fde-echo.json` paths. Cons: none at this size.
2. **npm workspaces monorepo** (`apps/web`, `packages/shared`, `convex/`): Pros: room for more apps. Cons: extra config and path wiring for one app; checks expect `src/`.

## Decision

Option 1. Layout:

- `src/` front: `routes/` per section, `components/`, `strings.ts` (the only place with Russian UI text, verbatim from the SoW), `print.css`.
- `convex/` backend: `schema.ts`, one file per area (`screens.ts`, `campaigns.ts`, `schedule.ts`, `dashboard.ts`, `analytics.ts`, `reports.ts`, `showLog.ts`, `demo.ts` for sign-in, seed and reset), `lib/` for pure shared logic (`slots.ts`, `time.ts`, `analytics.ts`, `config.ts` with the cycle setting D-1, `auth.ts` with `requireActor`).
- `public/demo/` static demo images and creative placeholders (ADR-0008).
- `e2e/` Playwright tests; unit tests next to the code (`*.test.ts`).
- `deploy/` docker compose and reverse-proxy config for the Azure VM later (ADR-0011).

The backend never sends Russian UI text. It returns codes and structured data (for example a slot conflict returns the list of screen IDs, dates and hours in conflict); the front turns them into text from `src/strings.ts`. Status values are stored and returned as codes (`planned`, `active`, `finished`; `online`, `offline`), and `src/strings.ts` maps them to «Запланирована», «Активна», «Завершена», «онлайн», «офлайн».

## Consequences

- One strings module, one place to check verbatim terms.
- Shared logic in `convex/lib/` must stay pure (no `ctx`), so it is unit-testable in vitest and importable by the front.
- If phase 2 adds a second app, move to option 2 with a new ADR.

## Open questions

None.
