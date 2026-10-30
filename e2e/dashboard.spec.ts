// e2e/dashboard.spec.ts: «Главная» scenarios of openspec/specs/dashboard/spec.md that had no browser test
// (c01-kpi-align round e2e). Backend-only scenarios (INVALID_INPUT, NOT_FOUND, no session) stay in
// convex/dashboard.test.ts and e2e/backend-acceptance.mjs.
// Run: npx playwright test --grep @dashboard
import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import { test, expect } from './fixtures';
import { t } from '../shared/strings';
import { CITIES } from '../convex/lib/config';

const L = (k: Parameters<typeof t>[1]) => t('ru', k);
const kzToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const ready = (page: Page) => expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
const card = (page: Page, key: Parameters<typeof t>[1]) => page.getByRole('group', { name: L(key), exact: true });
const valueOf = async (page: Page, key: Parameters<typeof t>[1]) =>
  (await card(page, key).innerText()).replace(L(key), '').trim();
const num = (s: string) => Number(s.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, ''));
const COUNT_CARDS = ['dashboard.screens', 'dashboard.activeCampaigns', 'dashboard.plannedShows', 'dashboard.logShows', 'dashboard.contacts', 'dashboard.looks'] as const;
const chartRows = (page: Page) => page.getByRole('table', { name: L('dashboard.occupancyChart') }).getByRole('row');
const block = (page: Page, key: Parameters<typeof t>[1]) => page.getByRole('region', { name: L(key), exact: true });

