# Design: base-contract

## Context

See `proposal.md` for why. Inputs: `docs/SoW.md` (approved 2026-10-28), `decisions/ARCHITECTURE.md` and ADR-0001 to ADR-0011 (approved), `PRODUCT.md`, project `CLAUDE.md`, `docs/PERSONAL-DATA.md`. Stack (ADR-0001, ADR-0002, ADR-0011): one Vite + React + TypeScript SPA with React Router and Mantine (core, dates, charts), `dayjs` with the `ru` locale; Convex self-hosted in Docker; single package (`src/`, `convex/`, `convex/lib/`, `shared/strings/`). Demo access is one shared password with a session table, not Convex Auth (ADR-0003). One role. No personal data (`docs/PERSONAL-DATA.md`, demo rows).

This document is the shared contract. Feature changes reference it and do not redefine its tables, codes or functions.

## Goals / Non-Goals

**Goals:**
- One schema, one guard, one set of status and error codes, one set of pure slot, time, status, analytics and log functions for all features.
- Seed and reset that every feature test can rely on.
- An app shell that feature screens plug into.

**Non-Goals:**
- Feature queries and screens (see `proposal.md`, Out of scope).
- Building blocks `access@1`, `auth@1`, `shell@1`, `e2e-ci@1`: they assume Convex Auth user accounts with a `users` table and `ctx.auth` identity, which ADR-0003 rejected. Their parts are project code here (guard, shell, e2e). Only `strings@1` fits.

## Decisions

### D1. Roles and access matrix

One role: `admin` = R-1 «Администратор сети / владелец билбордов» (SoW §3). Every valid demo session has this role; there are no accounts, no per-record scope and no self sign-up. R-2 «Рекламодатель» has no access; R-1 shows or prints the report.

| Resource | read | create | update | status change | delete |
| --- | --- | --- | --- | --- | --- |
| `screens` (incl. `screenEvents`) | R-1 all | seed only | none | seed only | reset only |
| `campaigns` | R-1 all | R-1 all (F-6) | none (OQ-4) | none (computed, D-6) | reset only |
| creative video upload | — | R-1 all (F-6) | none | — | reset only |
| `showLog` | R-1 all | R-1 all via «Смоделировать показы» (F-10) | replace by rerun | — | reset only |
| demo data (reset) | — | R-1 all («Сбросить демо») | — | — | — |
| `demoSessions` | none (only `demo.sessionStatus` → valid flag) | anyone with the password (`demo.signIn`) | `demo.signIn` extends | — | CLI `demo.clearSessions` |

Enforcement: server-side, `requireActor(ctx, sessionId)` first in every public query and mutation (D3). Hiding a control in the UI is not the control. The same matrix is the `permissions` section of the yaml contract below.

### D2. Data model (`convex/schema.ts`)

Field names follow ADR-0004. Values are stored as codes; Russian labels live in the strings module.

```ts
const city = v.union(v.literal("astana"), v.literal("karaganda"), v.literal("atyrau"), v.literal("east_kz"));
const screenStatus = v.union(v.literal("online"), v.literal("offline"));
const creative = v.union(
  v.object({ kind: v.literal("placeholder"), key: v.string() }),   // key from PLACEHOLDER_KEYS
  v.object({ kind: v.literal("video"), storageId: v.id("_storage") }),
);

screens: defineTable({
  code: v.string(),            // "AST-001", unique
  name: v.string(),
  city,
  address: v.string(),         // synthetic, not a real building
  lat: v.number(), lng: v.number(),   // synthetic, near the city centre
  status: screenStatus,
  workStartHour: v.number(),   // integer 0..23
  workEndHour: v.number(),     // integer 1..24, > workStartHour; 24/7 = 0..24
  hasCamera: v.boolean(),
  hasVehicleMetric: v.boolean(),
  imageKey: v.string(),        // file under public/demo/screens/
}).index("by_code", ["code"]).index("by_city", ["city"]),

campaigns: defineTable({
  name: v.string(),
  advertiser: v.string(),      // text, no advertisers table
  startDate: v.string(),       // "YYYY-MM-DD", inclusive
  endDate: v.string(),         // "YYYY-MM-DD", inclusive, >= startDate
  startHour: v.number(),       // integer 0..23
  endHour: v.number(),         // integer 1..24, > startHour, exclusive
  slotsPerCycle: v.number(),   // integer 1..SLOTS_PER_CYCLE
  screenIds: v.array(v.id("screens")),   // 1..100, unique
  creative,
}),                            // no status field (D-6); creation order = _creationTime

showLog: defineTable({
  campaignId: v.id("campaigns"),
  screenId: v.id("screens"),
  date: v.string(),            // "YYYY-MM-DD"
  shows: v.number(),           // integer >= 0, <= planned shows of that screen and day
}).index("by_campaign", ["campaignId", "date"]).index("by_date", ["date"]),

screenEvents: defineTable({
  screenId: v.id("screens"),
  at: v.number(),              // ms since epoch
  kind: v.union(v.literal("went_offline"), v.literal("back_online")),
}).index("by_screen", ["screenId", "at"]),

demoSessions: defineTable({
  sessionId: v.string(),       // crypto.randomUUID() from the browser, 36 chars
  expiresAt: v.number(),       // ms; sign-in time + SESSION_DAYS
}).index("by_sessionId", ["sessionId"]),
```

