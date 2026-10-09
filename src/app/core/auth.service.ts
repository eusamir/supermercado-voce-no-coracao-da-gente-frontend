import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from './config';

const VERIFIER_KEY = 'mercadinho.oidc.verifier';
const STATE_KEY = 'mercadinho.oidc.state';
const NONCE_KEY = 'mercadinho.oidc.nonce';
const RETURN_KEY = 'mercadinho.oidc.return';
const TOKEN_KEY = 'mercadinho.oidc.session';

interface TokenSet {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

interface ActiveTokenSet extends TokenSet { savedAt: number }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly tokenState = signal<ActiveTokenSet | null>(null);
  readonly isAuthenticated = signal(this.tokenState() !== null);
  private refreshTask: Promise<string | null> | null = null;

  async restoreSession(): Promise<void> {
    if (!this.browser) return;
    try {
      const saved = sessionStorage.getItem(TOKEN_KEY);
      if (!saved) return;
      const token = JSON.parse(saved) as ActiveTokenSet;
      if (typeof token.access_token !== 'string' || typeof token.id_token !== 'string' || !Number.isFinite(token.savedAt) || !Number.isFinite(token.expires_in)) {
        this.clear();
        return;
      }
      this.tokenState.set(token);
      this.isAuthenticated.set(true);
      if (this.expiresAt(token) <= Date.now() + 60_000) await this.validAccessToken();
    } catch {
      this.clear();
    }
  }

  displayName(): string {
    const claims = this.decodePayload(this.tokenState()?.id_token || '');
    const name = claims?.['name'] || claims?.['given_name'] || claims?.['preferred_username'];
    return typeof name === 'string' ? name.trim() : '';
  }

  async beginLogin(returnUrl = '/', loginHint = ''): Promise<void> {
    if (!this.browser) return;
    const state = this.randomString(32);
    const nonce = this.randomString(32);
    const verifier = this.randomString(64);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(NONCE_KEY, nonce);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(RETURN_KEY, returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/');
    const challenge = await this.createChallenge(verifier);
    const params = new URLSearchParams({
        client_id: KEYCLOAK_CLIENT_ID,
        redirect_uri: `${location.origin}/login/callback`,
        response_type: 'code',
        scope: 'openid profile email',
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });
    if (loginHint.trim()) params.set('login_hint', loginHint.trim());
    location.assign(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth?${params}`);
  }

  async finishLogin(code: string, returnedState: string): Promise<string> {
    if (!this.browser) throw new Error('A autenticação só pode ser concluída no navegador.');
    const expectedState = sessionStorage.getItem(STATE_KEY);
    const expectedNonce = sessionStorage.getItem(NONCE_KEY);
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!expectedState || returnedState !== expectedState || !expectedNonce || !verifier) {
      throw new Error('A sessão de autenticação expirou. Inicie o login novamente.');
    }
    const redirectUri = `${location.origin}/login/callback`;
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', KEYCLOAK_CLIENT_ID)
      .set('code', code)
      .set('redirect_uri', redirectUri)
      .set('code_verifier', verifier);
    const tokens = await firstValueFrom(this.http.post<TokenSet>(
      `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`, body,
    ));
    const tokenNonce = this.decodePayload(tokens.id_token)?.['nonce'];
    if (typeof tokenNonce !== 'string' || tokenNonce !== expectedNonce) {
      throw new Error('Não foi possível validar a resposta do login. Inicie a autenticação novamente.');
    }
    this.saveToken(tokens);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(NONCE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    const returnUrl = sessionStorage.getItem(RETURN_KEY) || '/';
    sessionStorage.removeItem(RETURN_KEY);
    return returnUrl;
  }

  async validAccessToken(): Promise<string | null> {
    const tokens = this.tokenState();
    if (!tokens) return null;
    if (this.expiresAt(tokens) > Date.now() + 60_000) return tokens.access_token;
    if (!tokens.refresh_token || !this.browser) {
      this.clear();
      return null;
    }
    if (!this.refreshTask) {
      this.refreshTask = firstValueFrom(this.http.post<TokenSet>(
        `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
        new HttpParams().set('grant_type', 'refresh_token').set('client_id', KEYCLOAK_CLIENT_ID).set('refresh_token', tokens.refresh_token),
      )).then((next) => {
        this.saveToken({ ...next, id_token: next.id_token || tokens.id_token, refresh_token: next.refresh_token || tokens.refresh_token });
        return next.access_token;
      }).catch(() => {
        this.clear();
        return null;
      }).finally(() => { this.refreshTask = null; });
    }
    return this.refreshTask;
  }

  logout(): void {
    const idToken = this.tokenState()?.id_token;
    this.clear();
    if (!this.browser) return;
    const params = new URLSearchParams({ client_id: KEYCLOAK_CLIENT_ID, post_logout_redirect_uri: location.origin, id_token_hint: idToken || '' });
    location.assign(`${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout?${params}`);
  }

  private saveToken(tokens: TokenSet): void {
    const saved = { ...tokens, savedAt: Date.now() };
    this.tokenState.set(saved);
    this.isAuthenticated.set(true);
    if (this.browser) {
      try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(saved)); } catch { /* Keep the active session in memory if storage is unavailable. */ }
    }
  }

  private clear(): void {
    this.tokenState.set(null);
    this.isAuthenticated.set(false);
    if (this.browser) {
      try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Storage may be unavailable in restricted browser contexts. */ }
    }
  }

  private expiresAt(token: TokenSet & { savedAt?: number }): number {
    return (token.savedAt || Date.now()) + token.expires_in * 1000;
  }

  private randomString(bytes: number): string {
    const values = crypto.getRandomValues(new Uint8Array(bytes));
    return btoa(String.fromCharCode(...values)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  private async createChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  }

  private decodePayload(token: string): Record<string, unknown> | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;
      const normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
      return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as Record<string, unknown>;
    } catch { return null; }
  }
}
