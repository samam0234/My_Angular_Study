import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login.component.html',
})
export class LoginPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  onLogin() {
    this.authService.login();
    this.router.navigateByUrl('/mypage');
  }
}
