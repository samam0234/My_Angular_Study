import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// React의 <ProtectedRoute> 컴포넌트에 대응하는, "함수형 가드"
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    return true;
  }

  // boolean 대신 UrlTree를 반환하면 Router가 그 주소로 리다이렉트해준다.
  return router.parseUrl('/login');
};
