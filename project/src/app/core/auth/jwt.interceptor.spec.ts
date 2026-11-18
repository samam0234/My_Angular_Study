import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ErrorReportService } from '../http/error-report.service';
import { AuthService } from './auth.service';
import { jwtInterceptor } from './jwt.interceptor';

describe('jwtInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sends the API call with credentials and without a bearer header', () => {
    http.get('/api/posts').subscribe();
    const req = httpMock.expectOne('/api/posts');

    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush([]);
  });

  it('logs the visitor out and shows X-Request-Id when the server returns 401', () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    const errors = TestBed.inject(ErrorReportService);
    spyOn(router, 'navigate').and.resolveTo(true);
    auth.login('test@example.com', 'password123').subscribe();
    httpMock.expectOne('/api/auth/login').flush({
      data: {
        user: { id: 1, nickname: 'test', name: 'test', email: 'test@example.com', role: 'user' },
        accessToken: 'discarded',
      },
    });

    http.get('/api/posts').subscribe({ error: () => undefined });
    const req = httpMock.expectOne('/api/posts');
    req.flush('nope', {
      status: 401,
      statusText: 'Unauthorized',
      headers: { 'X-Request-Id': 'req-9' },
    });
    httpMock.expectOne('/api/auth/logout').flush(
      { error: { code: 'UNAUTHORIZED' } },
      {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'X-Request-Id': 'logout-req-10' },
      },
    );

    expect(auth.isLoggedIn).toBeFalse();
    expect(errors.requestId()).toBe('req-9');
    expect(errors.status()).toBe(401);
    expect(router.navigate).toHaveBeenCalled();
  });

  it('adds the CSRF request header only for mutations to the configured API', () => {
    http.post('/api/posts', {}).subscribe();
    const api = httpMock.expectOne('/api/posts');
    expect(api.request.headers.get('X-Board-Request')).toBe('1');
    api.flush({});
    http.post('https://external.example/api/posts', {}).subscribe();
    const external = httpMock.expectOne('https://external.example/api/posts');
    expect(external.request.withCredentials).toBeFalse();
    expect(external.request.headers.has('X-Board-Request')).toBeFalse();
    external.flush({});
  });
});
