import { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  startWith,
  switchMap,
  tap,
  map,
} from 'rxjs/operators';
import { Post } from '../../../models/post.model';
import { PostPage, PostService } from '../post.service';
import { FavoritesService } from '../favorites.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PostCardComponent } from '../../../shared/post-card/post-card.component';

const LIMIT = 10;

@Component({
  selector: 'app-post-list-page',
  imports: [ReactiveFormsModule, AsyncPipe, PostCardComponent],
  templateUrl: './post-list-page.component.html',
})
export class PostListPageComponent {
  private postService = inject(PostService);
  private favoritesService = inject(FavoritesService);
  readonly authService = inject(AuthService);
  private formBuilder = inject(FormBuilder);

  keywordControl = new FormControl('', { nonNullable: true });
  draft = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.maxLength(20000)]],
  });
  readonly draftError = signal('');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  private query = new BehaviorSubject({ page: 1, q: '' });
  private showFavoritesOnlySubject = new BehaviorSubject(false);
  private keyword$ = this.keywordControl.valueChanges.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    tap((q) => this.query.next({ page: 1, q })),
    startWith(''),
  );

  get currentPage() {
    return this.query.value.page;
  }
  get showFavoritesOnly() {
    return this.showFavoritesOnlySubject.value;
  }

  private rawPosts$ = this.query.pipe(
    tap(() => {
      this.loading.set(true);
      this.errorMessage.set('');
    }),
    switchMap(({ page, q }) =>
      this.postService.getPostPage(page, LIMIT, q).pipe(
        catchError(() => {
          this.errorMessage.set('게시글을 불러오지 못했습니다.');
          return of<PostPage>({
            data: [],
            meta: { page, limit: LIMIT, total: 0, totalPages: 0, q },
          });
        }),
      ),
    ),
    tap(() => this.loading.set(false)),
  );

  viewModel$ = combineLatest([
    this.rawPosts$,
    this.favoritesService.favoriteIds$,
    this.showFavoritesOnlySubject,
    this.keyword$,
  ]).pipe(
    map(([result, favoriteIds, favoritesOnly]) => ({
      meta: result.meta,
      items: result.data
        .filter((post) => !favoritesOnly || favoriteIds.has(post.id))
        .map((post) => ({ ...post, isFavorite: favoriteIds.has(post.id) })),
    })),
  );

  toggleFavoritesOnly() {
    this.showFavoritesOnlySubject.next(!this.showFavoritesOnly);
  }
  prevPage() {
    this.query.next({ ...this.query.value, page: Math.max(1, this.currentPage - 1) });
  }
  nextPage() {
    this.query.next({ ...this.query.value, page: this.currentPage + 1 });
  }
  private refresh() {
    this.query.next({ ...this.query.value });
  }

  createPost() {
    this.draftError.set('');
    if (this.saving()) return;
    if (
      this.draft.invalid ||
      !this.draft.getRawValue().title.trim() ||
      !this.draft.getRawValue().body.trim()
    ) {
      this.draft.markAllAsTouched();
      this.draftError.set(
        '제목과 내용을 모두 입력하세요. 제목은 200자, 내용은 20000자 이내입니다.',
      );
      return;
    }
    this.saving.set(true);
    const { title, body } = this.draft.getRawValue();
    this.postService.createPost(title, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.draft.reset();
        this.query.next({ page: 1, q: this.query.value.q });
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.draftError.set(error.error?.error?.message ?? '글을 등록하지 못했습니다.');
      },
    });
  }

  renamePost(post: Post) {
    const next = { ...post, title: `[수정] ${post.title.replace(/^\[수정\] /, '')}` };
    this.postService.updatePost(next).subscribe({
      next: () => this.refresh(),
      error: (error: HttpErrorResponse) =>
        this.draftError.set(error.error?.error?.message ?? '글을 수정하지 못했습니다.'),
    });
  }

  deletePost(post: Post) {
    this.postService.deletePost(post.id).subscribe({
      next: () => {
        this.query.next({ ...this.query.value, page: 1 });
      },
      error: (error: HttpErrorResponse) =>
        this.draftError.set(error.error?.error?.message ?? '글을 삭제하지 못했습니다.'),
    });
  }

  onToggleFavorite(postId: number) {
    if (!this.authService.isLoggedIn) {
      alert('즐겨찾기는 로그인 후 이용할 수 있습니다.');
      return;
    }
    this.favoritesService.toggle(postId);
  }
}
