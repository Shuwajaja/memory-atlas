import { expect, test } from '@playwright/test';
import { importFixtures } from './helpers';

test('filters six calendar months and keeps unknown times separate', async ({ page }) => {
  // The preset is the Berlin calendar day of "now". Acceptance pins that day to 26.10.2026.
  await page.clock.install({ time: '2026-10-26T12:00:00Z' });
  await importFixtures(page, 'chatgpt/01-linear.json', 'chatgpt/03-missing-time.json');
  await page.goto('/#/source');
  const windowText = await page.getByTestId('date-window').innerText();
  expect(windowText).toContain('2026-04-25T22:00:00.000Z');
  expect(windowText).toContain('2026-10-26T23:00:00.000Z');
  expect(windowText).toContain('Europe/Berlin');
  await page.getByRole('button', { name: /missing-001/ }).click();
  await page.getByLabel('Nur Nachrichten der letzten sechs Kalendermonate').check();
  await expect(page.getByTestId('unknown-time')).toContainText('Datum ist unbekannt.');
  await page.getByRole('button', { name: /linear-001/ }).click();
  await expect(page.getByTestId('in-window')).toContainText('Für Projekt Orion nutzen wir Alpha.');
  await expect(page.getByText('Kontext, älter als der Zeitraum')).toHaveCount(0);
});

test('reaches navigation, source and the clear dialog from the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Zum Inhalt' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.goto('/#/settings');
  const clear = page.locator('#clear-session');
  await clear.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Sitzung leeren' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Wirklich leeren' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Abbrechen' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Wirklich leeren' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(clear).toBeFocused();
});

test('keeps import reachable at 1024 and stacks at 390', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Import & Export' }).click();
  await expect(page.getByRole('heading', { name: 'Import' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Import' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('link', { name: 'Quelle', exact: true })).toBeVisible();
});

test('imports a zip only as an unpack instruction', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('Exportdateien').setInputFiles({ name: 'export.zip', mimeType: 'application/zip', buffer: Buffer.from('PK') });
  await expect(page.getByRole('alert')).toContainText('Entpacke den Export auf deinem Gerät');
});
