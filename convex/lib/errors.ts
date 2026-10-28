// Stable error codes (design D5). The backend sends codes, never Russian text; the front maps them via the strings module.
import { ConvexError } from "convex/values";

export const ERROR_CODES = [
  "UNAUTHENTICATED",
  "WRONG_PASSWORD",
  "RATE_LIMITED",
  "INVALID_INPUT",
  "NOT_FOUND",
  "SLOT_CONFLICT",
  "CAMPAIGN_NOT_STARTED",
  "INVALID_CREATIVE",
  "UNKNOWN",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function fail(code: ErrorCode, details?: object): never {
  throw new ConvexError({ ...details, code });
}
