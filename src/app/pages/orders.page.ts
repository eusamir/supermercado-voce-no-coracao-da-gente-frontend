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
  ngOnInit(): void { this.load(); }
  load(): void { this.loading.set(true); this.error.set(''); this.store.orders().subscribe({ next: (page: ApiPage<OrderSummary>) => { this.orders.set(page.content || []); this.loading.set(false); }, error: () => { this.error.set('Não foi possível carregar seus pedidos. Tente novamente.'); this.loading.set(false); } }); }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  status(status: string): string { return ({ PAYMENT_PENDING: 'Pagamento em análise', PAID: 'Pagamento aprovado', PAYMENT_DECLINED: 'Pagamento recusado', CANCELLED: 'Pedido cancelado', CREATED: 'Pedido criado' } as Record<string,string>)[status] || status; }
  statusClass(status: string): string { return status.toLowerCase().replaceAll('_','-'); }
  date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
}
