import { expect, test } from '@playwright/test';

test('shows stored relations in the graph and the list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo laden' }).click();
  await page.goto('/#/graph');
  await expect(page.getByTestId('graph-count')).toContainText('Die Ansicht ist vollständig.');
  await expect(page.getByText('similar')).toHaveCount(0);
  await page.getByRole('button', { name: 'Liste' }).click();
  await expect(page.getByRole('heading', { name: 'Kanten' })).toBeVisible();
  await expect(page.getByText(/supersedes:/)).toBeVisible();
  const claimButton = page.getByRole('button', { name: /claim:/ }).first();
  const label = await claimButton.innerText();
  await claimButton.click();
  const claimText = label.replace(/^claim:\s*/, '');
  await expect(page.locator('aside')).toContainText(claimText);
});

test('disables motion when the user prefers reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo laden' }).click();
  await page.goto('/#/graph');
  await expect(page.locator('.graph-canvas')).toHaveAttribute('data-reduced-motion', 'true');
  const animation = await page.locator('.react-flow__edge').first().evaluate((element) => getComputedStyle(element).animationName);
  expect(animation === 'none' || animation === '').toBe(true);
});
