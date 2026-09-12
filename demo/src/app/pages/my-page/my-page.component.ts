import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-my-page',
  imports: [AsyncPipe],
  templateUrl: './my-page.component.html',
})
export class MyPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser$ = this.authService.currentUser$;

  onLogout() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
