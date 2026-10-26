import { expect, test } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { repoRoot } from './helpers';

test('offline file opens with no console errors and no outgoing requests', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    const url = request.url();
    if (url.startsWith('file:') || url.startsWith('blob:') || url.startsWith('data:')) return;
    requests.push(url);
  });
  const html = pathToFileURL(resolve(repoRoot, 'apps/web/dist-offline/index.html')).href;
  await page.goto(html);
  await expect(page.getByRole('heading', { name: 'Guten Überblick.' })).toBeVisible();
  await page.getByRole('button', { name: 'Demo laden' }).click();
  await expect(page.getByText('Demo · synthetisch').first()).toBeVisible();
  await page.getByRole('link', { name: 'Freigabe' }).click();
  await expect(page.getByRole('heading', { name: 'Freigabe' })).toBeVisible();
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});
