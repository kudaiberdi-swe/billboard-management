// Scheduled jobs. f06-campaign-create: orphan upload sweep (echo security gate S6).
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.daily("sweep orphan uploads", { hourUTC: 21, minuteUTC: 0 }, internal.campaigns.sweepOrphanUploads, {}); // 02:00 UTC+5
export default crons;
