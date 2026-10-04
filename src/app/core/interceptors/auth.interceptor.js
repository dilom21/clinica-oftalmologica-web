export const authInterceptor = (req, next) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        return next(req);
    }
    const authenticatedRequest = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
    });
    return next(authenticatedRequest);
};
