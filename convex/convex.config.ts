// convex/convex.config.ts: registers the rate limiter component used by convex/rateLimits.ts.
import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(rateLimiter);

export default app;
