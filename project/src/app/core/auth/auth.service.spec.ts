import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

const user = {
  id: 1,
  nickname: 'test',
  name: 'test',
  email: 'test@example.com',
  role: 'user' as const,
};

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('stores the server user in the signal and does not keep the token in localStorage', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('test@example.com', 'password123').subscribe();
    const login = httpMock.expectOne('/api/auth/login');
    expect(login.request.withCredentials).toBeTrue();
    login.flush({ data: { user, accessToken: 'discarded' } });

    expect(auth.isLoggedIn).toBeTrue();
    expect(auth.currentUser()?.role).toBe('user');
    expect(localStorage.getItem('board_demo_jwt')).toBeNull();
  });

  it('restores the session from the cookie-backed profile', () => {
    const auth = TestBed.inject(AuthService);
    auth.restore().subscribe((restored) => {
      expect(restored?.email).toBe('test@example.com');
    });
    httpMock.expectOne('/api/auth/me').flush({ data: user });
    expect(auth.isLoggedIn).toBeTrue();
  });

  it('clears the signal on logout', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('test@example.com', 'password123').subscribe();
    httpMock.expectOne('/api/auth/login').flush({ data: { user, accessToken: 'discarded' } });
    auth.logout();
    httpMock.expectOne('/api/auth/logout').flush({ ok: true });

    expect(auth.isLoggedIn).toBeFalse();
  });
});
