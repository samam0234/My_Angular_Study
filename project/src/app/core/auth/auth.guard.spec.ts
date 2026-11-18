import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('sends an anonymous visitor to login and keeps returnUrl', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/mypage' } as never),
    );

    expect(result instanceof UrlTree).toBeTrue();
    const url = TestBed.inject(Router).serializeUrl(result as UrlTree);
    expect(url).toContain('/login');
    expect(url).toContain('returnUrl');
    expect(decodeURIComponent(url)).toContain('/mypage');
  });

  it('allows the route after login', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('test@example.com', 'password123').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush({
        data: {
          user: { id: 1, nickname: 'test', name: 'test', email: 'test@example.com', role: 'user' },
          accessToken: 'discarded',
        },
      });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/mypage' } as never),
    );
    expect(result).toBeTrue();
  });

  it('sends a normal user away from the admin page', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('test@example.com', 'password123').subscribe();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/login')
      .flush({
        data: {
          user: { id: 1, nickname: 'test', name: 'test', email: 'test@example.com', role: 'user' },
          accessToken: 'discarded',
        },
      });
    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/admin' } as never),
    );
    expect(result instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toContain('/mypage');
  });
});