Not stored: campaign status (D-6), slot occupancy and planned shows (ADR-0004), audience analytics (ADR-0005), notifications (D-5), the cycle setting (constant, D-1), advertisers (text field).

Size: about 100 screens, 10–15 seed campaigns, a few hundred `showLog` rows, 20–40 `screenEvents`. Queries may scan all `screens` and `campaigns` (shortcut from ADR-0004: fine up to a few thousand campaigns; add a campaign-screen link table in phase 2).

### D3. Identity and guard (`convex/lib/auth.ts`)

```ts
export type Actor = { role: "admin"; sessionId: string };
export async function requireActor(ctx: QueryCtx | MutationCtx, sessionId: string): Promise<Actor>;
```

- Looks up `demoSessions.by_sessionId`; throws `ConvexError({ code: "UNAUTHENTICATED" })` when the row is missing or `expiresAt <= Date.now()`.
- Every public `query` and `mutation` has `sessionId: v.string()` in its args and calls `requireActor` first. Exceptions: `demo.signIn` (checks the password) and `demo.sessionStatus` (calls `requireActor` inside a try and returns only `{ valid }`). Internal functions need no session. Phase 1 has no public actions; a future action calls an internal query that runs `requireActor`.
- `auth.ts` is the only file in `convex/lib/` that takes `ctx`; the front never imports it.
- Password check: `demo.signIn` compares the argument with `process.env.DEMO_PASSWORD` in constant time. Unset, empty or shorter than 24 chars env never matches; a short value logs `DEMO_PASSWORD shorter than 24 chars: sign-in disabled` (length only, never the value). The password is never logged or returned.
- Sign-in is rate-limited (D3a). `demo.signIn` returns `{ ok: false, code: "WRONG_PASSWORD" }` instead of throwing, so the consumed attempt commits (a throw would roll the consumption back).
- Front transport: `src/session.ts` keeps `sessionId` in `localStorage` key `billboard.sessionId` (made with `crypto.randomUUID()` on first load) and wraps `useQuery` / `useMutation` as `useGuardedQuery(fn, args | "skip")` and `useGuardedMutation(fn)`, which add `sessionId` to every call. Feature screens use only these wrappers.

### D3a. Abuse limits (`convex/rateLimits.ts`)

From the plugin template `skills/checks/templates/security/rateLimits.ts`, keeping only the flows this project has: `signIn` and `upload`. Component registered in `convex/convex.config.ts` (`app.use(rateLimiter)`, `@convex-dev/rate-limiter`). Template values, unchanged. Over a limit, `enforceRateLimit` throws `ConvexError({ kind: "RateLimited", name, retryAfter })`; the front maps it to `errors.RATE_LIMITED`.

