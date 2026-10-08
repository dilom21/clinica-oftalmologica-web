import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SaasAuthService } from '../../features/saas/services/saas-auth.service';

export const saasAuthGuard: CanActivateFn = () => {
  const auth = inject(SaasAuthService);
  const router = inject(Router);
  return auth.isValidAdminToken() ? true : router.createUrlTree(['/saas/login']);
};
