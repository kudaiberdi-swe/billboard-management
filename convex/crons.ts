// Scheduled jobs. f06-campaign-create: orphan upload sweep (echo security gate S6). KI-06: expired sessions, old rate-limit rows.
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily("sweep orphan uploads", { hourUTC: 21, minuteUTC: 0 }, internal.campaigns.sweepOrphanUploads, {}); // 02:00 UTC+5
crons.daily("purge expired sessions", { hourUTC: 21, minuteUTC: 10 }, internal.demo.purgeExpiredSessions, {});
crons.daily("clear old rate-limit rows", { hourUTC: 21, minuteUTC: 20 }, internal.demo.clearOldRateLimits, {});
export default crons;
