import { HttpInterceptorFn } from '@angular/common/http';
import { JWT_STORAGE_KEY } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(JWT_STORAGE_KEY);
  if (!token) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
