// playwright.config.ts: browser tests for this front. Run: npx playwright test
//
// Backend: the Convex deployment in .env.local (VITE_CONVEX_URL, the self-hosted laptop stack
// with the seed). Never prod. Sign-in is the password screen with E2E_DEMO_PASSWORD (no dev identity).
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// .env.local next to this file gives the runner E2E_DEMO_PASSWORD and the Convex URL (Node >= 20.12).
// __dirname exists when the front is CommonJS (Next.js default); an ESM front ("type": "module")
// falls back to the current dir, so run npx playwright test from the front root there.
const configDir = typeof __dirname === 'string' ? __dirname : process.cwd();
try {
  process.loadEnvFile(path.join(configDir, '.env.local'));
} catch {}

// Own port, so a developer's dev server on 3000 is never reused by mistake.
const port = process.env.E2E_PORT ?? '3100';
const remote = process.env.E2E_BASE_URL; // a deployed stand: no local web server
const baseURL = remote ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // one shared dev DB
  workers: 1,
  retries: 1,
  reporter: 'list',
  use: { baseURL, trace: 'on-first-retry', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Front only. Never start `convex dev` here: it would push this branch to the shared dev deployment.
  webServer: remote
    ? undefined
    : { command: `npx vite --port ${port} --strictPort`, url: baseURL, reuseExistingServer: false, timeout: 120_000 },
});
