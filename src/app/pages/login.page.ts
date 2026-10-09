import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './auth.page.css',
})
export class LoginPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly callback = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly registered = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.registered.set(params.get('registered') === 'true');
    const code = params.get('code');
    if (params.get('error')) {
      this.callback.set(true);
      this.error.set('O acesso não foi concluído. Você pode tentar entrar novamente.');
    } else if (code) {
      this.callback.set(true);
      this.loading.set(true);
      this.auth.finishLogin(code, params.get('state') || '').then((returnUrl) => {
        void this.router.navigateByUrl(returnUrl);
      }).catch((error: unknown) => {
        this.error.set(error instanceof Error ? error.message : 'Não foi possível concluir o login.');
      }).finally(() => this.loading.set(false));
    }
  }

  login(): void {
    this.auth.beginLogin(this.route.snapshot.queryParamMap.get('returnUrl') || '/');
  }
}
