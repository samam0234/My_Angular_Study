import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { catchError, startWith, switchMap, tap, map } from 'rxjs/operators';
import { Post } from '../../../models/post.model';
import { PostService } from '../post.service';
import { FavoritesService } from '../favorites.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PostCardComponent } from '../../../shared/post-card/post-card.component';

const LIMIT = 10;

interface PostListViewModel {
  rawCount: number;
  items: (Post & { isFavorite: boolean })[];
}

@Component({
  selector: 'app-post-list-page',
  imports: [ReactiveFormsModule, AsyncPipe, PostCardComponent],
  templateUrl: './post-list-page.component.html',
})
export class PostListPageComponent {
  private postService = inject(PostService);
  private favoritesService = inject(FavoritesService);
  private authService = inject(AuthService);

  keywordControl = new FormControl('', { nonNullable: true });
  loading = false;
  errorMessage = '';

  private pageSubject = new BehaviorSubject(1);
  private showFavoritesOnlySubject = new BehaviorSubject(false);

  get currentPage() {
    return this.pageSubject.value;
  }

  get showFavoritesOnly() {
    return this.showFavoritesOnlySubject.value;
  }

  private rawPosts$ = this.pageSubject.pipe(
    tap(() => {
      this.loading = true;
      this.errorMessage = '';
    }),
    switchMap((page) =>
      this.postService.getPosts(page, LIMIT).pipe(
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

  // 목록 화면 하나에 study2(검색/필터), study7(페이지네이션), study9(즐겨찾기+combineLatest)를 결합.
  viewModel$ = combineLatest([
    this.rawPosts$,
    this.favoritesService.favoriteIds$,
    this.keywordControl.valueChanges.pipe(startWith('')),
    this.showFavoritesOnlySubject,
  ]).pipe(
    map(([posts, favoriteIds, keyword, favoritesOnly]): PostListViewModel => ({
      rawCount: posts.length,
      items: posts
        .filter((post) => post.title.includes(keyword.trim()))
        .filter((post) => !favoritesOnly || favoriteIds.has(post.id))
        .map((post) => ({ ...post, isFavorite: favoriteIds.has(post.id) })),
    })),
  );

  toggleFavoritesOnly() {
    this.showFavoritesOnlySubject.next(!this.showFavoritesOnlySubject.value);
  }

  prevPage() {
    this.pageSubject.next(Math.max(1, this.pageSubject.value - 1));
  }

  nextPage() {
    this.pageSubject.next(this.pageSubject.value + 1);
  }

  onToggleFavorite(postId: number) {
    if (!this.authService.isLoggedIn) {
      alert('즐겨찾기는 로그인 후 이용할 수 있습니다.');
      return;
    }
    this.favoritesService.toggle(postId);
  }
}
