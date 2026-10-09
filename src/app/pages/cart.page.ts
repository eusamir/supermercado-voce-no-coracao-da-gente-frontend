import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cart, CartItem } from '../core/models';
import { StoreService } from '../core/store.service';

@Component({ selector: 'app-cart-page', imports: [RouterLink], templateUrl: './cart.page.html', styleUrl: './cart.page.css' })
export class CartPage implements OnInit {
  readonly store = inject(StoreService);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly saving = signal<string | null>(null);
  ngOnInit(): void { this.refresh(); }
  refresh(): void {
    this.loading.set(true); this.error.set('');
    this.store.getCart().subscribe({ next: (cart) => { this.store.cart.set(cart); this.loading.set(false); }, error: () => { this.error.set('Não foi possível abrir seu carrinho. Tente novamente.'); this.loading.set(false); } });
  }
  update(item: CartItem, quantity: number): void {
    if (quantity < 0 || this.saving()) return;
    this.saving.set(item.productId);
    const request = quantity === 0 ? this.store.removeCartItem(item.productId) : this.store.updateCartItem(item.productId, quantity);
    request.subscribe({ next: (cart) => { this.store.cart.set(cart); this.saving.set(null); }, error: (err) => { this.saving.set(null); this.error.set(err.status === 409 ? 'A quantidade escolhida ultrapassa o estoque disponível.' : 'Não foi possível atualizar este item.'); } });
  }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
}
