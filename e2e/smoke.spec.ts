// e2e/smoke.spec.ts: every role opens its main routes without errors.
import type { ConsoleMessage } from '@playwright/test';
import { test, expect, SMOKE_ROUTES } from './fixtures';

// The browser logs a missing favicon as a console error; it is not an app error.
const isFavicon404 = (msg: ConsoleMessage) =>
  msg.text().startsWith('Failed to load resource') && msg.location().url.endsWith('/favicon.ico');

for (const [role, routes] of Object.entries(SMOKE_ROUTES)) {
  for (const route of routes) {
    test(`${role} opens ${route}`, { tag: '@smoke' }, async ({ asRole }) => {
      const page = await asRole(role);
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !isFavicon404(msg)) errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      // Soft checks: one run reports every problem on the route, not only the first.
      const response = await page.goto(route);
      expect.soft(response?.ok(), `HTTP status for ${route}`).toBe(true);
      await expect.soft(page).not.toHaveURL(/login|sign-?in/i);
      await expect.soft(page.getByRole('main').or(page.getByRole('heading', { level: 1 })).first()).toBeVisible();
      // Convex results arrive over a WebSocket; networkidle does not wait for them.
      // aria-busy="true" is the standard loading flag. No visible such element: this passes at once.
      await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
      // ponytail: short fixed settle for errors that come after the data. Replace with
      // the app's own "loaded" signal when it has one.
      await page.waitForTimeout(500);
      expect(errors, `console/page errors on ${route}`).toEqual([]);
    });
  }
}
