// e2e/a11y.spec.ts: axe accessibility report (WCAG 2 A and AA) for every role and main route.
// Report only: a violation never fails this test. It fails only when the page does not load
// (the smoke reports that too). wave-e2e-qa reads the [a11y] log lines and lists critical and
// serious violations as non-blocking follow-ups.
import AxeBuilder from '@axe-core/playwright';
import { test, expect, SMOKE_ROUTES } from './fixtures';

for (const [role, routes] of Object.entries(SMOKE_ROUTES)) {
  for (const route of routes) {
    test(`${role} a11y ${route}`, { tag: '@a11y' }, async ({ asRole }) => {
      const page = await asRole(role);
      const response = await page.goto(route);
      expect(response?.ok(), `HTTP status for ${route}`).toBe(true);
      await expect(page).not.toHaveURL(/login|sign-?in/i);
      await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      for (const v of violations) {
        console.log(`[a11y] ${role} ${v.id} (${v.impact ?? 'unknown'}): ${v.nodes.length} node(s) on ${route}`);
      }
    });
  }
}
