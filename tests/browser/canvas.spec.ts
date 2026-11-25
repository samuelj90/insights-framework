import { expect, test } from '@playwright/test';

test('overview presents the product story and preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Build the view/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Inspector' })).toHaveCount(0);
  await expect(page.locator('#overview-visual')).toHaveAttribute('role', 'img');
  const initialTime = await page.locator('#overview-visual text').last().textContent();
  await page.waitForTimeout(1800);
  expect(await page.locator('#overview-visual text').last().textContent()).not.toContain('+');
  expect(await page.locator('#overview-visual text').last().textContent()).not.toBe(initialTime);
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
  await expect(page.locator('.visual-card header > div > p')).toHaveCount(0);
});

test('live page demonstrates streaming updates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Streaming without chart churn' })).toBeVisible();
  await expect(page.locator('#live-status')).toContainText('Receiving');
  await expect(page.locator('#live-demo-visual')).toHaveAttribute('role', 'img');
  await page.waitForTimeout(1200);
  await expect(page.locator('#live-demo-visual')).toHaveAttribute('aria-label', 'Live payment stream');
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause stream' }).click();
  await expect(page.locator('#live-status')).toContainText('paused');
});

test('editor validates contracts and explains knowledge payloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toHaveCount(0);
  const input = page.getByLabel('Visualization contract JSON');
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(JSON.stringify({
    kind: 'line', title: 'Live payments', unit: 'payments',
    categories: ['Jan', 'Feb'], series: [{ name: 'Payments', values: [1, 2] }],
  }));
  await expect(page.locator('#contract-error')).toBeHidden();
  await expect(page.locator('#editor-visual')).toHaveAttribute('role', 'img');
  await expect(page.locator('#editor-visual svg:visible')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy snapshot' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export SVG' })).toBeVisible();
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type(JSON.stringify({ guidance: 'AI planning rules', kinds: { bar: {} } }));
  await expect(page.getByRole('alert')).toContainText('visualization planning guidance');
});

test('editor offers JSON completion for contract fields', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const input = page.getByLabel('Visualization contract JSON');
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('{"ki');
  await page.keyboard.press('Control+Space');
  await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('kind');
});

test('editor composes an array of contracts as a report', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByLabel('Layout example').selectOption('operations');
  await page.getByRole('button', { name: 'Load layout' }).click();
  await expect(page.locator('.report-preview .visual-card')).toHaveCount(5);
  const cards = await page.locator('.report-preview .visual-card').all();
  const boxes = await Promise.all(cards.map((card) => card.boundingBox()));
  expect(boxes.every((box) => box && box.width > 0 && box.height > 0)).toBe(true);
  const columns = new Set(boxes.map((box) => box?.x));
  expect(columns.size).toBeGreaterThan(1);
});

test('editor demonstrates single visual layout constraints', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByLabel('Layout example').selectOption('sized');
  await page.getByRole('button', { name: 'Load layout' }).click();
  await expect(page.getByLabel('Visualization contract JSON')).toContainText('"layout"');
  await expect(page.locator('#editor-visual')).toHaveCSS('min-height', '280px');
});

test('editor formats JSON in place', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const input = page.getByLabel('Visualization contract JSON');
  await input.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('{"kind":"kpi","title":"Payments","unit":"count","value":1}');
  await page.getByRole('button', { name: 'Format JSON' }).click();
  await expect(input).toContainText('  "kind"');
});

test('editor preview expands when the JSON panel is hidden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const before = await page.locator('.editor-pane').boundingBox();
  await page.getByRole('button', { name: 'Hide editor' }).click();
  await page.waitForTimeout(250);
  const after = await page.locator('.editor-pane').boundingBox();
  expect(after?.width ?? 0).toBeLessThan(before?.width ?? 0);
});

test('live demo exposes operational metrics and event samples', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect(page.locator('#live-throughput')).toBeVisible();
  await expect(page.locator('#live-events li').first()).toBeVisible({ timeout: 3000 });
});
