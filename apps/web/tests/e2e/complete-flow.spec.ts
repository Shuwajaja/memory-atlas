import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { chooseCard, downloadBytes, importFixtures, reviewCard, sha256 } from './helpers';

const shots = resolve('/opt/cursor/artifacts/screenshots');

test('runs import, source, card, supersession, approval and export', async ({ page }) => {
  mkdirSync(shots, { recursive: true });
  page.on('dialog', (dialog) => {
    void dialog.accept();
  });
  await importFixtures(page, 'chatgpt/01-linear.json');
  await page.screenshot({ path: resolve(shots, '01-import.png'), fullPage: true });
  await page.goto('/#/source');
  await expect(page.getByText('Rolle: Nutzer')).toBeVisible();
  await page.screenshot({ path: resolve(shots, '02-quelle.png'), fullPage: true });
  await chooseCard(page, 'Für Projekt Orion nutzen wir Alpha.', 'Alpha');
  await chooseCard(page, 'Für Projekt Orion nutzen wir Alpha.', 'Beta', 'Ab jetzt nutzen wir Beta.');
  await page.goto('/#/knowledge');
  await reviewCard(page, 'Alpha');
  await page.screenshot({ path: resolve(shots, '03-wissenskarte.png'), fullPage: true });
  await reviewCard(page, 'Beta');
  await page.goto('/#/changes');
  await expect(page.getByText('Alpha: umstritten', { exact: true })).toBeVisible();
  await expect(page.getByText('Beta: umstritten', { exact: true })).toBeVisible();
  const solve = page.getByRole('button', { name: 'Konflikt lösen' });
  await solve.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Ersetzung bestätigen' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(solve).toBeFocused();
  await solve.click();
  await page.getByLabel('Neue Karte').selectOption({ label: 'Beta' });
  await page.getByLabel('Alte Karte').selectOption({ label: 'Alpha' });
  await page.screenshot({ path: resolve(shots, '04-alt-neu.png'), fullPage: true });
  await page.getByRole('button', { name: 'Ersetzung bestätigen' }).click();
  await expect(page.getByText('Beta: aktuell', { exact: true })).toBeVisible();
  await expect(page.getByText('Alpha: ersetzt', { exact: true })).toBeVisible();
  await page.goto('/#/memory');
  await page.getByLabel(/Beta —/).check();
  await page.getByRole('button', { name: 'Auswahl speichern' }).click();
  await expect(page.getByText('Auswahl gespeichert.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Vorschau erzeugen' }).click();
  const previewHash = (await page.getByTestId('json-sha').innerText()).replace('JSON-SHA256: ', '').trim();
  await expect(page.locator('pre').first()).toContainText('Nutzerentscheidung: Ab jetzt nutzen wir Beta.');
  await expect(page.locator('pre').first()).not.toContainText('Für Projekt Orion nutzen wir Alpha.');
  await page.screenshot({ path: resolve(shots, '05-freigabe.png'), fullPage: true });
  await page.getByRole('button', { name: 'Freigeben' }).click();
  await page.getByRole('button', { name: 'Export bereitstellen' }).click();
  await page.screenshot({ path: resolve(shots, '06-export.png'), fullPage: true });
  const json = await downloadBytes(page, 'JSON herunterladen');
  const manifest = await downloadBytes(page, 'Manifest herunterladen');
  expect(sha256(json)).toBe(previewHash);
  expect(json.toString('utf8')).toContain('Nutzerentscheidung: Ab jetzt nutzen wir Beta.');
  expect(json.toString('utf8')).not.toContain('Für Projekt Orion nutzen wir Alpha.');
  expect(manifest.toString('utf8')).not.toContain('Für Projekt Orion');
  expect(manifest.toString('utf8')).toContain(previewHash);
  const [project] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Projekt herunterladen' }).click(),
  ]);
  const projectPath = await project.path();
  if (!projectPath) throw new Error('Projektdatei fehlt');
  await page.reload();
  await page.goto('/#/overview');
  await expect(page.getByText('Arbeitsbereich', { exact: true })).toBeVisible();
  await expect(page.getByText('Gespräche: 0')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.getByLabel('Projekt öffnen').setInputFiles(projectPath);
  await page.getByRole('button', { name: 'Ersetzen' }).click();
  await page.goto('/#/review');
  await expect(page.getByRole('cell', { name: 'accept' }).first()).toBeVisible();
  await page.goto('/#/memory');
  await expect(page.getByText('Keine Vorschau.')).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
