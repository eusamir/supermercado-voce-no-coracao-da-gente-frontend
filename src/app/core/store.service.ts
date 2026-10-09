import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { defer, Observable, tap } from 'rxjs';
import { API_URL } from './config';
import { ApiPage, Cart, emptyCart, Order, OrderSummary, Product, UserProfile } from './models';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly http = inject(HttpClient);
  readonly cart = signal<Cart>(emptyCart());
  readonly cartBusy = signal(false);
  readonly categories = signal<{ id: string; name: string }[]>([]);
  private cartRevision = 0;

  products(search = '', categoryId = ''): Observable<ApiPage<Product>> {
    let params = new HttpParams().set('page', '0').set('size', '100').set('sort', 'name,asc');
    if (search.trim()) params = params.set('search', search.trim());
    if (categoryId) params = params.set('categoryId', categoryId);
    return this.http.get<ApiPage<Product>>(`${API_URL}/api/products`, { params });
  }
  product(id: string): Observable<Product> { return this.http.get<Product>(`${API_URL}/api/products/${id}`); }
  register(payload: { name: string; email: string; password: string }): Observable<UserProfile> {
    return this.http.post<UserProfile>(`${API_URL}/api/users`, payload);
  }
  profile(): Observable<UserProfile> { return this.http.get<UserProfile>(`${API_URL}/api/users/me`); }
  /** Fetches the server cart and ignores responses made stale by a later cart mutation. */
  getCart(): Observable<Cart> {
    return defer(() => {
      const revision = this.cartRevision;
      return this.http.get<Cart>(`${API_URL}/api/cart`).pipe(tap((cart) => {
        if (revision === this.cartRevision) this.setCart(cart);
      }));
    });
  }
  setCart(cart: Cart): void {
    this.cartRevision++;
    this.cart.set(cart);
  }
  loadCart(): void {
    this.cartBusy.set(true);
    this.getCart().subscribe({
      next: () => this.cartBusy.set(false),
      error: () => this.cartBusy.set(false),
    });
  }
  addToCart(productId: string, quantity = 1): Observable<Cart> {
    return this.http.post<Cart>(`${API_URL}/api/cart/items`, { productId, quantity }).pipe(tap((cart) => this.setCart(cart)));
  }
  updateCartItem(productId: string, quantity: number): Observable<Cart> {
    return this.http.put<Cart>(`${API_URL}/api/cart/items/${productId}`, { quantity }).pipe(tap((cart) => this.setCart(cart)));
  }
  removeCartItem(productId: string): Observable<Cart> {
    return this.http.delete<Cart>(`${API_URL}/api/cart/items/${productId}`).pipe(tap((cart) => this.setCart(cart)));
  }
  checkout(): Observable<Order> { return this.http.post<Order>(`${API_URL}/api/orders/checkout`, null); }
  orders(): Observable<ApiPage<OrderSummary>> {
    const params = new HttpParams().set('page', '0').set('size', '50');
    return this.http.get<ApiPage<OrderSummary>>(`${API_URL}/api/orders`, { params });
  }
  order(id: string): Observable<Order> { return this.http.get<Order>(`${API_URL}/api/orders/${id}`); }
}
