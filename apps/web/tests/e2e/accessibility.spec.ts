import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const widths = [
  [1440, 900],
  [1024, 768],
  [390, 844],
] as const;

test('has no critical or serious axe findings on the main screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo laden' }).click();
  for (const [width, height] of widths) {
    await page.setViewportSize({ width, height });
    for (const hash of ['#/overview', '#/import', '#/source', '#/knowledge', '#/memory', '#/graph']) {
      await page.goto(`/${hash}`);
      if (width <= 1024 && hash === '#/overview') {
        await page.getByRole('button', { name: 'Menü' }).click();
      }
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
      expect(serious, `${hash} @ ${width}x${height}: ${serious.map((item) => item.id).join(', ')}`).toEqual([]);
    }
  }
});
