import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';
import { FavoritesService } from '../../posts/favorites.service';

@Component({
  selector: 'app-my-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './my-page.component.html',
})
export class MyPageComponent {
  private authService = inject(AuthService);
  private favoritesService = inject(FavoritesService);

  currentUser$ = this.authService.currentUser$;
  favoriteIds$ = this.favoritesService.favoriteIds$.pipe(map((ids) => Array.from(ids)));
}
