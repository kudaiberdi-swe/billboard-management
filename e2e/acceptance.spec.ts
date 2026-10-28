// e2e/acceptance.spec.ts: SoW §7.3 acceptance scenario (12 steps, role R-1) and the SoW §4 forks it touches.
// Runs in file order on one worker against the seeded stack; step 12 resets the demo.
// Run: npx playwright test --grep "@acceptance(\s|$)" --retries=0
import dayjs from 'dayjs';
import 'dayjs/locale/ru.js';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { t } from '../shared/strings';

const SHOTS = 'docs/e2e/screens';
const L = (k: Parameters<typeof t>[1]) => t('ru', k);
const kzToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
const dayLabel = (d: string) => dayjs(d).locale('ru').format('D MMMM YYYY');
const addDays = (d: string, n: number) => dayjs(d).add(n, 'day').format('YYYY-MM-DD');
const num = (s: string) => Number(s.replace(/[^\d]/g, ''));
// Karaganda screens that work 07:00–23:00 and are «онлайн» in the seed (KRG-007 is offline, KRG-002 is 24/7).
const SCREENS = ['KRG-003', 'KRG-004', 'KRG-005'];
const NAME = `E2E приёмка ${Date.now().toString(36)}`;
// Later steps find the campaign by prefix: a retry restarts the worker and NAME changes; step 12 removes it.
const CREATED = /^E2E приёмка /;

const ready = (page: Page) => expect(page.locator('[aria-busy="true"]:visible')).toHaveCount(0);
const shot = (page: Page, file: string) => page.screenshot({ path: `${SHOTS}/${file}`, fullPage: true });
const nav = (page: Page) => page.getByRole('navigation', { name: L('common.menu') });
const demoLabel = (page: Page) => page.getByText(L('demo.label')).first();

async function pick(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option }).first().click();
}

async function valueOf(page: Page, label: string) {
  // the group reads "<label> <value> [<demo label>]"
  const text = await page.getByRole('group', { name: label, exact: true }).innerText();
  return num(text.replace(label, '').split(L('demo.label'))[0]);
}

