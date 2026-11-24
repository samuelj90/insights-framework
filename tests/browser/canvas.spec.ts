import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import type { Locator, Page } from '@playwright/test';

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('Expected a visible element.');
  return bounds;
}

async function drag(page: Page, handle: Locator, dx: number, dy = 0) {
  await handle.scrollIntoViewIfNeeded();
  const { x, y, width, height } = await box(handle);
  await page.mouse.move(x + width / 2, y + height / 2);
  await page.mouse.down();
  await page.mouse.move(x + width / 2 + dx, y + height / 2 + dy, { steps: 6 });
  await page.mouse.up();
}

test('composer focuses, serves only matching fixtures, and opens an accessible inspector', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask a question' }).click();
  const question = page.getByRole('textbox', { name: 'Question' });
  await expect(question).toBeFocused();
  await question.fill('An unsupported question');
  await question.press('Control+Enter');
  await expect(page.getByText('No fixture matches', { exact: false })).toBeVisible();
  await expect(page.locator('[data-widget]')).toHaveCount(0);
  await page.getByRole('button', { name: /Revenue by region for Q2/ }).click();
  await expect(page.getByRole('img', { name: /Revenue by region, horizontal/ })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect Revenue by region' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tabpanel')).toContainText('Horizontal bars');
  await expect(page.getByRole('tab', { name: 'Reasoning' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Contract' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('"regions"');
  await page.keyboard.press('End');
  await expect(page.getByRole('tabpanel')).toContainText('FROM sample_bookings');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Inspector' })).toBeFocused();
  await expect(page.getByRole('tabpanel')).not.toBeVisible();
});

test('keyboard and pointer snap placements, reject collisions and bounds, and do not persist across reloads', async ({ page }) => {
  await page.goto('/');
  const widget = page.locator('[data-widget="regions"]');
  const resize = page.getByRole('button', { name: 'Resize Revenue by region' });
  const move = page.getByRole('button', { name: 'Move Revenue by region' });
  const kpi = await box(page.locator('[data-widget="revenue"]'));
  const oneColumn = (kpi.width + 16) / 3;
  const original = await box(widget);
  await resize.press('ArrowRight');
  await expect(page.getByText('That placement overlaps another block.')).toHaveCount(1);
  await move.press('ArrowLeft');
  await expect(page.getByText('That placement is outside the grid', { exact: false })).toHaveCount(1);
  await drag(page, resize, -oneColumn);
  expect((await box(widget)).width).toBeCloseTo(original.width - oneColumn, 0);
  await drag(page, move, oneColumn);
  expect((await box(widget)).x).toBeCloseTo(original.x + oneColumn, 0);
  await drag(page, move, oneColumn);
  expect((await box(widget)).x).toBeCloseTo(original.x + oneColumn, 0);
  await expect(page.getByText('That placement overlaps another block.')).toHaveCount(1);
  await page.getByRole('button', { name: 'Thread' }).click();
  await expect(move).toHaveCount(0);
  await page.getByRole('button', { name: 'Board' }).click();
  expect((await box(widget)).x).toBeCloseTo(original.x + oneColumn, 0);
  await page.reload();
  expect((await box(widget)).x).toBeCloseTo(original.x, 0);
  expect((await box(widget)).width).toBeCloseTo(original.width, 0);
});

test('vertical resize snaps into a vacant row and rejects a collision in the next row', async ({ page }) => {
  await page.goto('/');
  const widget = page.locator('[data-widget="regions"]');
  const resize = page.getByRole('button', { name: 'Resize Revenue by region' });
  await page.getByRole('button', { name: 'Move Revenue and load factor, last 90 days' }).press('ArrowDown');
  await drag(page, resize, 0, 68);
  await expect(widget).toHaveCSS('grid-row', '2 / span 2');
  await resize.press('ArrowDown');
  await expect(page.getByText('That placement overlaps another block.')).toHaveCount(1);
  await expect(widget).toHaveCSS('grid-row', '2 / span 2');
});

test('compact board stacks without overflowing and keeps desktop positions', async ({ page }) => {
  await page.goto('/');
  const widget = page.locator('[data-widget="regions"]');
  await page.getByRole('button', { name: 'Resize Revenue by region' }).press('ArrowLeft');
  const desktop = await box(widget);
  await page.setViewportSize({ width: 375, height: 812 });
  const [first, second] = await Promise.all([
    box(page.locator('[data-widget="revenue"]')), box(page.locator('[data-widget="load"]')),
  ]);
  expect(second.x).toBe(first.x);
  expect(second.y).toBeGreaterThan(first.y + first.height);
  expect(await page.locator('.scroll').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect((await box(widget)).width).toBeCloseTo(desktop.width, 0);
});

test('prototype comparison at the same desktop viewport', async ({ page, context }, testInfo) => {
  const path = process.env.INSIGHT_PROTOTYPE;
  test.skip(!path, 'Set INSIGHT_PROTOTYPE to the original HTML file.');
  if (!path) return;
  const prototype = await context.newPage();
  await Promise.all([page.goto('/'), prototype.goto(pathToFileURL(path).href)]);
  for (const mode of ['Board', 'Thread'] as const) {
    if (mode === 'Thread') {
      await Promise.all([page.getByRole('button', { name: mode }).click(), prototype.getByRole('button', { name: mode }).click()]);
    }
    await Promise.all([page.evaluate(() => document.fonts.ready), prototype.evaluate(() => document.fonts.ready)]);
    for (const [actual, reference] of [['.rail', '.rail'], ['.grid', '.grid'], ['.composer', '.composer']]) {
      if (!actual || !reference) throw new Error('Missing comparison selector.');
      const [a, b] = await Promise.all([box(page.locator(actual)), box(prototype.locator(reference))]);
      expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(8);
      expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(32);
      expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(12);
    }
    for (const [actual, reference] of [['[data-widget="revenue"]', '.blk.kpi'], ['[data-widget="regions"]', '.blk:has(#c-region)']]) {
      if (!actual || !reference) throw new Error('Missing card selector.');
      const [a, b] = await Promise.all([box(page.locator(actual)), box(prototype.locator(reference).first())]);
      expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(12);
      expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(35);
    }
    await Promise.all([
      page.screenshot({ path: testInfo.outputPath(`demo-${mode.toLowerCase()}.png`) }),
      prototype.screenshot({ path: testInfo.outputPath(`prototype-${mode.toLowerCase()}.png`) }),
    ]);
  }
});