| Function | Flow | Limit names (per key + global) | Values | Key | User-facing string |
| --- | --- | --- | --- | --- | --- |
| `demo.signIn` (base) | `signIn` | `signInPerAccount` + `signInGlobal` | token bucket 10 / 15 min, capacity 5; token bucket 300 / min, capacity 300 | `sessionId` (normalized). Convex sees no IP and there are no accounts; the client chooses the id, so the global bucket is the control against guessing | «Слишком много попыток. Повторите через {minutes} мин.» (team) |
| `campaigns.generateUploadUrl` (F-6) | `upload` | `uploadUrlPerUser` + `uploadUrlGlobal` | token bucket 20 / h, capacity 5; token bucket 600 / h, capacity 100 | `sessionId` after `requireActor` (a valid server-side session) | same `RATE_LIMITED` string |

Order in `demo.signIn`: validate `sessionId` (`INVALID_INPUT`, nothing written) → `enforceRateLimit(ctx, "signIn", sessionId)` (check and consume in one call) → constant-time password compare → on match upsert the session and `rateLimiter.reset(ctx, "signInPerAccount", { key })`, return `{ ok: true }`; on mismatch return `{ ok: false, code: "WRONG_PASSWORD" }`. No other flow from the template exists here (no sign-up, reset, invites, OTP, contact forms, outbound sends); none is added. `consumeSignIn`, `resetSignIn` and `rateLimitedResponse` of the template are dropped (no Convex Auth `authorize`, no HTTP actions).

Proof: `convex/security.test.ts` from the template, one `CASES` row per limited function (`demo.signIn` here; F-6 adds `campaigns.generateUploadUrl`): 5 calls pass, the 6th is `RateLimited`; the parallel race; the global bucket. Titles start with `[security]`.

### D4. Status codes and transitions

| Object | Code | Label (verbatim) | Rule | Next |
| --- | --- | --- | --- | --- |
| Campaign | `planned` | «Запланирована» | today < `startDate` | `active` (date passes) |
| Campaign | `active` | «Активна» | `startDate` ≤ today ≤ `endDate` | `finished` (date passes) |
| Campaign | `finished` | «Завершена» | today > `endDate` | — |
| Screen | `online` | «онлайн» | stored | `offline` (seed only) |
| Screen | `offline` | «офлайн» | stored; triggers «Экран недоступен» | `online` (seed only) |
| Slot | free | «Свободно» | slot index not taken in that hour | taken when a campaign that is on fills it |

Campaign status is computed by `campaignStatus` from today in UTC+5; no function writes it, and no public function changes a screen status. Screen event codes: `went_offline`, `back_online`.

Notifications (computed by `notifications`, shown on «Главная» by F-2):

| Kind | Text (verbatim) | Rule |
| --- | --- | --- |
| `screen_offline` | «Экран недоступен» + screen name | screen `status` = `offline` |
| `campaign_ending` | «Кампания скоро завершится» + campaign name | 0 ≤ `endDate` − today ≤ 3 days (D-5) |

### D5. Error codes

The backend throws `ConvexError<{ code: ErrorCode; ...details }>` via `fail(code, details?)` from `convex/lib/errors.ts`; it never sends Russian text. The front maps `code` to `errors.<code>` in the strings module (`src/errors.ts`, `errorText(error)`); a `ConvexError` with `kind: "RateLimited"` maps to `errors.RATE_LIMITED`. Texts marked "team" are not in the SoW; they are team copy in the SoW style and can be changed in the strings module without a contract change.

