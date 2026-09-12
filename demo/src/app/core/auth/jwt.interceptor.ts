import { HttpInterceptorFn } from '@angular/common/http';
import { JWT_STORAGE_KEY } from './auth.service';

// 모든 HTTP 요청을 가로채(intercept), 토큰이 있으면 Authorization 헤더를 자동으로 붙여준다.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(JWT_STORAGE_KEY);

  if (!token) {
    return next(req);
  }

  // HttpRequest는 불변(immutable) 객체라서 직접 수정할 수 없고, clone()으로 새 요청을 만들어야 한다.
  const authorizedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authorizedReq);
};
