import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Cart } from '../core/models';
import { StoreService } from '../core/store.service';

@Component({ selector: 'app-checkout-page', imports: [RouterLink], templateUrl: './checkout.page.html', styleUrl: './cart.page.css' })
export class CheckoutPage implements OnInit {
  readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly cart = signal<Cart | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  hasUnavailable(): boolean { return !!this.cart()?.items.some((item) => !item.available); }
  ngOnInit(): void {
    this.store.getCart().subscribe({ next: (cart) => { this.cart.set(cart); this.store.cart.set(cart); this.loading.set(false); }, error: () => { this.error.set('Não foi possível carregar seu carrinho.'); this.loading.set(false); } });
  }
  confirm(): void {
    if (this.busy() || !this.cart()?.items.length || this.hasUnavailable()) return;
    this.busy.set(true); this.error.set('');
    this.store.checkout().subscribe({
      next: (order) => { this.store.cart.set({ id: null, items: [], itemCount: 0, total: 0 }); void this.router.navigate(['/pedidos', order.id]); },
      error: (err) => { this.busy.set(false); this.error.set(err.status === 409 ? 'O estoque mudou enquanto você comprava. Revise seu carrinho e tente novamente.' : err.status === 400 ? 'O carrinho está vazio ou tem produtos indisponíveis.' : 'Não foi possível criar seu pedido. Seu carrinho continua salvo. Tente novamente.'); },
    });
  }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
}