test.describe('SoW 7.3 acceptance', { tag: '@acceptance' }, () => {
  test('step 1: shared password opens «Главная» with 100 screens', async ({ asRole }) => {
    const page = await asRole('admin');
    await ready(page);
    const screens = page.getByRole('group', { name: L('dashboard.screens'), exact: true });
    await expect(screens).toContainText('100');
    // F-1 AC1: 6 sections in the ТЗ order
    const links = nav(page).getByRole('link');
    await expect(links).toHaveText([
      L('routes.home'), L('routes.billboards'), L('routes.campaigns'), L('routes.schedule'), L('routes.analytics'), L('routes.reports'),
    ]);
    await expect(demoLabel(page)).toBeVisible();
    await shot(page, '01-admin-home.png');
  });

  test('step 2: «Билборды» filtered by Astana, a card opens', async ({ asRole }) => {
    const page = await asRole('admin');
    await nav(page).getByRole('link', { name: L('routes.billboards') }).click();
    await ready(page);
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(101); // header + 100
    await pick(page, L('billboards.filterCity'), L('cities.astana'));
    await expect(page).toHaveURL(/city=astana/);
    await ready(page);
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(36); // header + 35 Astana screens
    for (const city of ['karaganda', 'atyrau', 'east_kz'] as const) {
      await expect(page.getByRole('table').getByText(L(`cities.${city}`), { exact: true })).toHaveCount(0);
    }
    await shot(page, '02-admin-billboards-astana.png');
    await rows.nth(1).getByRole('link').click();
    await expect(page).toHaveURL(/\/billboards\/[^/]+$/);
    await ready(page);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('AST-');
    await shot(page, '02b-admin-billboard-card.png');
  });

  test('step 3: card shows occupancy, schedule and demo audience with «Демонстрационные данные»', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/billboards?city=astana');
    await ready(page);
    await page.getByRole('link', { name: /AST-001/ }).click();
    await ready(page);
    await expect(page.getByText(L('billboards.occupancyToday'))).toBeVisible();
    await expect(page.getByRole('region', { name: L('billboards.scheduleToday') })).toBeVisible();
    const audience = page.getByRole('region', { name: L('billboards.audience') });
    await expect(audience).toBeVisible();
    await expect(audience.getByText(L('demo.label'))).toBeVisible();
    await expect(audience.getByText(L('billboards.people'))).toBeVisible();
    await shot(page, '03-admin-card-values.png');
  });

  test('steps 4-7: create a campaign, availability, conflict blocks save, saved and kept after refresh', async ({ asRole }) => {
    test.setTimeout(90_000);
    const page = await asRole('admin');
    await nav(page).getByRole('link', { name: L('routes.campaigns') }).click();
    await ready(page);
    await page.getByRole('link', { name: L('campaignForm.create') }).click();
    await expect(page.getByRole('heading', { level: 1, name: L('campaignForm.title') })).toBeVisible();

    // step 4: the form accepts the values (start 3 days ago so step 11 has a past part to simulate)
    const today = kzToday();
    await page.getByLabel(L('campaignForm.fields.name')).fill(NAME);
    await page.getByLabel(L('campaignForm.fields.advertiser')).fill('Demo E2E');
    await page.getByRole('button', { name: L('campaignForm.fields.startDate') }).click();
    await page.getByRole('button', { name: dayLabel(addDays(today, -3)), exact: true }).click();
    const screens = page.getByRole('combobox', { name: L('campaignForm.fields.screenIds') });
    for (const code of SCREENS) {
      await screens.click();
      await screens.fill(code);
      await page.getByRole('option', { name: new RegExp(`^${code}`) }).click();
    }
    await page.keyboard.press('Escape');
    await shot(page, '04-admin-campaign-form.png');

    // step 5: free slots → availability and planned shows (1 slot, 08–20 → 720 per screen, 2 160 per day)
    const preview = page.getByRole('heading', { name: L('campaignForm.plannedTitle') }).locator('..');
    await expect(preview.getByText(L('campaignForm.fits'))).toBeVisible();
    for (const code of SCREENS) await expect(preview.getByRole('row', { name: new RegExp(code) })).toContainText(/720/);
    await expect(preview.getByRole('row', { name: L('campaignForm.perDay') })).toContainText(/2\s?160/);
    await expect(preview.getByRole('row', { name: L('campaignForm.perPeriod') })).toContainText(/21\s?600/);
    await shot(page, '05-admin-availability.png');

    // step 6: more slots than free → a message names screens and hours; save is blocked
    await pick(page, L('campaignForm.fields.slotsPerCycle'), /^12$/);
    const conflict = preview.getByRole('alert').or(preview.getByText(/Недостаточно свободных слотов/));
    await expect(conflict.first()).toContainText('Недостаточно свободных слотов');
    await expect(conflict.first()).toContainText(/KRG-00[345]/);
    await expect(conflict.first()).toContainText(/\d{2}:00/);
    await page.getByRole('button', { name: L('campaignForm.save') }).click();
    await expect(page.getByText(/Недостаточно свободных слотов/).nth(1)).toBeVisible();
    await expect(page).toHaveURL(/\/campaigns\/new$/);
    await shot(page, '06-admin-slot-conflict.png');

    // step 7: back to free slots, save, refresh
    await pick(page, L('campaignForm.fields.slotsPerCycle'), /^1$/);
    await expect(preview.getByText(L('campaignForm.fits'))).toBeVisible();
    await page.getByRole('button', { name: L('campaignForm.save') }).click();
    await expect(page).toHaveURL(/\/campaigns$/);
    await expect(page.getByRole('link', { name: NAME })).toBeVisible();
    await page.reload();
    await ready(page);
    const row = page.getByRole('row', { name: new RegExp(NAME) });
    await expect(row).toBeVisible();
    // F-6 AC9: a new campaign has 0 shows by the log until «Смоделировать показы»
    await expect(row.getByRole('cell').last()).toHaveText('0');
    await shot(page, '07-admin-campaign-saved-after-refresh.png');
  });

  test('F-1 AC6: a second viewer sees the new campaign', async ({ asRole }) => {
    const page = await asRole('admin'); // new browser context = another viewer
    await page.goto('/campaigns');
    await ready(page);
    await expect(page.getByRole('link', { name: CREATED })).toBeVisible();
  });

  test('step 8: «Расписание» for a selected screen shows the new campaign in its slots', async ({ asRole }) => {
    const page = await asRole('admin');
    await nav(page).getByRole('link', { name: L('routes.schedule') }).click();
    await pick(page, L('schedule.city'), L('cities.karaganda'));
    const billboard = page.getByRole('combobox', { name: L('schedule.billboard'), exact: true });
    await billboard.click();
    await billboard.fill(SCREENS[0]);
    await page.getByRole('option', { name: new RegExp(`^${SCREENS[0]}`) }).click();
    await ready(page);
    const hour8 = page.getByRole('button', { name: /^08:00–09:00/ });
    await expect(page.getByRole('link', { name: CREATED }).first()).toBeVisible();
    await hour8.click();
    await expect(page.getByText(L('schedule.cycleTitle'))).toBeVisible();
    await expect(page.getByText('00–05 сек.')).toBeVisible();
    await expect(page.getByText('55–60 сек.')).toBeVisible();
    await expect(page.getByText(L('slot.free')).first()).toBeVisible();
    await page.waitForTimeout(400); // shortcut: lets the accordion open fully for the screenshot only
    await shot(page, '08-admin-schedule-new-campaign.png');
    // no slot of the new campaign at 20:00 (outside its show hours)
    await page.getByRole('button', { name: /^20:00–21:00/ }).click();
    const panel20 = page.getByRole('region', { name: /^20:00–21:00/ });
    await expect(panel20.getByRole('link', { name: CREATED })).toHaveCount(0);
  });

  test('step 9: report of a seeded campaign shows plan, log, completion % and the 2 blocks', async ({ asRole }) => {
    const page = await asRole('admin');
    await nav(page).getByRole('link', { name: L('routes.reports') }).click();
    await pick(page, L('reports.campaign'), 'Летняя акция');
    await ready(page);
    await expect(page.getByRole('heading', { level: 2, name: 'Летняя акция' })).toBeVisible();
    const placement = page.getByRole('region', { name: L('reports.placement') });
    const analytics = page.getByRole('region', { name: L('reports.screenAnalytics') });
    await expect(placement).toBeVisible();
    await expect(analytics).toBeVisible();
    const planned = await valueOf(page, L('reports.planned'));
    const log = await valueOf(page, L('reports.log'));
    expect(planned).toBeGreaterThan(0);
    expect(log).toBeGreaterThan(0);
    expect(log).toBeLessThanOrEqual(planned);
    const completion = page.getByRole('group', { name: L('reports.completion'), exact: true });
    const expected = (Math.round((log / planned) * 1000) / 10).toLocaleString('ru-RU', { minimumFractionDigits: 1 });
    await expect(completion).toContainText(`${expected} %`);
    // traffic and looks are in «Аналитика экранов», not in «Результаты размещения»
    await expect(analytics.getByText(L('reports.traffic'))).toBeVisible();
    await expect(placement.getByText(L('reports.traffic'))).toHaveCount(0);
    // F-9 AC6: the disclaimer verbatim; F-9 AC5: no «подтверждённая аудитория» label
    await expect(page.getByText(L('reports.disclaimer'), { exact: true })).toBeVisible();
    await expect(page.getByText('Демонстрационный отчёт. Показатели являются смоделированными и не подтверждают фактические показы или охват', { exact: true })).toBeVisible();
    await expect(page.getByText(/подтверждённ\S* аудитори/i)).toHaveCount(0);
    await expect(page.getByRole('region', { name: L('reports.byDay') }).or(page.getByText(L('reports.byDay'))).first()).toBeVisible();
    await expect(page.getByText(L('reports.byScreen')).first()).toBeVisible();
    await shot(page, '09-admin-report-seeded.png');
  });

  test('step 10: «Печать / сохранить в PDF» opens the print dialog with a clean report', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.evaluate(() => {
      (window as unknown as { __prints: number }).__prints = 0;
      window.print = () => {
        (window as unknown as { __prints: number }).__prints += 1;
      };
    });
    await nav(page).getByRole('link', { name: L('routes.reports') }).click();
    await pick(page, L('reports.campaign'), 'Летняя акция');
    await ready(page);
    await page.getByRole('button', { name: L('reports.print') }).click();
    expect(await page.evaluate(() => (window as unknown as { __prints: number }).__prints)).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(nav(page)).toBeHidden();
    await expect(page.getByRole('combobox', { name: L('reports.campaign'), exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: L('reports.print') })).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: L('routes.reports') })).toBeHidden();
    await expect(page.getByRole('region', { name: L('reports.placement') })).toBeVisible();
    await expect(page.getByText(L('reports.disclaimer'), { exact: true })).toBeVisible();
    await shot(page, '10-admin-report-print-media.png');
    await page.pdf({ path: `${SHOTS}/10-admin-report-print.pdf`, format: 'A4' });
  });

  test('step 11: «Смоделировать показы» on the new campaign, its report shows the log ≤ plan', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/campaigns');
    await ready(page);
    await page.getByRole('link', { name: CREATED }).click();
    await ready(page);
    await expect(page.getByRole('heading', { level: 1, name: CREATED })).toBeVisible();
    await page.getByRole('button', { name: L('simulate.button') }).click();
    await expect(page.getByRole('status')).toContainText('Показы смоделированы');
    await shot(page, '11-admin-simulated.png');
    await nav(page).getByRole('link', { name: L('routes.reports') }).click();
    await pick(page, L('reports.campaign'), CREATED);
    await ready(page);
    const planned = await valueOf(page, L('reports.planned'));
    const log = await valueOf(page, L('reports.log'));
    expect(log).toBeGreaterThan(0);
    expect(log).toBeLessThanOrEqual(planned);
    await shot(page, '11b-admin-report-new-campaign.png');
  });

  test('step 12: «Сбросить демо» with confirmation restores the seed, the new campaign is gone', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/campaigns');
    await ready(page);
    await expect(page.getByRole('link', { name: CREATED })).toBeVisible();
    // fork: «Отмена» keeps the data
    await page.getByRole('button', { name: L('demo.reset') }).click();
    const dialog = page.getByRole('dialog', { name: L('demo.resetTitle') });
    await expect(dialog).toContainText(L('demo.resetBody'));
    await shot(page, '12-admin-reset-confirm.png');
    await dialog.getByRole('button', { name: L('demo.cancel') }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('link', { name: CREATED })).toBeVisible();
    // confirm
    await page.getByRole('button', { name: L('demo.reset') }).click();
    await dialog.getByRole('button', { name: L('demo.reset') }).click();
    await expect(page.getByRole('heading', { level: 1, name: L('routes.home') })).toBeVisible();
    await nav(page).getByRole('link', { name: L('routes.campaigns') }).click();
    await ready(page);
    await expect(page.getByRole('link', { name: 'Летняя акция' })).toBeVisible();
    await expect(page.getByRole('link', { name: CREATED })).toHaveCount(0);
    await expect(page.getByRole('table').getByRole('row')).toHaveCount(11); // header + 10 seed campaigns
    await shot(page, '12b-admin-after-reset.png');
  });
});

