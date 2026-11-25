import { expect, test } from '@playwright/test';

test('overview presents the product story and preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Build the view/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspector' })).toHaveCount(0);
  await expect(page.locator('#overview-visual')).toHaveAttribute('role', 'img');
  await expect(page.getByText('Processed volume')).toBeVisible();
  await expect(page.getByText('Payment methods')).toBeVisible();
  await expect(page.getByText('processor_a recovered')).toBeVisible();
  await expect(page.getByText('From snapshot to story')).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
});

test('gallery renders every Visual Stack kind', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  const main = await page.locator('.shell > main').boundingBox();
  expect(main?.x).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: 'Inspect' }).first().click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'One definition. Every visual.' })).toBeVisible();
  await expect(page.locator('.visual-card')).toHaveCount(14);
});

test('live page demonstrates streaming updates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Streaming without chart churn' })).toBeVisible();
  await expect(page.locator('#live-status')).toContainText('Receiving');
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause stream' }).click();
  await expect(page.locator('#live-status')).toContainText('paused');
});

test('editor validates contracts and explains knowledge payloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
  const input = page.getByLabel('Visualization contract JSON');
  await input.fill(JSON.stringify({
    kind: 'line', title: 'Live payments', unit: 'payments',
    categories: ['Jan', 'Feb'], series: [{ name: 'Payments', values: [1, 2] }],
  }));
  await expect(page.locator('#contract-error')).toBeHidden();
  await expect(page.locator('#editor-visual')).toHaveAttribute('role', 'img');
  await expect(page.locator('#editor-visual svg:visible')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy snapshot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export SVG' })).toBeVisible();
  await input.fill(JSON.stringify({ guidance: 'AI planning rules', kinds: { bar: {} } }));
  await expect(page.getByRole('alert')).toContainText('visualization planning guidance');
});

test('editor composes an array of contracts as a report', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Load report example' }).click();
  await expect(page.locator('.report-preview .visual-card')).toHaveCount(4);
  const cards = await page.locator('.report-preview .visual-card').all();
  const boxes = await Promise.all(cards.map((card) => card.boundingBox()));
  expect(boxes.every((box) => box && box.width > 0 && box.height > 0)).toBe(true);
  const columns = new Set(boxes.map((box) => box?.x));
  expect(columns.size).toBeGreaterThan(1);
});

test('live demo exposes operational metrics and event samples', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect(page.locator('#live-throughput')).toBeVisible();
  await expect(page.locator('#live-events li').first()).toBeVisible({ timeout: 3000 });
});
