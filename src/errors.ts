// Error code -> Russian text (design D5). The backend sends codes; the texts live in shared/strings.
import { ConvexError } from "convex/values";
import { ERROR_CODES, type ErrorCode } from "../convex/lib/errors";
import { text, type Params } from "../shared/strings";

type ErrorData = { code?: unknown; kind?: unknown; retryAfter?: unknown } & Record<string, unknown>;

function errorData(error: unknown): ErrorData | undefined {
  return error instanceof ConvexError && typeof error.data === "object" && error.data !== null
    ? (error.data as ErrorData)
    : undefined;
}

/** The contract code of a failed call; `UNKNOWN` for anything else. */
export function errorCode(error: unknown): ErrorCode {
  const data = errorData(error);
  if (data?.kind === "RateLimited") return "RATE_LIMITED";
  return (ERROR_CODES as readonly unknown[]).includes(data?.code) ? (data!.code as ErrorCode) : "UNKNOWN";
}

/** The `field` detail of an INVALID_INPUT error, if any. */
export function errorField(error: unknown): string | undefined {
  const field = errorData(error)?.field;
  return typeof field === "string" ? field : undefined;
}

export function errorText(error: unknown): string {
  const code = errorCode(error);
  const params: Params = {};
  for (const [key, value] of Object.entries(errorData(error) ?? {})) {
    if (typeof value === "string" || typeof value === "number") params[key] = value;
  }
  if (code === "RATE_LIMITED") params.minutes = Math.max(1, Math.ceil(Number(params.retryAfter ?? 0) / 60_000));
  return text("ru", `errors.${code}`, params);
}