test.describe('SoW §4 forks', { tag: '@acceptance' }, () => {
  test('F-1 AC3/AC4: no password → only the password screen; wrong password → error, app stays closed', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/billboards');
    await expect(page.getByLabel(L('login.password'))).toBeVisible();
    await expect(nav(page)).toHaveCount(0);
    await page.getByLabel(L('login.password')).fill('wrong-password-e2e');
    await page.getByRole('button', { name: L('login.submit') }).click();
    await expect(page.getByRole('alert')).toHaveText(L('errors.WRONG_PASSWORD'));
    await expect(nav(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: L('routes.home') })).toHaveCount(0);
    await shot(page, 'F1-wrong-password.png');
    await context.close();
  });

  test('F-1 AC2: «Демонстрационные данные» on every screen with simulated values', async ({ asRole }) => {
    const page = await asRole('admin');
    for (const [route, file] of [
      ['/', 'F1-label-home.png'],
      ['/billboards', 'F1-label-billboards.png'],
      ['/campaigns', 'F1-label-campaigns.png'],
      ['/analytics', 'F1-label-analytics.png'],
    ] as const) {
      await page.goto(route);
      await ready(page);
      await expect(demoLabel(page), route).toBeVisible();
      await shot(page, file);
    }
  });

  test('«нет камеры»: list, card, analytics and report of screens without a camera', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/billboards');
    await ready(page);
    await pick(page, L('billboards.filterCamera'), L('billboards.cameraNo'));
    await ready(page);
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(21); // header + 20 seed screens without a camera
    await expect(page.getByRole('table').getByText(L('billboards.noCamera'), { exact: true })).toHaveCount(20);
    await shot(page, 'NC-billboards-no-camera.png');
    await rows.nth(1).getByRole('link').click();
    await ready(page);
    const audience = page.getByRole('region', { name: L('billboards.audience') });
    await expect(audience.getByText(L('billboards.noCamera'))).toBeVisible();
    await shot(page, 'NC-card-no-camera.png');
    const code = (await page.getByRole('heading', { level: 1 }).innerText()).match(/[A-Z]{3}-\d{3}/)![0];
    await nav(page).getByRole('link', { name: L('routes.analytics') }).click();
    await pick(page, L('audience.filterBillboard'), new RegExp(`^${code}`));
    await ready(page);
    await expect(page.getByText(L('audience.noCamera'), { exact: true })).toBeVisible();
    await shot(page, 'NC-analytics-no-camera.png');
    // «Летняя акция» runs on AST-001..020 and KRG-001..010; AST-005 has no camera
    await nav(page).getByRole('link', { name: L('routes.reports') }).click();
    await pick(page, L('reports.campaign'), 'Летняя акция');
    await ready(page);
    await expect(page.getByText(/Экранов без камеры: \d+ \(нет камеры\)/)).toBeVisible();
  });

  test('F-10: «Смоделировать показы» on a «Запланирована» campaign shows a clear refusal', async ({ asRole }) => {
    const page = await asRole('admin');
    await page.goto('/campaigns');
    await ready(page);
    await page.getByRole('link', { name: 'Презентация автомобиля' }).click();
    await ready(page);
    await page.getByRole('button', { name: L('simulate.button') }).click();
    await expect(page.getByRole('alert')).toHaveText(L('errors.CAMPAIGN_NOT_STARTED'));
    await shot(page, 'F10-not-started.png');
  });
});
