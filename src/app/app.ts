import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { StoreService } from './core/store.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth = inject(AuthService);
  readonly store = inject(StoreService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) this.store.loadCart();
      else this.store.cart.set({ id: null, items: [], itemCount: 0, total: 0 });
    });
  }

  signIn(): void { this.auth.beginLogin(this.router.url); }
  signOut(): void { this.auth.logout(); }
}
