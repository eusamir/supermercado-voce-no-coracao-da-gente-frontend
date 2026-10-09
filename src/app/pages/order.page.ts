import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, EMPTY, switchMap, takeWhile, timer } from 'rxjs';
import { Order } from '../core/models';
import { StoreService } from '../core/store.service';

@Component({ selector: 'app-order-page', imports: [RouterLink], templateUrl: './order.page.html', styleUrl: './order.page.css' })
export class OrderPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(StoreService);
  private readonly destroyRef = inject(DestroyRef);
  readonly order = signal<Order | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly checking = signal(false);
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.error.set('Não encontramos esse pedido.'); this.loading.set(false); return; }
    timer(0, 2500).pipe(
      switchMap(() => { this.checking.set(true); return this.store.order(id).pipe(catchError(() => { this.error.set('Não foi possível consultar o pedido. Verifique sua conexão e tente novamente.'); this.loading.set(false); this.checking.set(false); return EMPTY; })); }),
      takeWhile((order) => !this.isFinal(order), true),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({ next: (order) => { this.order.set(order); this.error.set(''); this.loading.set(false); this.checking.set(!this.isFinal(order)); } });
  }
  isFinal(order: Order): boolean { return ['PAID','PAYMENT_DECLINED','CANCELLED'].includes(order.status); }
  title(status: string): string { return ({ PAYMENT_PENDING: 'Pagamento em análise', PAID: 'Compra aprovada!', PAYMENT_DECLINED: 'Pagamento não aprovado', CANCELLED: 'Pedido cancelado', CREATED: 'Pedido recebido' } as Record<string,string>)[status] || 'Acompanhamento do pedido'; }
  paymentTitle(status: string): string { return ({ PENDING: 'Pendente', APPROVED: 'Aprovado', DECLINED: 'Recusado', REFUNDED: 'Estornado' } as Record<string,string>)[status] || status; }
  message(order: Order): string {
    if (order.status === 'PAYMENT_PENDING' || order.status === 'CREATED') return 'Estamos processando o pagamento simulado. Esta página atualiza o status automaticamente.';
    if (order.status === 'PAID') return 'Tudo certo! Seu pagamento foi aprovado e seu pedido está confirmado.';
    if (order.status === 'PAYMENT_DECLINED') return order.payment?.failureReason || 'O pagamento simulado não foi aprovado. Você pode tentar uma nova compra.';
    return 'Este pedido foi cancelado.';
  }
  money(value: number): string { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); }
  date(value: string): string { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value)); }
}