| Code | Details | Text (ru) | Source | Used by |
| --- | --- | --- | --- | --- |
| `UNAUTHENTICATED` | — | «Введите пароль, чтобы открыть демо.» | team | guard; front shows the password screen |
| `WRONG_PASSWORD` | — | «Неверный пароль.» | team (F-1 AC4 asks for an error) | `demo.signIn` result (`{ ok: false, code }`, not thrown) |
| `RATE_LIMITED` | `{ retryAfter: number }` (ms) | «Слишком много попыток. Повторите через {minutes} мин.» | team | `ConvexError({ kind: "RateLimited" })` from `enforceRateLimit`; `{minutes}` = ceil(retryAfter / 60 000) |
| `INVALID_INPUT` | `{ field: string }` | «Проверьте поле: {field}.» | team | all validated mutations |
| `NOT_FOUND` | `{ entity: string }` | «Запись не найдена. Возможно, демо было сброшено.» | team | reads by id (F-4, F-5, F-9, F-10) |
| `SLOT_CONFLICT` | `{ conflicts: Conflict[] }` | «Недостаточно свободных слотов. Конфликт: {list}.» | team (F-6 AC6 asks to name screens and hours) | `campaigns.create` (F-6) |
| `CAMPAIGN_NOT_STARTED` | — | «Кампания ещё не началась. Показы по журналу появятся после даты начала.» | team | `showLog.simulate` (F-10) |
| `INVALID_CREATIVE` | — | «Загрузите видео MP4 или WebM длительностью 5 секунд, до 20 МБ.» | team (D-8, ADR-0008) | `campaigns.create` (F-6) |
| `UNKNOWN` | — | «Что-то пошло не так. Обновите страницу.» | team | front fallback for any other error |

`{list}` in `SLOT_CONFLICT` is built by the front from `conflicts`, grouped by screen and hour ranges (F-6 owns the format).

### D6. Shared pure functions (`convex/lib/`)

Pure (no `ctx`), imported by Convex functions and by the front. Types: `DateStr` = `"YYYY-MM-DD"`, `Hour` = integer 0..24, `ScreenRule` = the `screens` fields `_id, code, city, status, workStartHour, workEndHour, hasCamera, hasVehicleMetric`, `CampaignRule` = the `campaigns` fields `_id, _creationTime, name, startDate, endDate, startHour, endHour, slotsPerCycle, screenIds`.

| Module | Function / constant | Signature | Notes |
| --- | --- | --- | --- |
| `config.ts` | constants | `CYCLE_SECONDS = 60`, `SLOT_SECONDS = 5`, `SLOTS_PER_CYCLE = 12`, `CYCLES_PER_HOUR = 60`, `SOON_END_DAYS = 3`, `SESSION_DAYS = 7`, `MAX_PERIOD_DAYS = 366`, `VIDEO_TYPES = ["video/mp4", "video/webm"]`, `VIDEO_MAX_BYTES = 20 * 1024 * 1024`, `PLACEHOLDER_KEYS = ["placeholder-1", "placeholder-2", "placeholder-3", "placeholder-4"]`, `CITIES = ["astana", "karaganda", "atyrau", "east_kz"]` | D-1 is `CYCLE_SECONDS` / `SLOT_SECONDS`; the rest derive |
| `time.ts` | `KZ_OFFSET_HOURS = 5` | — | fixed UTC+5 |
| `time.ts` | `kzNow` | `(nowMs: number) => { date: DateStr; hour: number }` | today and current hour |
| `time.ts` | `isDate` | `(s: string) => boolean` | strict `YYYY-MM-DD`, real calendar date |
| `time.ts` | `addDays`, `diffDays`, `datesInRange` | `(d: DateStr, n: number) => DateStr`; `(a: DateStr, b: DateStr) => number` (b − a); `(from: DateStr, to: DateStr) => DateStr[]` | inclusive range |
| `slots.ts` | `isOn` | `(c: CampaignRule, s: ScreenRule, date: DateStr, hour: number) => boolean` | spec `slot-model` |
| `slots.ts` | `hourSlots` | `(s: ScreenRule, date: DateStr, hour: number, campaigns: CampaignRule[]) => Slot[]` with `Slot = { index: number /*1..12*/; startSec: number; endSec: number; campaignId: Id<"campaigns"> \| null; campaignName: string \| null }` | always 12 items; creation order |
| `slots.ts` | `usedSlots` | `(s: ScreenRule, date: DateStr, hour: number, campaigns: CampaignRule[]) => number` | sum of `slotsPerCycle` of campaigns that are on |
| `slots.ts` | `plannedShowsForDay` | `(c: CampaignRule, s: ScreenRule, date: DateStr, untilHour?: number) => number` | `untilHour` (exclusive) for the past part of today |
| `slots.ts` | `plannedShows` | `(c: CampaignRule, screens: ScreenRule[], from: DateStr, to: DateStr) => { total: number; byDay: { date: DateStr; shows: number }[]; byScreen: { screenId: Id<"screens">; shows: number }[] }` | period clipped to the campaign dates |
| `slots.ts` | `occupancy` | `(screens: ScreenRule[], campaigns: CampaignRule[], from: DateStr, to: DateStr) => { occupied: number; total: number; percent: number; byDay: { date: DateStr; occupied: number; total: number; percent: number }[] }` | D-3; percent rounded to 1 decimal; 0 when total is 0 |
| `slots.ts` | `findConflicts` | `(req: { startDate; endDate; startHour; endHour; slotsPerCycle; screenIds }, screens: ScreenRule[], campaigns: CampaignRule[]) => Conflict[]` with `Conflict = { screenId: Id<"screens">; date: DateStr; hour: number; free: number; requested: number }` | D-9; empty = fits |
| `status.ts` | `campaignStatus` | `(c: { startDate: DateStr; endDate: DateStr }, today: DateStr) => "planned" \| "active" \| "finished"` | D-6 |
| `status.ts` | `notifications` | `(screens: { _id; name; status }[], campaigns: { _id; name; endDate }[], today: DateStr) => Notification[]` with `Notification = { kind: "screen_offline" \| "campaign_ending"; refId: string; name: string }` | D-5; screens first, then campaigns by end date |
| `analytics.ts` | `audienceHour` | `(s: ScreenRule, date: DateStr, hour: number) => Audience \| null` with `Audience = { people: number; gazeEstimated: number; looks: number; vehicles: number \| null }` | null without a camera; 0 outside working hours |
| `analytics.ts` | `audienceDay` | `(s: ScreenRule, date: DateStr) => Audience \| null` | closed form; equals the sum of the 24 hours |
| `analytics.ts` | `audienceProfile` | `(s: ScreenRule) => { age: { "18-24": number; "25-34": number; "35-44": number; "45-54": number; "55+": number }; gender: { male: number; female: number } } \| null` | whole percents, each sums to 100 |
| `showLog.ts` | `simulateShowLog` | `(c: CampaignRule, screens: ScreenRule[], nowMs: number) => { screenId: Id<"screens">; date: DateStr; shows: number }[]` | spec `show-log`; f in 0.85–1.0 from a hash of (campaign id, screen id, date) |
| `hash.ts` | `hash01` | `(...parts: string[]) => number` | deterministic value in [0, 1); no `Math.random` |
| `errors.ts` | `ERROR_CODES`, `ErrorCode`, `fail` | `fail(code: ErrorCode, details?: object): never` | D5 |

