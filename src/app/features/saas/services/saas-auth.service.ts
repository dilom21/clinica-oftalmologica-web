import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SaasLoginRequest, SaasLoginResponse } from '../models/saas.models';

export const SAAS_TOKEN_KEY = 'saas_access_token';
export interface SaasTokenClaims { token_type?: string; exp?: number; saas_usuario_id?: number; sub?: string | number; [key: string]: unknown; }

@Injectable({ providedIn: 'root' })
export class SaasAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/saas/auth/login`;

  login(credentials: SaasLoginRequest): Observable<SaasLoginResponse> {
    return this.http.post<SaasLoginResponse>(this.url, credentials).pipe(tap((response) => {
      if (response.access_token) localStorage.setItem(SAAS_TOKEN_KEY, response.access_token);
    }));
  }

  logout(): void { localStorage.removeItem(SAAS_TOKEN_KEY); void this.router.navigate(['/saas/login']); }
  token(): string | null { return localStorage.getItem(SAAS_TOKEN_KEY); }
  claims(): SaasTokenClaims | null { return decodeSaasToken(this.token()); }
  isValidAdminToken(): boolean {
    const claims = this.claims();
    return Boolean(this.token() && claims?.token_type === 'saas_admin' && typeof claims.exp === 'number' && claims.exp > Math.floor(Date.now() / 1000));
  }
}

export function decodeSaasToken(token: string | null): SaasTokenClaims | null {
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const claims = JSON.parse(atob(normalized)) as SaasTokenClaims;
    return claims && typeof claims === 'object' ? claims : null;
  } catch { return null; }
}
