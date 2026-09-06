import { inject } from '@angular/core';
import { Router } from '@angular/router';
export const authGuard = () => {
    const router = inject(Router);
    const token = localStorage.getItem('access_token');
    if (token) {
        return true;
    }
    return router.createUrlTree(['/login']);
};
