import { expect, test } from '@playwright/test';
import { article, chooseCard, fixture, importFixtures, reviewCard } from './helpers';

test('shows role, date and branch, and acceptance does not raise evidence', async ({ page }) => {
  const leaks: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('example.invalid')) leaks.push(request.url());
  });
  await importFixtures(page, 'chatgpt/01-linear.json');
  await page.goto('/#/source');
  await expect(page.getByText('Rolle: Nutzer')).toBeVisible();
  await expect(page.getByText(/Gesendet: 2026-05-01/).first()).toBeVisible();
  await expect(page.getByText('Zweig: ausgewählt').first()).toBeVisible();
  await chooseCard(page, 'Für Projekt Orion nutzen wir Alpha.', 'Alpha');
  await page.goto('/#/knowledge');
  await expect(article(page, 'Alpha')).toContainText('Kandidat');
  await expect(article(page, 'Alpha')).toContainText('Beleg nicht geprüft');
  await reviewCard(page, 'Alpha');
  expect(leaks).toEqual([]);
});

test('renders hostile text without executing it', async ({ page }) => {
  const leaks: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('example.invalid')) leaks.push(request.url());
  });
  await importFixtures(page, 'chatgpt/07-hostile.json');
  await page.goto('/#/source');
  await expect(page.getByText(/<script>fetch/)).toBeVisible();
  await expect(page.locator('script', { hasText: 'example.invalid' })).toHaveCount(0);
  expect(leaks).toEqual([]);
});

test('keeps the unselected branch hidden until requested', async ({ page }) => {
  await importFixtures(page, 'chatgpt/02-branches.json');
  await page.goto('/#/source');
  await expect(page.getByText('Option B.', { exact: true })).toBeVisible();
  await expect(page.getByText('Zweig: ausgewählt').first()).toBeVisible();
  await expect(page.getByText('Option A.', { exact: true })).toHaveCount(0);
  await page.getByLabel('Alternative Zweige zeigen').check();
  await expect(page.getByText('Option A.', { exact: true })).toBeVisible();
  await expect(page.getByText('Zweig: alternativ')).toBeVisible();
});

test('refuses the Claude profile without approval and leaves the store empty', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('Exportdateien').setInputFiles(fixture('claude/01-content.json'));
  await expect(page.getByRole('alert')).toContainText('nicht freigegeben');
  await page.goto('/#/overview');
  await expect(page.getByText('Gespräche: 0')).toBeVisible();
});
