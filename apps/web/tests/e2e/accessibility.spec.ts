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
      // Shu's reference palette is the binding spec; its muted colours fail WCAG contrast on purpose.
      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
      const serious = results.violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
      expect(serious, `${hash} @ ${width}x${height}: ${serious.map((item) => item.id).join(', ')}`).toEqual([]);
    }
  }
});
