import { expect, test } from '@playwright/test';
import { fulfillApi, pageOf, product } from './helpers';

test('catalog pagination requests the next server page and displays its products', async ({ page }) => {
  const requestedPages: string[] = [];
  await page.route('**/api/products**', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route, {}, 204);
    const url = new URL(route.request().url());
    const requestedPage = url.searchParams.get('page') || '0';
    requestedPages.push(requestedPage);
    const products = requestedPage === '0'
      ? Array.from({ length: 12 }, (_, index) => product(index + 1))
      : [product(13)];
    await fulfillApi(route, pageOf(products, Number(requestedPage), 12, 13));
  });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Produto 1' })).toBeVisible();
  await expect(page.getByText('Mostrando 1–12 de 13 produtos')).toBeVisible();
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(page.getByRole('link', { name: 'Produto 13' })).toBeVisible();
  await expect(page.getByText('Mostrando 13–13 de 13 produtos')).toBeVisible();
  expect(requestedPages).toEqual(['0', '1']);
});