test.describe('dashboard regression', { tag: '@dashboard' }, () => {
  test('[dashboard] cards show the network values', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const labels = ['dashboard.screens', 'dashboard.onlineOffline', 'dashboard.activeCampaigns', 'dashboard.occupancy',
      'dashboard.plannedShows', 'dashboard.logShows', 'dashboard.contacts', 'dashboard.looks'] as const;
    for (const k of labels) await expect(card(page, k)).toHaveCount(1);
    await expect(page.getByRole('main').getByRole('group')).toHaveCount(8);
    expect(num(await valueOf(page, 'dashboard.screens'))).toBe(100);
    const [online, offline] = (await valueOf(page, 'dashboard.onlineOffline')).split('/').map(num);
    expect(online + offline).toBe(100);
    expect(offline).toBe(6); // seed: 6 screens «офлайн»
    expect(num(await valueOf(page, 'dashboard.activeCampaigns'))).toBeGreaterThanOrEqual(2);
    for (const k of ['dashboard.occupancy', 'dashboard.plannedShows', 'dashboard.logShows', 'dashboard.contacts', 'dashboard.looks'] as const) {
      expect(await valueOf(page, k), k).toMatch(/\d/);
    }
  });

  test('[dashboard] screens per city block', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const rows = block(page, 'dashboard.screensByCity').getByRole('row');
    await expect(rows).toHaveText(CITIES.map((c) => new RegExp(`^${t('ru', `cities.${c}`)}\\s*\\d+$`)));
    const counts = (await rows.allInnerTexts()).map((r) => num(r.replace(/^\D+/, '')));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(100);
  });

  test('[dashboard] active campaigns list', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const list = block(page, 'dashboard.activeList');
    await expect(list.getByRole('row', { name: /Летняя акция.*Demo Cola/ })).toHaveCount(1);
    await expect(list.getByRole('row', { name: /Открытие магазина.*Demo Market/ })).toHaveCount(1);
    await expect(list.getByText('Презентация автомобиля')).toHaveCount(0);
  });

  test('[dashboard] occupancy chart per day', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    await expect(chartRows(page)).toHaveCount(1 + 7); // header + 7 days (default period)
  });

  test('[dashboard] city filter changes all values', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    await page.getByRole('combobox', { name: L('dashboard.filterCity'), exact: true }).click();
    await page.getByRole('option', { name: L('cities.astana'), exact: true }).click();
    await expect(page).toHaveURL(/city=astana/);
    await ready(page);
    await expect(card(page, 'dashboard.screens')).toContainText('35');
    // the block keeps all 4 regions; only «Астана» counts screens
    await expect(block(page, 'dashboard.screensByCity').getByRole('row'))
      .toHaveText(CITIES.map((c) => new RegExp(`^${t('ru', `cities.${c}`)}\\s*${c === 'astana' ? 35 : 0}$`)));
  });

  test('[dashboard] billboard filter changes all values', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    await page.getByRole('combobox', { name: L('dashboard.filterBillboard'), exact: true }).click();
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/screen=/);
    await ready(page);
    expect(num(await valueOf(page, 'dashboard.screens'))).toBe(1);
    const counts = (await block(page, 'dashboard.screensByCity').getByRole('row').allInnerTexts()).map((r) => num(r.replace(/^\D+/, '')));
    expect(counts.reduce((x, y) => x + y, 0)).toBe(1);
  });

  test('[dashboard] period filter changes all values', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const week = num(await valueOf(page, 'dashboard.plannedShows'));
    const today = kzToday();
    await page.goto(`/?from=${today}&to=${today}`);
    await ready(page);
    await expect(chartRows(page)).toHaveCount(1 + 1);
    const day = num(await valueOf(page, 'dashboard.plannedShows'));
    expect(day).toBeGreaterThan(0);
    expect(day).toBeLessThan(week);
  });

  test('[dashboard] empty selection shows zero', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    await page.getByRole('combobox', { name: L('dashboard.filterCity'), exact: true }).click();
    await page.getByRole('option', { name: L('cities.karaganda'), exact: true }).click();
    await page.getByRole('combobox', { name: L('dashboard.filterBillboard'), exact: true }).click();
    await page.getByRole('option').first().click();
    await expect(page).toHaveURL(/screen=/);
    const screen = new URL(page.url()).searchParams.get('screen');
    await page.goto(`/?city=astana&screen=${screen}`);
    await ready(page);
    for (const k of COUNT_CARDS) expect(num(await valueOf(page, k)), k).toBe(0);
    expect((await valueOf(page, 'dashboard.onlineOffline')).split('/').map(num)).toEqual([0, 0]);
    expect(num(await valueOf(page, 'dashboard.occupancy'))).toBe(0);
  });

  test('[dashboard] offline screens form one linked group', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const list = block(page, 'dashboard.notificationsTitle');
    await expect(list.getByText(L('notifications.screen_offline'), { exact: true })).toHaveCount(1);
    const group = list.getByRole('listitem').filter({ hasText: L('notifications.screen_offline') }).first();
    await expect(group).toContainText('6');
    const names = group.getByRole('list').getByRole('link');
    await expect(names).toHaveCount(6);
    for (const href of await names.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) {
      expect(href).toMatch(/^\/billboards\/[^/?]+$/);
    }
    await expect(group.getByRole('link', { name: L('dashboard.allOffline') })).toHaveAttribute('href', '/billboards?status=offline');
  });

  test('[dashboard] ending campaign links to its card', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const item = block(page, 'dashboard.notificationsTitle').getByRole('listitem').filter({ hasText: L('notifications.campaign_ending') }).first();
    const link = item.getByRole('link');
    const name = (await link.innerText()).trim();
    await link.click();
    await expect(page).toHaveURL(/\/campaigns\/[^/?]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
  });

  test('[dashboard] log shows update after simulation', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const before = num(await valueOf(page, 'dashboard.logShows'));
    // A second viewer (API client) creates a running campaign and simulates it; the open page must update by itself.
    const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
    const sessionId = randomUUID();
    expect((await client.mutation(anyApi.demo.signIn, { sessionId, password: process.env.E2E_DEMO_PASSWORD! })).ok).toBe(true);
    const all = await client.query(anyApi.screens.list, { sessionId });
    const free = all.rows.filter((r: { city: string; status: string; workStartHour: number; workEndHour: number }) =>
      r.city === 'karaganda' && r.status === 'online' && r.workStartHour === 7 && r.workEndHour === 23).slice(0, 3);
    const today = kzToday();
    const campaignId = await client.mutation(anyApi.campaigns.create, {
      sessionId, name: `E2E dashboard ${Date.now().toString(36)}`, advertiser: 'Demo E2E',
      creative: { kind: 'placeholder', key: 'placeholder-1' },
      startDate: addDays(today, -3), endDate: addDays(today, 3), startHour: 8, endHour: 20, slotsPerCycle: 1,
      screenIds: free.map((s: { _id: string }) => s._id),
    });
    try {
      await client.mutation(anyApi.showLog.simulate, { sessionId, campaignId });
      await expect.poll(async () => num(await valueOf(page, 'dashboard.logShows'))).toBeGreaterThan(before);
    } finally {
      await client.mutation(anyApi.demo.reset, { sessionId }); // back to the seed
    }
  });
});
