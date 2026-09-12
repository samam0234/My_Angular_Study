import { AsyncPipe, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import { PostService } from '../post.service';
import { FavoritesService } from '../favorites.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-post-detail-page',
  imports: [RouterLink, AsyncPipe],
  templateUrl: './post-detail-page.component.html',
})
export class PostDetailPageComponent {
  private route = inject(ActivatedRoute);
  private postService = inject(PostService);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);
  private location = inject(Location);

  private postId = Number(this.route.snapshot.paramMap.get('id'));
  loading = true;
  errorMessage = '';

  private detail$ = this.postService.getPostDetail(this.postId).pipe(
    catchError(() => {
      this.errorMessage = '게시글을 불러오지 못했습니다.';
      return of(null);
    }),
  );

  viewModel$ = combineLatest([
    this.detail$,
    this.favoritesService.favoriteIds$.pipe(startWith(new Set<number>())),
  ]).pipe(
    map(([detail, favoriteIds]) => {
      this.loading = false;
      if (!detail) return null;
      return { ...detail, isFavorite: favoriteIds.has(detail.post.id) };
    }),
  );

  goBack() {
    this.location.back();
  }

  onToggleFavorite() {
    if (!this.authService.isLoggedIn) {
      alert('즐겨찾기는 로그인 후 이용할 수 있습니다.');
      return;
    }
    this.favoritesService.toggle(this.postId);
  }
}
