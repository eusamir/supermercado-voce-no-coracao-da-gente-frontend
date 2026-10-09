import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from './config';
import { Cart, Product } from './models';
import { StoreService } from './store.service';

const cart = (quantity: number): Cart => ({
  id: 'cart-1',
  items: [{ productId: 'product-1', name: 'Maçã', unitPrice: 2, quantity, subtotal: quantity * 2, stock: 20, available: true }],
  itemCount: quantity,
  total: quantity * 2,
});

describe('StoreService API integration', () => {
  let service: StoreService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StoreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests catalog pages with the backend filter and sort contract', () => {
    let response: Product[] = [];
    service.products(' maçã ', 'category-1', 2, 12).subscribe((page) => response = page.content);

    const request = http.expectOne((req) => req.url === `${API_URL}/api/products`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('12');
    expect(request.request.params.get('search')).toBe('maçã');
    expect(request.request.params.get('categoryId')).toBe('category-1');
    expect(request.request.params.get('sort')).toBe('name,asc');
    request.flush({ content: [], number: 2, size: 12, totalElements: 30, totalPages: 3, first: false, last: true });
    expect(response).toEqual([]);
  });

  it('requests order history pages without sort, as required by the backend', () => {
    service.orders(1, 10).subscribe();
    const request = http.expectOne((req) => req.url === `${API_URL}/api/orders`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.has('sort')).toBe(false);
    request.flush({ content: [], number: 1, size: 10, totalElements: 11, totalPages: 2, first: false, last: true });
  });

  it('uses the backend registration, profile, product detail, checkout and order detail contracts', () => {
    const profile = { id: 'user-1', name: 'Ana Silva', email: 'ana@example.test', createdAt: '2026-01-01T00:00:00Z' };
    service.register({ name: profile.name, email: profile.email, password: 'Senha1234' }).subscribe();
    const register = http.expectOne(`${API_URL}/api/users`);
    expect(register.request.method).toBe('POST');
    expect(register.request.body).toEqual({ name: profile.name, email: profile.email, password: 'Senha1234' });
    register.flush(profile, { status: 201, statusText: 'Created' });

    service.profile().subscribe();
    const profileRequest = http.expectOne(`${API_URL}/api/users/me`);
    expect(profileRequest.request.method).toBe('GET');
    profileRequest.flush(profile);

    service.product('product-1').subscribe();
    const productRequest = http.expectOne(`${API_URL}/api/products/product-1`);
    expect(productRequest.request.method).toBe('GET');
    productRequest.flush({
      id: 'product-1', name: 'Maçã', description: 'Maçã fresca', price: 2, stock: 20,
      active: true, category: { id: 'category-1', name: 'Hortifruti' },
    });

    service.checkout().subscribe();
    const checkout = http.expectOne(`${API_URL}/api/orders/checkout`);
    expect(checkout.request.method).toBe('POST');
    expect(checkout.request.body).toBeNull();
    checkout.flush({
      id: 'order-1', status: 'PAYMENT_PENDING', total: 2, createdAt: '2026-01-01T00:00:00Z',
      items: [], payment: { status: 'PENDING', amount: 2, failureReason: null },
    }, { status: 201, statusText: 'Created' });

    service.order('order-1').subscribe();
    const order = http.expectOne(`${API_URL}/api/orders/order-1`);
    expect(order.request.method).toBe('GET');
    order.flush({
      id: 'order-1', status: 'PAYMENT_PENDING', total: 2, createdAt: '2026-01-01T00:00:00Z',
      items: [], payment: { status: 'PENDING', amount: 2, failureReason: null },
    });
  });

  it('updates shared cart state from real add, quantity update and removal responses', () => {
    service.addToCart('product-1').subscribe();
    const add = http.expectOne(`${API_URL}/api/cart/items`);
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual({ productId: 'product-1', quantity: 1 });
    add.flush(cart(1));
    expect(service.cart()).toEqual(cart(1));

    service.updateCartItem('product-1', 3).subscribe();
    const update = http.expectOne(`${API_URL}/api/cart/items/product-1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ quantity: 3 });
    update.flush(cart(3));
    expect(service.cart()).toEqual(cart(3));

    service.removeCartItem('product-1').subscribe();
    const remove = http.expectOne(`${API_URL}/api/cart/items/product-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ id: 'cart-1', items: [], itemCount: 0, total: 0 });
    expect(service.cart().itemCount).toBe(0);
  });

  it('does not allow an older cart read to overwrite a newer mutation response', () => {
    service.getCart().subscribe();
    const oldRead = http.expectOne(`${API_URL}/api/cart`);

    service.addToCart('product-1').subscribe();
    const add = http.expectOne(`${API_URL}/api/cart/items`);
    add.flush(cart(2));
    oldRead.flush(cart(0));

    expect(service.cart()).toEqual(cart(2));
  });
});
