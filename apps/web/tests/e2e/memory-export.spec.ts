import { expect, test } from '@playwright/test';
import { downloadBytes, sha256 } from './helpers';

test('downloads the approved demo bytes and omits the sample secret', async ({ page }) => {
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo laden' }).click();
  await page.goto('/#/memory');
  await expect(page.locator('li', { hasText: 'SAMPLE-NOT-A-REAL-SECRET' })).toContainText('SENSITIVE_CONTENT');
  await page.getByRole('button', { name: 'Vorschau erzeugen' }).click();
  const previewHash = (await page.getByTestId('json-sha').innerText()).replace('JSON-SHA256: ', '').trim();
  await expect(page.getByText('Nutzerentscheidung:')).toBeVisible();
  await expect(page.locator('pre').first()).not.toContainText('SAMPLE-NOT-A-REAL-SECRET');
  await page.getByRole('button', { name: 'Freigeben' }).click();
  await page.getByRole('button', { name: 'Export bereitstellen' }).click();
  const json = await downloadBytes(page, 'JSON herunterladen');
  const markdown = await downloadBytes(page, 'Markdown herunterladen');
  const manifest = await downloadBytes(page, 'Manifest herunterladen');
  expect(sha256(json)).toBe(previewHash);
  expect(json.toString('utf8')).toContain('Nutzerentscheidung:');
  expect(json.toString('utf8')).not.toContain('SAMPLE-NOT-A-REAL-SECRET');
  expect(markdown.toString('utf8')).toContain('Nutzerentscheidung:');
  expect(manifest.toString('utf8')).not.toContain('SAMPLE-NOT-A-REAL-SECRET');
  expect(manifest.toString('utf8')).not.toContain('Für Projekt Orion');
  expect(manifest.toString('utf8')).toContain(previewHash);
  await page.reload();
  await page.goto('/#/overview');
  await expect(page.getByText('Arbeitsbereich')).toBeVisible();
  await expect(page.getByText('Gespräche: 0')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
