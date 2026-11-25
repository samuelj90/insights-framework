import { expect, test } from '@playwright/test';

test('overview presents the product story and preview', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Build the view/ })).toBeVisible();
  await expect(page.locator('#overview-visual')).toHaveAttribute('role', 'img');
  await expect(page.getByText('From snapshot to story')).toBeVisible();
});

test('gallery renders every Visual Stack kind', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'One definition. Every visual.' })).toBeVisible();
  await expect(page.locator('.visual-card')).toHaveCount(14);
});

test('live page demonstrates streaming updates', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Streaming without chart churn' })).toBeVisible();
  await expect(page.locator('#live-status')).toContainText('Receiving');
  await page.getByRole('button', { name: 'Pause stream' }).click();
  await expect(page.locator('#live-status')).toContainText('paused');
});

test('editor validates contracts and explains knowledge payloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const input = page.getByLabel('Visualization contract JSON');
  await input.fill(JSON.stringify({
    kind: 'line', title: 'Live payments', unit: 'payments',
    categories: ['Jan', 'Feb'], series: [{ name: 'Payments', values: [1, 2] }],
  }));
  await expect(page.locator('#contract-error')).toBeHidden();
  await expect(page.locator('#editor-visual')).toHaveAttribute('role', 'img');
  await expect(page.locator('#editor-visual svg:visible')).toBeVisible();
  await input.fill(JSON.stringify({ guidance: 'AI planning rules', kinds: { bar: {} } }));
  await expect(page.getByRole('alert')).toContainText('visualization planning guidance');
});

test('editor composes an array of contracts as a report', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Load report example' }).click();
  await expect(page.locator('.report-preview .visual-card')).toHaveCount(4);
});

test('streaming updates a live visual without replacing its container', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const input = page.getByLabel('Visualization contract JSON');
  await input.fill(JSON.stringify({ kind: 'kpi', title: 'Streamed payments', unit: 'payments', value: 1 }));
  const container = page.locator('#editor-visual');
  await expect(container).toContainText('1');
  await page.getByRole('button', { name: 'Start streaming' }).click();
  await expect(container).not.toContainText(/^1$/);
  await page.getByRole('button', { name: 'Stop streaming' }).click();
});
