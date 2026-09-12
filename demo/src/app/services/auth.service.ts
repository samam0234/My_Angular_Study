import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface AuthUser {
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  // BehaviorSubject: "현재 값"을 항상 기억하고 있다가, 새로 구독하는 쪽에게 즉시 그 값을 알려주는 Subject.
  // Context API/Zustand 스토어처럼, 앱 어디서든 이 서비스를 주입받으면 같은 로그인 상태를 공유한다.
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  login(username: string) {
    this.currentUserSubject.next({ username });
  }

  logout() {
    this.currentUserSubject.next(null);
  }
}
