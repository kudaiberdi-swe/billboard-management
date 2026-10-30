// e2e/kpi-align.spec.ts: c01-kpi-align, the 8 «Главная» cards line up their values per row.
// Run: npx playwright test --grep @c01-kpi-align
import { test, expect } from './fixtures';
import { t } from '../shared/strings';

const LABELS = [
  'dashboard.screens', 'dashboard.onlineOffline', 'dashboard.activeCampaigns', 'dashboard.occupancy',
  'dashboard.plannedShows', 'dashboard.logShows', 'dashboard.contacts', 'dashboard.looks',
].map((k) => t('ru', k as Parameters<typeof t>[1]));

test('[c01-kpi-align] card values line up per row', { tag: '@c01-kpi-align' }, async ({ asRole }) => {
  const page = await asRole('admin');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);

  const cards = await Promise.all(
    LABELS.map(async (name) => {
      const group = page.getByRole('group', { name, exact: true });
      await expect(group).toContainText(/\d/);
      return group.evaluate((g, text) => {
        const label = document.getElementById(g.getAttribute('aria-labelledby')!)!;
        const value = label.parentElement!.lastElementChild!;
        return {
          card: g.getBoundingClientRect().height,
          value: value.getBoundingClientRect().bottom,
          label: label.getBoundingClientRect().height,
          full: label.textContent === text && getComputedStyle(label).textOverflow !== 'ellipsis'
            && label.scrollHeight <= label.clientHeight && label.scrollWidth <= label.clientWidth,
        };
      }, name);
    }),
  );

  // not vacuous: the long label wraps, the short one does not
  expect(cards[LABELS.indexOf(t('ru', 'dashboard.occupancy'))].label)
    .toBeGreaterThan(cards[LABELS.indexOf(t('ru', 'dashboard.screens'))].label);

  for (const row of [cards.slice(0, 4), cards.slice(4, 8)]) {
    for (const c of row) {
      expect(Math.abs(c.value - row[0].value)).toBeLessThanOrEqual(1);
      expect(Math.abs(c.card - row[0].card)).toBeLessThanOrEqual(1);
    }
  }
  for (const [i, c] of cards.entries()) expect(c.full, LABELS[i]).toBe(true);
});
