import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiPage, OrderSummary } from '../core/models';
import { StoreService } from '../core/store.service';

@Component({ selector: 'app-orders-page', imports: [RouterLink], templateUrl: './orders.page.html', styleUrl: './orders.page.css' })
export class OrdersPage implements OnInit {
  private readonly store = inject(StoreService);
  readonly orders = signal<OrderSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly page = signal(0);
  readonly totalPages = signal(0);
  readonly totalElements = signal(0);
  private loadRequest = 0;
  ngOnInit(): void { this.load(); }
  load(pageIndex = this.page()): void {
    const requestId = ++this.loadRequest;
    this.page.set(pageIndex);
    this.loading.set(true);
    this.error.set('');
    this.store.orders(pageIndex).subscribe({
      next: (result: ApiPage<OrderSummary>) => {
        if (requestId !== this.loadRequest) return;
        this.orders.set(result.content || []);
        this.page.set(result.number ?? pageIndex);
        this.totalPages.set(result.totalPages ?? 0);
        this.totalElements.set(result.totalElements ?? result.content?.length ?? 0);
        this.loading.set(false);
      },
      error: () => {
        if (requestId !== this.loadRequest) return;
        this.error.set('Não foi possível carregar seus pedidos. Tente novamente.'); this.loading.set(false);
      },
    });
  }
  goToPage(pageIndex: number): void {
    if (pageIndex < 0 || pageIndex >= this.totalPages() || pageIndex === this.page()) return;
    this.load(pageIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  pageEnd(): number { return Math.min((this.page() + 1) * 10, this.totalElements()); }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  status(status: string): string { return ({ PAYMENT_PENDING: 'Pagamento em análise', PAID: 'Pagamento aprovado', PAYMENT_DECLINED: 'Pagamento recusado', CANCELLED: 'Pedido cancelado', CREATED: 'Pedido criado' } as Record<string,string>)[status] || status; }
  statusClass(status: string): string { return status.toLowerCase().replaceAll('_','-'); }
  date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
}
