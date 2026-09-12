import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, startWith, switchMap, tap } from 'rxjs/operators';
import { Post } from '../../models/post.model';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-list-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './post-list.component.html',
})
export class PostListPageComponent implements OnInit {
  private postService = inject(PostService);

  userIdControl = new FormControl('', { nonNullable: true });
  posts: Post[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit() {
    this.userIdControl.valueChanges
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.loading = true;
          this.errorMessage = '';
        }),
        // switchMap: userId가 바뀌면 "이전 요청은 취소"하고 최신 요청 하나의 결과만 받는다.
        switchMap((userId) =>
          this.postService.getPosts(userId).pipe(
            catchError(() => {
              this.errorMessage = '게시글을 불러오지 못했습니다.';
              return of<Post[]>([]);
            }),
          ),
        ),
      )
      .subscribe((posts) => {
        this.posts = posts;
        this.loading = false;
      });
  }
}
