import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// React <ProtectedRoute>의 "원래 가려던 곳 기억하기(location.state.from)"를
// Angular에서는 리다이렉트 주소에 returnUrl 쿼리 파라미터로 실어 보내는 방식으로 구현한다.
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
