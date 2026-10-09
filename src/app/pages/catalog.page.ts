import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreService } from '../core/store.service';
import { AuthService } from '../core/auth.service';
import { Product } from '../core/models';

@Component({
  selector: 'app-catalog-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
})
export class CatalogPage implements OnInit {
  readonly store = inject(StoreService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly products = signal<Product[]>([]);
  readonly categories = signal<{ id: string; name: string }[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly adding = signal<string | null>(null);
  readonly notice = signal('');
  search = '';
  categoryId = '';
  private loadRequest = 0;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.has('ofertas')) this.search = '';
      this.categoryId = params.get('categoryId') || '';
      this.load();
    });
  }

  load(): void {
    const requestId = ++this.loadRequest;
    this.loading.set(true);
    this.error.set('');
    this.store.products(this.search, this.categoryId).subscribe({
      next: (page) => {
        if (requestId !== this.loadRequest) return;
        this.products.set(page.content || []);
        const categories = new Map<string, string>();
        for (const product of page.content || []) categories.set(product.category.id, product.category.name);
        if (!this.categoryId && !this.search.trim()) {
          const available = [...categories].map(([id, name]) => ({ id, name }));
          this.categories.set(available);
          this.store.categories.set(available);
        }
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.loadRequest) return;
        this.error.set('Não conseguimos carregar os produtos agora. Confira sua conexão e tente novamente.');
        this.loading.set(false);
      },
    });
  }

  selectCategory(id: string): void {
    this.categoryId = id;
    this.router.navigate([], { relativeTo: this.route, queryParams: { categoryId: id || null, ofertas: null }, queryParamsHandling: 'merge' });
  }

  add(product: Product): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/' } });
      this.notice.set('Entre na sua conta para adicionar produtos ao carrinho.');
      return;
    }
    this.adding.set(product.id);
    this.store.addToCart(product.id).subscribe({
      next: (cart) => { this.store.cart.set(cart); this.adding.set(null); this.notice.set(`${product.name} foi adicionado ao carrinho.`); },
      error: (err) => { this.adding.set(null); this.notice.set(err.status === 409 ? 'Não há estoque suficiente para essa quantidade.' : 'Não foi possível adicionar este produto. Tente novamente.'); },
    });
  }

  image(category: string): string {
    const value = category.toLocaleLowerCase('pt-BR');
    if (value.includes('hort')) return '/images/hortifruti.svg';
    if (value.includes('pad')) return '/images/padaria.svg';
    if (value.includes('açou') || value.includes('acou')) return '/images/acougue.svg';
    if (value.includes('limp')) return '/images/limpeza.svg';
    return '/images/mercearia.svg';
  }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
}
