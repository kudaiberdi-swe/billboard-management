// Cycle setting (D-1) and shared constants (design D6). Pure: imported by Convex functions and the front.
export const CYCLE_SECONDS = 60;
export const SLOT_SECONDS = 5;
export const SLOTS_PER_CYCLE = CYCLE_SECONDS / SLOT_SECONDS;
export const CYCLES_PER_HOUR = 3600 / CYCLE_SECONDS;
export const SOON_END_DAYS = 3;
export const SESSION_DAYS = 7;
export const MAX_PERIOD_DAYS = 366;
export const VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const VIDEO_MAX_BYTES = 20 * 1024 * 1024;
export const PLACEHOLDER_KEYS = ["placeholder-1", "placeholder-2", "placeholder-3", "placeholder-4"] as const;
export const CITIES = ["astana", "karaganda", "atyrau", "east_kz"] as const;
export type City = (typeof CITIES)[number];
