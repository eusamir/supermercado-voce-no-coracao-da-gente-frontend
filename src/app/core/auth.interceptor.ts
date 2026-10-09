import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { API_URL, KEYCLOAK_URL } from './config';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(API_URL) || request.url.startsWith(KEYCLOAK_URL)) return next(request);
  return from(inject(AuthService).validAccessToken()).pipe(
    switchMap((token) => next(token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request)),
  );
};