Audience levels (base per city, 24-hour profile, weekday factor, age and gender shares) are demo parameters chosen by the team with the ТЗ §10 example (8 500 people, 6 000 with an estimated gaze, 2 400 looks, 40% in one day) as the order of magnitude. They are not client facts and are shown only with «Демонстрационные данные».

### D7. Shared Convex functions

| Function | Kind | Args | Returns | Roles | Notes |
| --- | --- | --- | --- | --- | --- |
| `demo.signIn` | mutation | `{ sessionId: v.string(), password: v.string() }` (password capped at 200 chars) | `{ ok: true } \| { ok: false; code: "WRONG_PASSWORD" }` | public (password check, rate-limited D3a) | throws `INVALID_INPUT` (`field: "sessionId"`) unless 36-char UUID; throws `RateLimited` over the limit; on match upserts `demoSessions` with `expiresAt = now + 7 days` |
| `demo.sessionStatus` | query | `{ sessionId: v.string() }` | `{ valid: boolean }` | public (no data) | front decides password screen or app |
| `demo.reset` | mutation | `{ sessionId: v.string() }` | `null` | R-1 | `requireActor`; deletes `campaigns`, `showLog`, `screenEvents`, `screens` and referenced video files, then `seedData(ctx, kzNow(Date.now()).date)`; keeps `demoSessions`; one transaction |
| `screens.options` | query | `{ sessionId: v.string() }` | `Array<{ _id: Id<"screens">; code: string; name: string; city: City; status: "online" \| "offline" }>` sorted by `code` | R-1 | screen pickers and filters in F-2, F-6, F-7, F-8, F-9 |
| `demo.seed` | internalMutation | `{}` | `null` | CLI (`npx convex run demo:seed`) | no-op when `screens` has rows |
| `demo.clearSessions` | internalMutation | `{}` | `number` (rows deleted) | CLI | after a password change |

