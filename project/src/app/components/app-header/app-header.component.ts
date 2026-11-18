import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ErrorReportService } from '../../core/http/error-report.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  readonly errorReport = inject(ErrorReportService);

  // AuthService를 주입받는 모든 컴포넌트가 같은 로그인 상태를 공유한다.
  currentUser$ = this.authService.currentUser$;

  onLogout() {
    this.authService.logout();
    this.router.navigateByUrl('/');
  }
}
