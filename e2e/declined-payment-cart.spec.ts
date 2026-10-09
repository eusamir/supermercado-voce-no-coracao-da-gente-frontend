import { expect, test } from '@playwright/test';
import { cart, fulfillApi, installAuthenticatedSession, pageOf, product } from './helpers';

test('declined payment restores server cart items and the header count', async ({ page }) => {
  await installAuthenticatedSession(page);
  let serverCart = cart([]);
  let paymentDeclined = false;
  let cartReadsAfterDecline = 0;
  let orderReads = 0;
  const cartItem = { productId: 'product-1', name: 'Produto 1', unitPrice: 4.5, quantity: 1, subtotal: 4.5, stock: 20, available: true };
  const orderId = '00000000-0000-0000-0000-000000000111';

  await page.route('**/api/users/me', (route) => route.request().method() === 'OPTIONS'
    ? fulfillApi(route, {}, 204)
    : fulfillApi(route, { id: 'user-e2e', name: 'Cliente de Teste', email: 'cliente@example.test', createdAt: '2026-01-01T00:00:00Z' }));
  await page.route('**/api/products**', (route) => route.request().method() === 'OPTIONS'
    ? fulfillApi(route, {}, 204)
    : fulfillApi(route, pageOf([product(1)], 0, 12, 1)));
  await page.route('**/api/cart', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route, {}, 204);
    if (paymentDeclined && cartReadsAfterDecline++ < 2) return fulfillApi(route, cart([]));
    await fulfillApi(route, serverCart);
  });
  await page.route('**/api/cart/items**', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route, {}, 204);
    serverCart = cart([cartItem]);
    await fulfillApi(route, serverCart);
  });
  await page.route('**/api/orders/checkout', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route, {}, 204);
    serverCart = cart([]);
    await fulfillApi(route, {
      id: orderId, status: 'PAYMENT_PENDING', total: 4.5, createdAt: '2026-10-09T12:00:00Z',
      items: [{ productId: cartItem.productId, name: cartItem.name, unitPrice: cartItem.unitPrice, quantity: cartItem.quantity, subtotal: cartItem.subtotal }],
      payment: { status: 'PENDING', amount: 4.5, failureReason: null },
    }, 201);
  });
  await page.route('**/api/orders/*', async (route) => {
    if (route.request().method() === 'OPTIONS') return fulfillApi(route, {}, 204);
    orderReads++;
    if (orderReads > 1) {
      paymentDeclined = true;
      serverCart = cart([cartItem]);
    }
    await fulfillApi(route, {
      id: orderId, status: paymentDeclined ? 'PAYMENT_DECLINED' : 'PAYMENT_PENDING', total: 4.5, createdAt: '2026-10-09T12:00:00Z',
      items: [{ productId: cartItem.productId, name: cartItem.name, unitPrice: cartItem.unitPrice, quantity: cartItem.quantity, subtotal: cartItem.subtotal }],
      payment: { status: paymentDeclined ? 'DECLINED' : 'PENDING', amount: 4.5, failureReason: paymentDeclined ? 'Pagamento simulado recusado' : null },
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Adicionar Produto 1' }).click();
  await expect(page.getByRole('link', { name: 'Abrir carrinho, 1 itens' })).toBeVisible();
  await page.getByRole('link', { name: 'Abrir carrinho, 1 itens' }).click();
  await page.getByRole('link', { name: /Ir para checkout/ }).click();
  await page.getByRole('button', { name: /Confirmar compra/ }).click();

  await expect(page.getByRole('heading', { name: 'Pagamento não aprovado' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('link', { name: 'Abrir carrinho, 1 itens' })).toBeVisible({ timeout: 10_000 });
  await page.getByRole('link', { name: 'Abrir carrinho, 1 itens' }).click();
  await expect(page.getByRole('heading', { name: 'Meu carrinho (1 itens)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Produto 1' })).toBeVisible();
  expect(cartReadsAfterDecline).toBeGreaterThanOrEqual(3);
});
