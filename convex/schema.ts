// Shared data model of the base contract (design D2, ADR-0004). Feature changes do not redefine it.
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const city = v.union(v.literal("astana"), v.literal("karaganda"), v.literal("atyrau"), v.literal("east_kz"));
export const screenStatus = v.union(v.literal("online"), v.literal("offline"));
export const creative = v.union(
  v.object({ kind: v.literal("placeholder"), key: v.string() }), // key from PLACEHOLDER_KEYS
  v.object({ kind: v.literal("video"), storageId: v.id("_storage") }),
);

export default defineSchema({
  screens: defineTable({
    code: v.string(), // "AST-001", unique
    name: v.string(),
    city,
    address: v.string(), // synthetic, not a real building
    lat: v.number(),
    lng: v.number(), // synthetic, near the city centre
    status: screenStatus,
    workStartHour: v.number(), // integer 0..23
    workEndHour: v.number(), // integer 1..24, > workStartHour; 24/7 = 0..24
    hasCamera: v.boolean(),
    hasVehicleMetric: v.boolean(),
    imageKey: v.string(), // file under public/demo/screens/
  })
    .index("by_code", ["code"])
    .index("by_city", ["city"]),

  campaigns: defineTable({
    name: v.string(),
    advertiser: v.string(), // text, no advertisers table
    startDate: v.string(), // "YYYY-MM-DD", inclusive
    endDate: v.string(), // "YYYY-MM-DD", inclusive, >= startDate
    startHour: v.number(), // integer 0..23
    endHour: v.number(), // integer 1..24, > startHour, exclusive
    slotsPerCycle: v.number(), // integer 1..SLOTS_PER_CYCLE
    screenIds: v.array(v.id("screens")), // 1..100, unique
    creative,
  }), // no status field (D-6); creation order = _creationTime

  showLog: defineTable({
    campaignId: v.id("campaigns"),
    screenId: v.id("screens"),
    date: v.string(), // "YYYY-MM-DD"
    shows: v.number(), // integer >= 0, <= planned shows of that screen and day
  })
    .index("by_campaign", ["campaignId", "date"])
    .index("by_date", ["date"]),

  screenEvents: defineTable({
    screenId: v.id("screens"),
    at: v.number(), // ms since epoch
    kind: v.union(v.literal("went_offline"), v.literal("back_online")),
  }).index("by_screen", ["screenId", "at"]),

  demoSessions: defineTable({
    sessionId: v.string(), // crypto.randomUUID() from the browser, 36 chars
    expiresAt: v.number(), // ms; sign-in time + SESSION_DAYS
  }).index("by_sessionId", ["sessionId"]),
});
