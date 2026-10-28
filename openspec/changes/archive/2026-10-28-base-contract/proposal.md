Status: approved 2026-10-28 (auto)

# Proposal: base-contract

## Why

Every feature of the BillBoard demo (F-2 to F-10) reads the same screens, campaigns and show log, computes the same 12-slot cycle and campaign status, and sits behind the same shared password and left menu. This change fixes that shared contract once (data model, access guard, statuses, error codes, shared pure functions, seed and reset, app shell), so feature changes can be specified and built in parallel against it before the 2026-10-31 demo.

SoW functions: 4.1, 4.11

The base covers F-1 (navigation, demo label, demo access, reset) and F-11 (seed data), because every other feature needs them first. Feature screens and their behavior stay in feature changes.

## What Changes

- Convex schema for `screens`, `campaigns`, `showLog`, `screenEvents`, `demoSessions` (ADR-0004, ADR-0007, ADR-0003). No tables for advertisers (text field), analytics (generated, ADR-0005), notifications (computed, D-5) or settings (cycle constant, D-1).
- Demo access: one shared password from the Convex env `DEMO_PASSWORD`, a session table, and the guard `requireActor(ctx, sessionId)` that every public Convex function calls first (ADR-0003).
- Abuse limits in `convex/rateLimits.ts` (`@convex-dev/rate-limiter`): sign-in limit on `demo.signIn` (per-session and global token buckets), the upload-URL limit names for F-6, error code `RATE_LIMITED`, and `[security]` tests.
- Single role R-1 «Администратор сети / владелец билбордов» and its access matrix.
- Status codes and rules: campaign «Запланирована» / «Активна» / «Завершена» from the dates (D-6); screen «онлайн» / «офлайн»; slot «Свободно»; notification rule «Экран недоступен» / «Кампания скоро завершится» (D-5).
- Stable error codes, with Russian text in the shared strings module.
- Shared pure functions in `convex/lib/`: cycle config (D-1), Kazakhstan time UTC+5, slot packing, planned shows (F-6 AC4), occupancy (D-3), conflict check (D-9), campaign status, notifications, audience generator (ADR-0005), show-log simulation core (ADR-0007).
- Shared Convex functions: `demo.signIn`, `demo.sessionStatus`, `demo.reset`, `screens.options`, internal `demo.seed`, `demo.clearSessions`.
- Deterministic seed with dates relative to today, and the atomic «Сбросить демо» reset (ADR-0006).
- Frontend skeleton: Vite + React + Mantine app, password screen, left menu with the 6 sections, «Сбросить демо» with confirmation, «Демонстрационные данные» label component, shared strings module (`strings@1` block), error-to-text mapping, empty section routes.

## Capabilities

### New Capabilities

- `demo-access`: shared-password sign-in, sessions, server-side guard on every public function.
- `demo-data`: synthetic seed data and the «Сбросить демо» reset.
- `slot-model`: 60-second cycle of 12 five-second slots, hour slot sets, planned shows, occupancy, slot conflicts, Kazakhstan time.
- `statuses`: campaign status from dates, screen status, notifications on «Главная».
- `audience-analytics`: deterministic simulated audience values per screen, day and hour.
- `show-log`: the simulated show log rule shared by the seed and «Смоделировать показы».
- `app-shell`: left menu, password screen, demo label, Russian strings module, error texts.

### Modified Capabilities

None (first change of the project).

## Out of scope

- Feature screens and their queries: «Главная» cards and charts (F-2), «Билборды» list, filters and map (F-3), billboard card (F-4), campaign list (F-5), campaign form, `campaigns.create`, `campaigns.checkAvailability`, `campaigns.generateUploadUrl` (F-6), «Расписание» view (F-7), «Аналитика аудитории» view (F-8), «Отчёты» and print layout (F-9), the `showLog.simulate` mutation and button (F-10).
- Estimated contacts D-4 (only F-2 uses it).
- Campaign edit and delete (OQ-4), sign-out, a settings UI for the cycle length, prices (D-11), user accounts and permissions per user (SoW §9.5), audit log (SoW §5).
- Azure deploy (ADR-0011, later).

## Acceptance coverage

| Criterion | Scenario |
| --- | --- |
| 4.1.1 | menu shows the 6 sections in order |
| 4.1.1 | menu item opens its section |
| 4.1.2 | demo label shows the verbatim text |
| 4.1.3 | visitor without a session sees only the password screen |
| 4.1.3 | correct password opens Главная |
| 4.1.4 | wrong password shows an error |
| 4.1.4 | wrong password creates no session |
| 4.1.5 | reset asks for confirmation |
| 4.1.5 | reset deletes user campaigns and restores the seed |
| 4.1.6 | data is shared between sessions |
| 4.11.1 | seed has 100 screens in 4 regions |
| 4.11.1 | seed has offline and camera screens |
| 4.11.2 | seed working hours |
| 4.11.3 | seed has the named campaigns |
| 4.11.3 | seed schedules have occupied and free slots |
| 4.11.3 | seed has a show log within plan |
| 4.11.3 | seed audience is available per hour |
| 4.11.3 | seed has notifications of both kinds |
| 4.11.4 | hour slots agree with the screen campaigns |
| 4.11.5 | seed has only Demo advertisers |

F-1 AC2 is shared: this change provides the label component; each feature change places it on its screens and covers it there.

## Impact

- New code: `convex/schema.ts`, `convex/rateLimits.ts`, `convex/convex.config.ts`, `convex/security.test.ts`, `convex/lib/*`, `convex/demo.ts`, `convex/seed.ts`, `convex/screens.ts`, `shared/strings/` (block), `src/` app skeleton, `e2e/` smoke.
- Env names (values never in git): `DEMO_PASSWORD` (Convex), `VITE_CONVEX_URL`, `CONVEX_SELF_HOSTED_URL`, `CONVEX_SELF_HOSTED_ADMIN_KEY` (`.env.local`).
- Dependencies: `convex`, `@convex-dev/rate-limiter`, `react`, `react-dom`, `react-router-dom`, `@mantine/core`, `@mantine/hooks`, `@mantine/dates`, `@mantine/charts`, `recharts`, `dayjs`; dev: `vite`, `typescript`, `vitest`, `convex-test`, `@edge-runtime/vm`, `@testing-library/react`, `@playwright/test`, `@axe-core/playwright`.
- One addition to ADR-0003: a sign-in rate limit is built now (orchestrator decision 2026-10-28), instead of the ADR's "no throttle in phase 1" shortcut.
- One deviation from ADR-0002: the strings module path is `shared/strings/` (stamped by the `strings@1` block) instead of `src/strings.ts`. The rule stays: one module, Russian only, the backend returns codes.
