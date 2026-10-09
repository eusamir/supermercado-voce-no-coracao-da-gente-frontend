import { Component, effect, inject, signal, untracked } from '@angular/core';
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
  readonly userName = signal('');
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.userName.set(untracked(() => this.auth.displayName()) || 'cliente');
        this.store.loadCart();
        this.store.profile().subscribe({ next: (profile) => this.userName.set(profile.name.trim() || 'cliente'), error: () => undefined });
      } else {
        this.userName.set('');
        this.store.setCart({ id: null, items: [], itemCount: 0, total: 0 });
      }
    });
  }

  signIn(): void { this.auth.beginLogin(this.router.url); }
  signOut(): void { this.auth.logout(); }
}
