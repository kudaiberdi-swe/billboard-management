/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as demo from "../demo.js";
import type * as lib_analytics from "../lib/analytics.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_config from "../lib/config.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_hash from "../lib/hash.js";
import type * as lib_showLog from "../lib/showLog.js";
import type * as lib_slots from "../lib/slots.js";
import type * as lib_status from "../lib/status.js";
import type * as lib_time from "../lib/time.js";
import type * as rateLimits from "../rateLimits.js";
import type * as screens from "../screens.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  demo: typeof demo;
  "lib/analytics": typeof lib_analytics;
  "lib/auth": typeof lib_auth;
  "lib/config": typeof lib_config;
  "lib/errors": typeof lib_errors;
  "lib/hash": typeof lib_hash;
  "lib/showLog": typeof lib_showLog;
  "lib/slots": typeof lib_slots;
  "lib/status": typeof lib_status;
  "lib/time": typeof lib_time;
  rateLimits: typeof rateLimits;
  screens: typeof screens;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
