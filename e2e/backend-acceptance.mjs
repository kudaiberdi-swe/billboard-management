// e2e/backend-acceptance.mjs: SoW §7.3 acceptance scenario through the public Convex functions,
// plus the forks and the negative auth cases. Synthetic data only; ends with demo.reset.
// Run from the repo root against the local self-hosted stack (never prod):
//   EXPIRED_SESSION_ID=<uuid of an imported expired demoSessions row> \
//   node --env-file=.env.local e2e/backend-acceptance.mjs
import { randomUUID } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const api = anyApi;
const url = process.env.VITE_CONVEX_URL;
const password = process.env.E2E_DEMO_PASSWORD;
if (!url || !password) throw new Error("VITE_CONVEX_URL and E2E_DEMO_PASSWORD must be set (.env.local)");
const client = new ConvexHttpClient(url);
const results = [];
let failed = 0;

function check(step, name, ok, detail = "") {
  results.push({ step, name, ok, detail });
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} [${step}] ${name}${detail ? ` — ${detail}` : ""}`);
}
async function codeOf(promise) {
  try {
    await promise;
    return "NO_ERROR";
  } catch (e) {
    return e?.data?.code ?? e?.data?.kind ?? (String(e?.message).includes("ArgumentValidationError") ? "ArgumentValidationError" : String(e?.message).slice(0, 80));
  }
}
async function errorData(promise) {
  try {
    await promise;
    return null;
  } catch (e) {
    return e?.data ?? { message: String(e?.message) };
  }
}
const kzToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

const today = kzToday();
const q = (fn, sid, args = {}) => client.query(fn, { sessionId: sid, ...args });
const m = (fn, sid, args = {}) => client.mutation(fn, { sessionId: sid, ...args });

// ---- Fork: wrong password (F-1 AC4) ----
const wrongSid = randomUUID();
const wrong = await client.mutation(api.demo.signIn, { sessionId: wrongSid, password: `${password}x` });
check("F1-AC4", "wrong password returns WRONG_PASSWORD", wrong.ok === false && wrong.code === "WRONG_PASSWORD", JSON.stringify(wrong));
const wrongStatus = await client.query(api.demo.sessionStatus, { sessionId: wrongSid });
check("F1-AC4", "session stays invalid after a wrong password", wrongStatus.valid === false);
check("F1-AC3", "guarded query refuses the not-signed-in session", (await codeOf(q(api.screens.options, wrongSid))) === "UNAUTHENTICATED");

// ---- Step 1: sign in, «Главная» shows 100 screens ----
const sid = randomUUID();
const ok = await client.mutation(api.demo.signIn, { sessionId: sid, password });
check(1, "signIn with the shared password", ok.ok === true);
check(1, "sessionStatus valid", (await client.query(api.demo.sessionStatus, { sessionId: sid })).valid === true);
const dash = await q(api.dashboard.summary, sid, { from: addDays(today, -6), to: today });
check(1, "dashboard: network of 100 screens", dash.screens.total === 100, JSON.stringify(dash.screens));
check(1, "dashboard: planned and log shows are separate values", typeof dash.plannedShows === "number" && typeof dash.logShows === "number", `planned=${dash.plannedShows} log=${dash.logShows}`);
const notes = await q(api.dashboard.notifications, sid);
check(1, "notifications: «Экран недоступен» and «Кампания скоро завершится» kinds present", notes.some((n) => n.kind === "screen_offline") && notes.some((n) => n.kind === "campaign_ending"), `${notes.length} items`);

// ---- F-11 seed ----
const all = await q(api.screens.list, sid);
const cities = new Set(all.rows.map((r) => r.city));
check("F11", "seed: 100 screens in 4 regions", all.rows.length === 100 && cities.size === 4, [...cities].join(","));
const offline = all.rows.filter((r) => r.status === "offline").length;
check("F11", "seed: some screens offline", offline > 0 && offline < 100, `offline=${offline}`);
const noCam = all.rows.filter((r) => !r.hasCamera).length;
check("F11", "seed: some screens with camera, some without", noCam > 0 && noCam < 100, `noCamera=${noCam}`);

// ---- Step 2: filter by Astana, open a card ----
const ast = await q(api.screens.list, sid, { city: "astana" });
check(2, "screens.list(city=astana) returns only Astana screens", ast.rows.length > 0 && ast.rows.every((r) => r.city === "astana"), `rows=${ast.rows.length}`);
const offRows = await q(api.screens.list, sid, { screenStatus: "offline" });
check(2, "status filter offline returns only offline screens", offRows.rows.length === offline && offRows.rows.every((r) => r.status === "offline"));
const card = await q(api.screens.get, sid, { screenId: ast.rows[0]._id });
check(2, "screens.get opens the card", card.screen._id === ast.rows[0]._id, card.screen.code);

// ---- Step 3: occupancy, schedule, demo audience on the card ----
check(3, "card has occupancy, campaigns, schedule hours and audience", typeof card.occupancyTodayPercent === "number" && card.campaigns.length > 0 && card.hours.length > 0 && (card.audience === null || card.audience.people >= 0), `occ=${card.occupancyTodayPercent}% campaigns=${card.campaigns.length} hours=${card.hours.length} audience=${card.audience ? "yes" : "null (no camera)"}`);
const camless = all.rows.find((r) => !r.hasCamera);
const camlessCard = await q(api.screens.get, sid, { screenId: camless._id });
check("noCamera", "card of a screen without camera has audience null («нет камеры»)", camlessCard.audience === null, camless.code);

// ---- Steps 4-5: new campaign on several screens, availability and planned shows ----
const free = all.rows.filter((r) => r.city === "karaganda" && r.status === "online" && r.workStartHour === 7 && r.workEndHour === 23).slice(0, 3);
const req = { startDate: addDays(today, -3), endDate: addDays(today, 6), startHour: 8, endHour: 20, slotsPerCycle: 1, screenIds: free.map((s) => s._id) };
const avail = await q(api.campaigns.checkAvailability, sid, req);
check(5, "availability: no conflicts for 1 slot 08–20 on 3 screens", avail.conflictCount === 0, `conflicts=${avail.conflictCount}`);
check(5, "planned shows: 720 per screen per day, 2 160 per day for 3 screens (SoW example)", avail.byScreen.every((s) => s.perDay === 720) && avail.perDay === 2160, `perDay=${avail.perDay}`);
check(5, "planned shows for the period = 2 160 × 10 days", avail.total === 21600, `total=${avail.total}`);
const before = await q(api.campaigns.list, sid);
const name = `E2E backend ${Date.now().toString(36)}`;
const newId = await m(api.campaigns.create, sid, { ...req, name, advertiser: "Demo E2E", creative: { kind: "placeholder", key: "placeholder-1" } });
check(4, "campaigns.create accepts the values", typeof newId === "string");

// ---- Step 6: conflicting create is refused ----
const over = { ...req, slotsPerCycle: 12 };
const overAvail = await q(api.campaigns.checkAvailability, sid, over);
const c0 = overAvail.conflicts[0];
check(6, "availability names screens and hours in conflict", overAvail.conflictCount > 0 && c0 && c0.screenId && typeof c0.hour === "number", c0 ? `first: ${c0.date} ${c0.hour}:00 free=${c0.free} requested=${c0.requested}` : "none");
const conflictErr = await errorData(m(api.campaigns.create, sid, { ...over, name: `${name} over`, advertiser: "Demo E2E", creative: { kind: "placeholder", key: "placeholder-2" } }));
check(6, "create with 12 slots is refused with SLOT_CONFLICT and a conflict list", conflictErr?.code === "SLOT_CONFLICT" && conflictErr.conflicts?.length > 0, `code=${conflictErr?.code} conflicts=${conflictErr?.conflicts?.length}`);
const afterConflict = await q(api.campaigns.list, sid);
check(6, "conflicting campaign is not saved", afterConflict.length === before.length + 1 && !afterConflict.some((c) => c.name === `${name} over`));

// ---- Step 7: in the list, after "refresh" (new client), visible to another viewer (F-1 AC6) ----
const sid2 = randomUUID();
await new ConvexHttpClient(url).mutation(api.demo.signIn, { sessionId: sid2, password });
const list2 = await q(api.campaigns.list, sid2);
const mine = list2.find((c) => c._id === newId);
check(7, "new campaign is in the list for a second viewer", !!mine, mine ? `${mine.status}, planned=${mine.plannedShows}` : "missing");
check("F6-AC9", "new campaign has 0 shows by the log", mine?.logShows === 0, `log=${mine?.logShows}`);

// ---- Step 8: «Расписание» shows the new campaign in its slots ----
const sched = await q(api.schedule.day, sid, { screenId: free[0]._id, date: today });
const h8 = sched.hours.find((h) => h.hour === 8);
const h20 = sched.hours.find((h) => h.hour === 20);
check(8, "schedule 08:00 has the new campaign in a slot", !!h8?.slots.some((s) => s.campaignId === newId && s.campaignName === name));
check(8, "schedule 20:00 (outside show hours) has no slot of it", !h20?.slots.some((s) => s.campaignId === newId));
const card2 = await q(api.screens.get, sid, { screenId: free[0]._id });
check("F11-AC4", "billboard card lists the new campaign too (schedule = card)", JSON.stringify(card2).includes(newId));

// ---- Step 9: report of a seeded campaign ----
const summer = list2.find((c) => c.name === "Летняя акция");
const rep = await q(api.reports.campaign, sid, { campaignId: summer._id });
const p = rep.placement;
check(9, "seeded report: plan > 0, log > 0, log ≤ plan", rep.campaign.name === "Летняя акция" && p.plannedShows > 0 && p.logShows > 0 && p.logShows <= p.plannedShows, `planned=${p.plannedShows} log=${p.logShows}`);
check(9, "completion % = log / planned × 100", p.completion === Math.round((p.logShows / p.plannedShows) * 1000) / 10, `completion=${p.completion}`);
check(9, "2 separate blocks: placement and screenAnalytics", !!rep.placement && !!rep.screenAnalytics && !("traffic" in rep.placement), `traffic=${rep.screenAnalytics.traffic} looks=${rep.screenAnalytics.looks}`);
check(9, "chart per day and distribution per screen", p.byDay.length > 0 && p.byScreen.length === rep.screens.length, `days=${p.byDay.length} screens=${p.byScreen.length}`);

// ---- Fork: simulate on a planned campaign is refused ----
const planned = list2.find((c) => c.name === "Презентация автомобиля");
check("F10", "simulate on «Запланирована» campaign → CAMPAIGN_NOT_STARTED", (await codeOf(m(api.showLog.simulate, sid, { campaignId: planned._id }))) === "CAMPAIGN_NOT_STARTED");

// ---- Step 11: simulate on the new campaign ----
const sim = await m(api.showLog.simulate, sid, { campaignId: newId });
check(11, "simulate creates log rows for the past part", sim.rows > 0, JSON.stringify(sim));
const after = await q(api.campaigns.get, sid, { campaignId: newId });
check(11, "log shows appear and do not exceed planned", after.logShows > 0 && after.logShows <= after.plannedShows, `log=${after.logShows} planned=${after.plannedShows}`);
// 3 past days + today's finished hours 08–20 (simulate-shows spec: today counts finished hours), × 3 screens, 60 shows/h
const kzHour = new Date(Date.now() + 5 * 3_600_000).getUTCHours();
const pastPlan = 3 * (3 * 720 + Math.min(12, Math.max(0, kzHour - 8)) * 60);
check(11, "log ≤ plan of the past part only", after.logShows <= pastPlan, `log=${after.logShows} pastPlan=${pastPlan}`);
const rep2 = await q(api.reports.campaign, sid, { campaignId: newId });
check(11, "report of the new campaign shows the log", rep2.placement.logShows === after.logShows && rep2.placement.logShows <= rep2.placement.plannedShows, `log=${rep2.placement.logShows} planned=${rep2.placement.plannedShows} completion=${rep2.placement.completion}`);
const dash2 = await q(api.dashboard.summary, sid, { from: addDays(today, -6), to: today });
check("F10-AC4", "dashboard log shows grow after simulate", dash2.logShows > dash.logShows, `${dash.logShows} → ${dash2.logShows}`);

// ---- Negative auth: every public function, unknown session and expired session ----
const expired = process.env.EXPIRED_SESSION_ID;
const sampleArgs = {
  "screens.options": [api.screens.options, "q", {}],
  "screens.list": [api.screens.list, "q", {}],
  "screens.get": [api.screens.get, "q", { screenId: free[0]._id }],
  "campaigns.list": [api.campaigns.list, "q", {}],
  "campaigns.get": [api.campaigns.get, "q", { campaignId: newId }],
  "campaigns.checkAvailability": [api.campaigns.checkAvailability, "q", req],
  "campaigns.create": [api.campaigns.create, "m", { ...req, name: "x", advertiser: "x", creative: { kind: "placeholder", key: "placeholder-1" } }],
  "campaigns.generateUploadUrl": [api.campaigns.generateUploadUrl, "m", {}],
  "dashboard.summary": [api.dashboard.summary, "q", { from: today, to: today }],
  "dashboard.notifications": [api.dashboard.notifications, "q", {}],
  "schedule.day": [api.schedule.day, "q", { screenId: free[0]._id, date: today }],
  "reports.campaign": [api.reports.campaign, "q", { campaignId: newId }],
  "analytics.screenPeriod": [api.analytics.screenPeriod, "q", { screenId: free[0]._id, from: today, to: today }],
  "showLog.simulate": [api.showLog.simulate, "m", { campaignId: newId }],
  "demo.reset": [api.demo.reset, "m", {}],
};
for (const [fname, [fn, kind, args]] of Object.entries(sampleArgs)) {
  const call = (s) => (kind === "q" ? q(fn, s, args) : m(fn, s, args));
  const noArg = await codeOf(kind === "q" ? client.query(fn, args) : client.mutation(fn, args));
  const unknown = await codeOf(call(randomUUID()));
  const exp = expired ? await codeOf(call(expired)) : "NOT_RUN";
  check("AUTHZ", `${fname}: no sessionId / unknown / expired`, noArg !== "NO_ERROR" && unknown === "UNAUTHENTICATED" && exp === "UNAUTHENTICATED", `${noArg} / ${unknown} / ${exp}`);
}
check("AUTHZ", "sessionStatus(expired) = invalid", expired ? (await client.query(api.demo.sessionStatus, { sessionId: expired })).valid === false : false);
const stillThere = await q(api.campaigns.get, sid, { campaignId: newId });
check("AUTHZ", "refused calls changed nothing (new campaign intact, log unchanged)", stillThere.logShows === after.logShows);

// ---- Step 12: reset ----
await m(api.demo.reset, sid);
const reseeded = await q(api.campaigns.list, sid);
check(12, "after reset the new campaign is gone", !reseeded.some((c) => c.name === name));
check(12, "after reset the 10 seed campaigns are back", reseeded.length === 10 && ["Летняя акция", "Открытие магазина", "Презентация автомобиля"].every((n) => reseeded.some((c) => c.name === n)), `count=${reseeded.length}`);
check(12, "get(new id) after reset → NOT_FOUND", (await codeOf(q(api.campaigns.get, sid, { campaignId: newId }))) === "NOT_FOUND");
const afterReset = await q(api.screens.list, sid);
check(12, "after reset 100 screens", afterReset.rows.length === 100);
check(12, "session survives reset", (await client.query(api.demo.sessionStatus, { sessionId: sid })).valid === true);

console.log(`\nBACKEND ${failed === 0 ? "PASS" : "FAIL"}: ${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
