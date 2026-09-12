import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../../models/user.model';

export const JWT_STORAGE_KEY = 'board_demo_jwt';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // BehaviorSubject 하나로 앱 전체가 같은 로그인 상태를 공유한다 (study8 복습).
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  login(email: string) {
    const user: User = { name: email.split('@')[0], email };
    this.currentUserSubject.next(user);
    // 실제 서버가 없으므로 JWT 형태만 흉내낸 토큰을 저장한다 (study10 인터셉터가 이 값을 읽는다).
    localStorage.setItem(JWT_STORAGE_KEY, btoa(`fake-jwt.${email}.${Date.now()}`));
  }

  logout() {
    this.currentUserSubject.next(null);
    localStorage.removeItem(JWT_STORAGE_KEY);
  }
}
