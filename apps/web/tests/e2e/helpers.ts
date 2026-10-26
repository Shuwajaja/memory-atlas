import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Locator, type Page } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '../../../..');

export function fixture(name: string): string {
  return resolve(repoRoot, 'memory-atlas-specc/fixtures', name);
}

export async function importFixtures(page: Page, ...names: string[]): Promise<void> {
  await page.goto('/#/import');
  await page.getByLabel('Exportdateien').setInputFiles(names.map((name) => fixture(name)));
  await expect(page.getByRole('heading', { name: 'Prüfbericht' })).toBeVisible();
  await page.getByRole('button', { name: 'Import übernehmen' }).click();
  await expect(page.locator('#notice')).toContainText('Import übernommen');
}

export async function chooseCard(page: Page, text: string, value: string, statement?: string): Promise<void> {
  const part = page.getByText(text, { exact: true });
  await part.selectText();
  const card = part.locator('xpath=ancestor::article');
  await card.getByRole('button', { name: 'Auswahl als Wissenskarte' }).click();
  await expect(page.getByRole('dialog', { name: 'Wissenskarte' })).toBeVisible();
  await expect(page.getByTestId('span')).toContainText(text);
  if (statement) await page.getByLabel('Aussage').fill(statement);
  await page.getByLabel('Wert').fill(value);
  await page.getByRole('button', { name: 'Kandidat anlegen' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export async function reviewCard(page: Page, value: string): Promise<void> {
  await page.goto('/#/knowledge');
  const article = page.getByRole('article', { name: new RegExp(`^${value}:`) });
  await article.getByRole('button', { name: value, exact: true }).click();
  await page.getByRole('button', { name: 'Annehmen' }).click();
  await expect(article).toContainText('angenommen');
  await expect(article).toContainText('Beleg nicht geprüft');
  await expect(article).not.toContainText('Ausführung geprüft');
  await page.getByLabel('Rolle und Kontext geprüft').check();
  await page.getByLabel('Zweig geprüft').check();
  await page.getByRole('button', { name: 'Quelle bestätigen' }).click();
  await expect(article).toContainText('Quelle korreliert');
  await page.getByRole('button', { name: 'Datenschutz speichern' }).click();
  await expect(article).toContainText('Sensitivität: shareable');
}

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function downloadBytes(page: Page, name: string): Promise<Buffer> {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name }).click(),
  ]);
  const path = await download.path();
  if (!path) throw new Error(`Download ${name} hat keinen Pfad`);
  return readFileSync(path);
}

export function article(page: Page, value: string): Locator {
  return page.getByRole('article', { name: new RegExp(`^${value}:`) });
}
