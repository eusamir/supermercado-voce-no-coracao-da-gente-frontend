import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StoreService } from '../core/store.service';

function matchingEmails(control: AbstractControl): ValidationErrors | null {
  const email = String(control.get('email')?.value || '').trim().toLocaleLowerCase('pt-BR');
  const confirmation = String(control.get('confirmEmail')?.value || '').trim().toLocaleLowerCase('pt-BR');
  if (!email || !confirmation || control.get('email')?.invalid || control.get('confirmEmail')?.invalid) return null;
  return email === confirmation ? null : { emailMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.page.html',
  styleUrl: './auth.page.css',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(StoreService);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255), Validators.pattern(/^\s*\S+(\s+\S+)+\s*$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    confirmEmail: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
  }, { validators: matchingEmails });

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    const { name, email, password } = this.form.getRawValue();
    this.store.register({ name, email, password }).subscribe({
      next: () => { void this.router.navigate(['/login'], { queryParams: { registered: 'true' } }); },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err.status === 409 ? 'Este e-mail já está cadastrado. Entre na sua conta.' : err.status === 400 ? 'Confira seu nome, e-mail e senha e tente novamente.' : 'Não foi possível criar sua conta agora. Tente novamente em instantes.');
      },
    });
  }

  togglePassword(): void { this.showPassword.update((visible) => !visible); }
}
