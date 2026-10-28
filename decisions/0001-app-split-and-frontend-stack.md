# 0001. App split and frontend stack

| Status | Date | Decided by | Supersedes | Superseded by |
| --- | --- | --- | --- | --- |
| Accepted | 2026-10-28 | architect agent (draft), machine gate (auto) | - | - |

## Context

The SoW has one working role, R-1 «Администратор сети / владелец билбордов» (SoW §3). R-2 «Рекламодатель» has no account in phase 1; R-1 shows or prints the report (SoW §2.2, §3). The platform is a desktop browser on a laptop screen; mobile layout is out of scope (SoW §5, §9.9; ТЗ §3, §13). The ТЗ leaves the stack to the developers (ТЗ §3). The deadline is 2026-10-31, 3 days from the SoW (K-01), so the simplest stack that meets F-1 to F-11 wins. Backend is fixed: Convex, self-hosted (project `CLAUDE.md`).

Screen needs: 6 menu sections, data tables with filters, multi-select of screens, date range pickers in Russian, a confirm dialog («Сбросить демо»), charts (occupancy per day, audience per hour, shows per day), a map (ADR-0009) and a print view (ADR-0010).

## Options

1. **One single-page web app (Vite + React + TypeScript) with route per section, Convex backend**: one build, one URL, one password screen. Pros: least code and setup; the advertiser report is just a route that prints cleanly. Cons: none for phase 1.
2. **Two apps (admin web + advertiser report app)**: Pros: ready for future advertiser accounts. Cons: R-2 has no account in phase 1; doubles build and deploy work inside 3 days.
3. **Next.js (server rendering) instead of a Vite SPA**: Pros: SSR. Cons: no SEO or SSR need behind a password; a Node server to host on the VM; more moving parts.

UI kit inside option 1:

- a. **Mantine (core, dates, charts)**: tables, MultiSelect, DatePicker with `dayjs` Russian locale, Modal confirm, and charts (wrapper over Recharts) in one family. Fastest for a data-heavy dashboard.
- b. **shadcn/ui + Tailwind + Recharts**: flexible look; more files to copy and style in 3 days.
- c. **Plain CSS + Recharts**: fewest deps; date range and multi-select widgets must be built by hand.

## Decision

Option 1 with kit a: one desktop SPA (Vite, React, TypeScript, React Router, Convex React client, Mantine core/dates/charts, `dayjs` with `ru` locale), plus the Convex backend. Routes: `/login`, `/` «Главная», `/billboards`, `/billboards/:id`, `/campaigns`, `/campaigns/new`, `/campaigns/:id`, `/schedule`, `/analytics`, `/reports`. Filters live in URL search params so a report link and a refresh keep the same view. The report view for R-2 is the `/reports` route with a print stylesheet (ADR-0010). No mobile app, no second front.

Package versions are pinned at scaffold time (current Mantine major and React major: UNVERIFIED on 2026-10-28; the scaffold uses the current stable releases).

## Consequences

- One app, one password screen, one deploy artifact (static files).
- Mantine's look is the base; the design stage (impeccable) tunes theme tokens, not components.
- Phase 2 advertiser accounts (out of scope, SoW §9.5) would add roles and probably a second route group or app; that is a new ADR.
- All UI text comes from one strings module (ADR-0002), never inline in components.

## Open questions

None.
