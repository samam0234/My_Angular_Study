import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';
import { Post } from '../../models/post.model';
import { PostService } from '../../services/post.service';
import { FavoritesService } from '../../services/favorites.service';

@Component({
  selector: 'app-post-list-page',
  imports: [ReactiveFormsModule, RouterLink, AsyncPipe],
  templateUrl: './post-list.component.html',
})
export class PostListPageComponent {
  private postService = inject(PostService);
  private favoritesService = inject(FavoritesService);

  userIdControl = new FormControl('', { nonNullable: true });
  loading = false;
  errorMessage = '';

  private posts$ = this.userIdControl.valueChanges.pipe(
    startWith(''),
    debounceTime(300),
    distinctUntilChanged(),
    tap(() => {
      this.loading = true;
      this.errorMessage = '';
    }),
    // switchMap: userId가 바뀌면 이전 요청은 취소하고 최신 요청 하나의 결과만 받는다 (study7 복습)
    switchMap((userId) =>
      this.postService.getPosts(userId).pipe(
        catchError(() => {
          this.errorMessage = '게시글을 불러오지 못했습니다.';
          return of<Post[]>([]);
        }),
      ),
    ),
    tap(() => {
      this.loading = false;
    }),
  );

  // combineLatest: 두 스트림(게시글 목록, 즐겨찾기 id 집합) 중 하나라도 바뀌면 최신 값 두 개를 다시 조합한다.
  viewModel$ = combineLatest([this.posts$, this.favoritesService.favoriteIds$]).pipe(
    map(([posts, favoriteIds]) =>
      posts.map((post) => ({ ...post, isFavorite: favoriteIds.has(post.id) })),
    ),
  );

  toggleFavorite(id: number) {
    this.favoritesService.toggle(id);
  }
}
