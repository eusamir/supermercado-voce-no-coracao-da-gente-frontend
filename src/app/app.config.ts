import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/auth.interceptor';
import { AuthService } from './core/auth.service';
import { provideNgxToastify } from '@andreasnicolaou/ngx-toastify';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideNgxToastify({ position: 'top-right', options: { maxToasts: 3, newestOnTop: true, duration: 3600, withProgressBar: true, closeButton: true, animationType: 'slide' } }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ]
};