`seedData(ctx: MutationCtx, today: DateStr): Promise<void>` in `convex/seed.ts` is a plain function used by `demo.seed`, `demo.reset` and tests. Feature changes add their own functions in `convex/screens.ts`, `campaigns.ts`, `schedule.ts`, `dashboard.ts`, `analytics.ts`, `reports.ts`, `showLog.ts`; each follows D3.

### D8. Seed (`convex/seed.ts`)

Deterministic (fixed `hash01` keys, no `Math.random`), dates as offsets from `today` (ADR-0006). Fixed by the SoW: 100 screens, 4 regions, some «офлайн», some with a camera, most 07:00–23:00, a few 24/7, vehicles on about half (D-10), the 3 named campaigns and statuses (F-5 AC1), «Demo …» advertisers only, show log for the 2 active named campaigns via `simulateShowLog`, a `went_offline` event per offline screen. Team demo values (not client facts, recorded here): split of screens per city, number of offline, 24/7 and camera screens, the other «Demo …» campaigns (including one ending within 3 days and one «Завершена»), date offsets (for example «Летняя акция» today − 10 to today + 20, «Презентация автомобиля» from today + 5). Seed must keep every hour ≤ 12 slots (`findConflicts` on each seeded campaign against the earlier ones).

Static assets (ADR-0008): `public/demo/creatives/placeholder-1..4.*` and `public/demo/screens/*` illustrations without people. TODO(team): pick or draw the images with a free licence.

### D9. Strings module and app shell

Strings: block `strings@1`, per block strings@1 (`shared/strings/`, typed `t("ru", key)`, `text()` for runtime keys such as `errors.${code}`). Only locale `ru` (project `CLAUDE.md`). Contract texts (app name, role, entities, route labels) come from the yaml block; the project adds its namespaces to `shared/strings/ru.ts`: `errors` (D5), `status` (D4), `slot.free` «Свободно», `cities` («Астана», «Караганда», «Атырау», «Восточно-Казахстанская область»), `notifications` (D4), `demo.label` «Демонстрационные данные», `demo.reset` «Сбросить демо», `demo.resetTitle` «Сбросить демо?» (team), `demo.resetBody` «Все созданные кампании будут удалены, демонстрационные данные будут восстановлены.» (team), `demo.cancel` «Отмена» (team), `login.password` «Пароль» (team), `login.submit` «Войти» (team), `errors.RATE_LIMITED` (D5, team), `screenEvents.went_offline` «Экран недоступен», `screenEvents.back_online` «Экран снова онлайн» (team). This replaces the `src/strings.ts` path of ADR-0002; the rule is the same.

Deviation from ADR-0002: the strings module lives at `shared/strings/` (block `strings@1`), not `src/strings.ts`; the rule is unchanged: one module, Russian only, the backend returns codes.

Front skeleton (project code, not a block):

| Path | Content |
| --- | --- |
| `src/main.tsx` | `MantineProvider`, `DatesProvider` (`ru`), `ConvexProvider` (`VITE_CONVEX_URL`), `BrowserRouter` |
| `src/session.ts` | session id, `useGuardedQuery`, `useGuardedMutation` (D3) |
| `src/errors.ts` | `errorText(error: unknown): string` (D5) |
| `src/shell/Gate.tsx` | `demo.sessionStatus` → redirect to `/login` (`PasswordScreen`) or render `AppShell`; `UNAUTHENTICATED` from any call → `/login` |
| `src/shell/PasswordScreen.tsx` | password field, submit, `WRONG_PASSWORD` and `RATE_LIMITED` texts |
| `src/shell/AppShell.tsx` | left menu (routes of the yaml block, in that order), «BillBoard» text, «Сбросить демо» with Mantine confirm modal; root element has class `no-print` |
| `src/components/DemoLabel.tsx` | `<DemoLabel />` renders `demo.label` |
| `src/routes/*.tsx` | one empty page per section with its title; features fill them |
| `src/print.css` | `@media print { .no-print { display: none } }` (F-9 extends) |

