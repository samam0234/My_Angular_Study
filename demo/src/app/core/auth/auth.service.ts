import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  username: string;
}

// 실제 서버가 없으므로 JWT 형태만 흉내낸 문자열을 사용합니다. (진짜 서명/검증은 하지 않음)
export const JWT_STORAGE_KEY = 'demo_jwt';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  login(username: string) {
    this.currentUserSubject.next({ username });
    localStorage.setItem(JWT_STORAGE_KEY, btoa(`fake-jwt.${username}.${Date.now()}`));
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem(JWT_STORAGE_KEY);
  }
}
