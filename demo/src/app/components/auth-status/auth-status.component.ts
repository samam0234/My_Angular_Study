import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-status',
  imports: [AsyncPipe],
  templateUrl: './auth-status.component.html',
})
export class AuthStatusComponent {
  private authService = inject(AuthService);
  currentUser$ = this.authService.currentUser$;
}