Routes (ADR-0001): without a valid session every path redirects to `/login` (the password screen); after sign-in the app opens `/` «Главная»; a signed-in visitor on `/login` goes to `/`. Feature routes `/billboards/:id`, `/campaigns/new`, `/campaigns/:id` are added by their feature changes. Filters live in URL search params (ADR-0001).

### D10. Tests and e2e

vitest + `convex-test` for `convex/lib/*` and the base functions; component tests (vitest + Testing Library) for the shell. Playwright (`e2e/`) with a smoke test (password screen, sign-in with `E2E_DEMO_PASSWORD`, the 6 sections open) and an axe check, adapted from the plugin e2e templates to password sign-in (no dev identity). Test titles: `[base-contract] <scenario name>`.

### Yaml contract

```yaml contract
version: 1
name: { ru: BillBoard }
stack: { front: vite }
locales: [ru]
roles:
  - { id: admin, label: { ru: Администратор сети / владелец билбордов }, home: / }
entities:
  - { id: screens, label: { ru: Билборды } }
  - { id: campaigns, label: { ru: Рекламные кампании } }
  - { id: showLog, label: { ru: Показы по журналу } }
  - { id: demo, label: { ru: Демонстрационные данные } }
permissions:
  screens.read: { admin: all }
  campaigns.read: { admin: all }
  campaigns.create: { admin: all }
  campaigns.uploadCreative: { admin: all }
  showLog.read: { admin: all }
  showLog.simulate: { admin: all }
  demo.reset: { admin: all }
routes:
  - { path: /login, label: { ru: Вход }, public: true }
  - { path: /, label: { ru: Главная }, roles: [admin] }
  - { path: /billboards, label: { ru: Билборды }, roles: [admin] }
  - { path: /campaigns, label: { ru: Рекламные кампании }, roles: [admin] }
  - { path: /schedule, label: { ru: Расписание }, roles: [admin] }
  - { path: /analytics, label: { ru: Аналитика аудитории }, roles: [admin] }
  - { path: /reports, label: { ru: Отчёты }, roles: [admin] }
auth: { methods: [password], selfSignUp: false, session: { totalHours: 168 } }
blocks: [strings@1]
```

Notes on the block: `auth.methods: [password]` records the one shared demo password (D-13); there are no accounts and no other method. `session.totalHours: 168` = 7 days (ADR-0003); there is no idle timeout. `/login` is the password screen label (team text «Вход»). The `permissions` and `auth` sections are data for people and checks; no block stamps them, the guard is `requireActor` (D3).

## Risks / Trade-offs

- [Analytics and occupancy loops over long periods may near the 1 s Convex limit] → unit benchmark with 100 screens × 366 days in the base tests; `audienceDay` is closed form.
- [Shared password can leak (K-04)] → long random `DEMO_PASSWORD`, sign-in rate limit (D3a), `demo.clearSessions` after a change.
- [Per-session sign-in key is chosen by the client] → the global bucket `signInGlobal` is the real control; with a 16+ character random password, 300 guesses per minute cannot find it.
- [`sessionId` in `localStorage` is readable by page scripts] → acceptable at security level demo with no personal data (ADR-0003).
- [Status computed at query time can be stale over midnight] → a refresh fixes it (ADR-0004).
- [Seed campaign ids change on reset; saved links break] → accepted for the demo (ADR-0006).
- [Strings path differs from ADR-0002 text] → recorded here and in `proposal.md`; the rule is unchanged.

## Migration Plan

New project: no migration. Local run: `docker compose` (self-hosted Convex), `npx convex env set DEMO_PASSWORD <value>`, `npx convex dev`, `npx convex run demo:seed`. Rollback: `demo.reset` restores the seed.

## Open Questions

- TODO(client): Q-04 commercial slot model (phase 2; the demo uses D-1).
- TODO(client): Q-06 confirm the occupancy formula D-3 (the demo uses it).
- TODO(team): images for placeholders and screens (ADR-0008).
