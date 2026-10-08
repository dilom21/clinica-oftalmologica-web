import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SAAS_TOKEN_KEY } from '../../features/saas/services/saas-auth.service';

const safeMessages: Record<number, string> = { 403: 'No tienes permiso para realizar esta operación.', 404: 'El recurso solicitado no está disponible.', 409: 'La operación no puede completarse por el estado actual.' };

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isSaas = req.url.includes('/saas/');
  const isSaasLogin = isSaas && req.method === 'POST' && req.url.endsWith('/saas/auth/login');
  const isPublicClinical = req.url.endsWith('/seguridad/login') ||
    req.url.endsWith('/seguridad/tenant/login') || req.url.endsWith('/seguridad/tenant/empresas');
  const token = isSaas ? (isSaasLogin ? null : localStorage.getItem(SAAS_TOKEN_KEY)) :
    (isPublicClinical ? null : localStorage.getItem('access_token'));

  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(catchError((error: HttpErrorResponse) => {
    if (!isSaas) return throwError(() => error);
    if (error.status === 401) {
      localStorage.removeItem(SAAS_TOKEN_KEY);
      void router.navigate(['/saas/login']);
    } else if (error.status === 403 || error.status === 404 || error.status === 409 || error.status >= 500) {
      const message = error.status >= 500 ? 'No se pudo completar la operación. Intenta nuevamente.' : safeMessages[error.status];
      return throwError(() => new HttpErrorResponse({ error: { message }, headers: error.headers, status: error.status, statusText: error.statusText, url: error.url ?? undefined }));
    }
    return throwError(() => error);
  }));
};
