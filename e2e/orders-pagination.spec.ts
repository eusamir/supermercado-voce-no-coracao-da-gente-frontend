import { expect, test } from '@playwright/test';
import { fulfillApi, installAuthenticatedSession, pageOf } from './helpers';

const order = (index: number) => ({
  id: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
  status: 'PAID',
  total: 25 + index,
  createdAt: '2026-10-09T12:00:00Z',
  paymentStatus: 'APPROVED',
});

test('authenticated order history requests server pages and navigates between them', async ({ page }) => {
  await installAuthenticatedSession(page);
  const requestedPages: string[] = [];
  await page.route('**/api/users/me', (route) => route.request().method() === 'OPTIONS'
    ? fulfillApi(route, {}, 204)
    : fulfillApi(route, { id: 'user-e2e', name: 'Cliente de Teste', email: 'cliente@example.test', createdAt: '2026-01-01T00:00:00Z' }));
  await page.route('**/api/cart', (route) => fulfillApi(route, { id: null, items: [], itemCount: 0, total: 0 }));
  await page.route('**/api/orders**', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route, {}, 204);
    const url = new URL(route.request().url());
    const requestedPage = url.searchParams.get('page') || '0';
    requestedPages.push(requestedPage);
    const orders = requestedPage === '0'
      ? Array.from({ length: 10 }, (_, index) => order(index + 1))
      : [order(11)];
    await fulfillApi(route, pageOf(orders, Number(requestedPage), 10, 11));
  });

  await page.goto('/pedidos');
  await expect(page.getByRole('heading', { name: 'Meus pedidos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pedido #00000000' }).first()).toBeVisible();
  await expect(page.getByText('Mostrando 1–10 de 11 pedidos')).toBeVisible();
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(page.getByText('Mostrando 11–11 de 11 pedidos')).toBeVisible();
  expect(requestedPages).toEqual(['0', '1']);
});
