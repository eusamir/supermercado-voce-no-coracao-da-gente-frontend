import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Product } from '../core/models';
import { StoreService } from '../core/store.service';
import { NotificationService } from '../core/notification.service';

@Component({ selector: 'app-product-page', imports: [RouterLink], templateUrl: './product.page.html', styleUrl: './product.page.css' })
export class ProductPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(StoreService);
  private readonly notification = inject(NotificationService);
  readonly auth = inject(AuthService);
  readonly product = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly quantity = signal(1);
  readonly busy = signal(false);
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Produto não encontrado.'); this.loading.set(false); return; }
    this.store.product(id).subscribe({ next: (p) => { this.product.set(p); this.loading.set(false); }, error: () => { this.error.set('Este produto não está disponível no catálogo.'); this.loading.set(false); } });
  }
  change(delta: number): void { this.quantity.update((value) => Math.max(1, Math.min(this.product()?.stock || 1, value + delta))); }
  add(): void {
    const product = this.product(); if (!product) return;
    if (!this.auth.isAuthenticated()) { this.notification.warning('Entre na sua conta', 'Faça login para adicionar produtos ao carrinho.'); void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } }); return; }
    this.busy.set(true);
    this.store.addToCart(product.id, this.quantity()).subscribe({ next: () => { this.busy.set(false); this.notification.success('Adicionado ao carrinho', `${this.quantity()} ${this.quantity() === 1 ? 'unidade' : 'unidades'} de ${product.name}`); }, error: () => { this.busy.set(false); this.notification.error('Não foi possível adicionar', 'Confira o estoque e tente novamente.'); } });
  }
  image(category = ''): string { const c = category.toLowerCase(); return c.includes('hort') ? '/images/hortifruti.svg' : c.includes('pad') ? '/images/padaria.svg' : c.includes('açou') || c.includes('acou') ? '/images/acougue.svg' : c.includes('limp') ? '/images/limpeza.svg' : '/images/mercearia.svg'; }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
}
