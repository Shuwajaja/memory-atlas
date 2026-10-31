import { expect, test } from '@playwright/test';
import { importFixtures } from './helpers';

test('labels the empty illustration and does not offer Claude as an approved import', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer')).toContainText('Beispieldaten · nicht der geladene Bestand');
  await expect(page.locator('footer')).not.toContainText('Read-only Demo-Daten');
  await expect(page.getByRole('link', { name: 'Wissensbibliothek0' })).toBeVisible();
  await expect(page.getByText('PRIVATE VORSCHAU · BEISPIELDATEN')).toBeVisible();
  await expect(page.locator('.graph-mini-legend')).toContainText('Beispieldaten');
  await expect(page.getByText('Das Claude-Profil ist nicht freigegeben.')).toBeVisible();
  await expect(page.getByText('Importiere ChatGPT- oder Claude-JSON.')).toHaveCount(0);
  await expect(page.getByText('Demo + geprüfte Kandidaten')).toHaveCount(0);
  await page.getByRole('button', { name: 'Hilfe' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Das Claude-Profil ist nicht freigegeben');
  await expect(dialog).not.toContainText('ChatGPT-/Claude-JSON');
});

test('keeps the synthetic label after an import into the demo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo laden' }).click();
  await expect(page.locator('footer')).toContainText('Demo · synthetisch · kein echter Chat');
  await expect(page.locator('.graph-mini-legend')).toContainText('Demo · synthetisch');
  await expect(page.locator('aside[aria-label="Quelleninspektor"] .ins-pairs')).toContainText('Demo · synthetisch');
  await expect(page.getByText('DEMO · SYNTHETISCH', { exact: true })).toBeVisible();
  await expect(page.getByText('Beispieldaten weichen, sobald Gespräche oder Wissenskarten vorliegen.')).toHaveCount(0);
  await importFixtures(page, 'chatgpt/01-linear.json');
  await page.goto('/#/overview');
  await expect(page.locator('footer')).toContainText('Demo · synthetisch · kein echter Chat');
  await expect(page.getByText('Eigener Bestand', { exact: true })).toHaveCount(0);
  await expect(page.getByText('DEMO · SYNTHETISCH', { exact: true })).toBeVisible();
});

test('labels a fresh import as the loaded inventory', async ({ page }) => {
  await importFixtures(page, 'chatgpt/01-linear.json');
  await page.goto('/#/overview');
  await expect(page.locator('footer')).toContainText('Eigener Bestand · lokaler JSON-Import');
  await expect(page.getByText('Demo · synthetisch')).toHaveCount(0);
  await expect(page.getByText('GELADENER BESTAND', { exact: true })).toBeVisible();
  await expect(page.locator('.graph-mini-legend')).toContainText('Geladener Bestand');
  await expect(page.locator('aside[aria-label="Quelleninspektor"] .ins-pairs')).toContainText('Eigener Bestand');
  await expect(page.getByText(/inkl\. \d+ angenommen/)).toBeVisible();
  await expect(page.getByText(/inkl\. \d+ freigegeben/)).toHaveCount(0);
});

test('marks an existing preview stale when the memory draft changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Demo laden' }).click();
  await page.goto('/#/memory');
  await expect(page.getByText('Auswahl gespeichert.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vorschau erzeugen' }).click();
  await expect(page.getByText('Vorschau', { exact: true })).toBeVisible();
  await page.getByLabel('Empfänger').fill('anderer-empfaenger');
  await expect(page.getByText('Auswahl nicht gespeichert.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vorschau erzeugen' })).toBeDisabled();
  await expect(page.getByText('Vorschau veraltet: Entwurf weicht vom gespeicherten Set ab.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Freigeben' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Freigabe widerrufen' })).toBeEnabled();
});
