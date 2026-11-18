import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiResponse } from '../../models/api.model';
import { environment } from '../../../environments/environment';
import { User } from '../../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private currentUserSignal = signal<User | null>(null);
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly currentUser$ = toObservable(this.currentUserSignal);

  get isLoggedIn(): boolean {
    return this.currentUserSignal() !== null;
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<ApiResponse<{ user: User; accessToken: string }>>(
        `${environment.apiBaseUrl}/auth/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(map((result) => result.data.user))
      .pipe(tap((user) => this.currentUserSignal.set(user)));
  }

  restore(): Observable<User | null> {
    return this.http
      .get<ApiResponse<User>>(`${environment.apiBaseUrl}/auth/me`, { withCredentials: true })
      .pipe(
        map((result) => result.data),
        tap((user) => this.currentUserSignal.set(user)),
        catchError(() => {
          this.currentUserSignal.set(null);
          return of(null);
        }),
      );
  }

  logout() {
    this.currentUserSignal.set(null);
    this.http
      .post(`${environment.apiBaseUrl}/auth/logout`, {}, { withCredentials: true })
      .subscribe({ error: () => undefined });
  }

  signup(email: string, password: string, nickname: string): Observable<User> {
    return this.http
      .post<ApiResponse<User>>(`${environment.apiBaseUrl}/auth/signup`, {
        email,
        password,
        nickname,
      })
      .pipe(map((result) => result.data));
  }
}
