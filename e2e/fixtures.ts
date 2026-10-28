// e2e/fixtures.ts: import { test, expect } from './fixtures' in every spec.
//
// Naming: a scenario test is declared test('[<change-id>] <scenario name>', ...), the
// exact title as the first argument (check-scenarios matches it). Tags: @<change-id>, @wave-<N>, @smoke.
// Locate elements by getByRole, getByLabel or visible text only. No CSS or test ids.
//
// Login (ADR-0003, design D10): asRole(role) opens a new browser context and signs in on the
// password screen with E2E_DEMO_PASSWORD (same value as the Convex env DEMO_PASSWORD). There is
// no dev identity: the demo has one role and one shared password.
// .env.local: E2E_DEMO_PASSWORD=<value>. Never add a VITE_ prefix (it would ship in the bundle).
import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { t } from '../shared/strings';

// Role -> main routes: the one role R-1 and the 6 sections (base contract routes).
export const SMOKE_ROUTES: Record<string, readonly string[]> = {
  admin: ['/', '/billboards', '/campaigns', '/schedule', '/analytics', '/reports'],
};
export const ROLES = Object.keys(SMOKE_ROUTES);

type Fixtures = {
  runId: string; // prefix for all data a test creates; never assume an empty DB
  asRole: (role: string) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  runId: async ({}, use, testInfo) => {
    await use(`e2e-${testInfo.workerIndex}-${Date.now().toString(36)}`);
  },
  asRole: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    await use(async (role) => {
      if (!ROLES.includes(role)) throw new Error(`unknown role ${role}`);
      const password = process.env.E2E_DEMO_PASSWORD;
      if (!password) throw new Error('E2E_DEMO_PASSWORD is not set: add it to .env.local (same as Convex DEMO_PASSWORD)');
      const context = await browser.newContext();
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/login');
      await page.getByLabel(t('ru', 'login.password')).fill(password);
      await page.getByRole('button', { name: t('ru', 'login.submit') }).click();
      await expect(page.getByRole('heading', { level: 1, name: t('ru', 'routes.home') })).toBeVisible();
      return page;
    });
    for (const context of contexts) await context.close();
  },
});

export { expect };
