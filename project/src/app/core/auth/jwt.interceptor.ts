import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ErrorReportService } from '../http/error-report.service';
import { LoggerService } from '../http/logger.service';
import { AuthService } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const errorReport = inject(ErrorReportService);
  const logger = inject(LoggerService);
  const base = environment.apiBaseUrl.replace(/\/$/, '');
  const sameApi = req.url === base || req.url.startsWith(`${base}/`);
  const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const outgoing = sameApi
    ? req.clone({
        withCredentials: true,
        ...(mutation ? { setHeaders: { 'X-Board-Request': '1' } } : {}),
      })
    : req;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const quiet =
          req.url.endsWith('/me') ||
          req.url.endsWith('/login') ||
          req.url.endsWith('/signup') ||
          req.url.endsWith('/logout');
        if (!quiet) {
          const requestId = error.headers.get('X-Request-Id');
          if (requestId) {
            errorReport.show(requestId, error.status);
          }
          if (error.status === 401 && !req.url.endsWith('/logout')) {
            logger.info('http 401', requestId);
            authService.logout();
            void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          }
        }
      }
      return throwError(() => error);
    }),
  );
};
