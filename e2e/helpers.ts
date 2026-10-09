import { Page, Route } from '@playwright/test';

export async function fulfillApi(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    ...(status === 204 ? {} : { contentType: 'application/json', body: JSON.stringify(body) }),
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
  });
}

export async function installAuthenticatedSession(page: Page): Promise<void> {
  const now = Date.now();
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const idToken = `${encode({ alg: 'none' })}.${encode({ name: 'Cliente de Teste' })}.signature`;
  await page.addInitScript((session) => {
    sessionStorage.setItem('mercadinho.oidc.session', JSON.stringify(session));
  }, {
    access_token: 'e2e-access-token',
    id_token: idToken,
    refresh_token: 'e2e-refresh-token',
    expires_in: 3600,
    refresh_expires_in: 7200,
    token_type: 'Bearer',
    savedAt: now,
  });
}

export function pageOf<T>(content: T[], number: number, size: number, totalElements: number) {
  const totalPages = Math.ceil(totalElements / size);
  return { content, number, size, totalElements, totalPages, first: number === 0, last: number >= totalPages - 1 };
}

export function product(index: number) {
  return {
    id: `product-${index}`,
    name: `Produto ${index}`,
    description: `Descrição dinâmica do produto ${index}`,
    price: 3.5 + index,
    stock: 20,
    active: true,
    category: { id: 'category-1', name: 'Mercearia' },
  };
}

export function cart(items: Array<{ productId: string; name: string; unitPrice: number; quantity: number; subtotal: number; stock: number; available: boolean }>) {
  return {
    id: items.length ? 'cart-e2e' : null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}
