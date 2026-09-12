import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // AuthService를 주입받는 모든 컴포넌트가 같은 로그인 상태를 공유한다 (study8 복습).
  currentUser$ = this.authService.currentUser$;

  onLogout() {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }
}
