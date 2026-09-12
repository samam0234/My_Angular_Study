import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { Post } from '../../models/post.model';
import { PostService } from '../../services/post.service';

@Component({
  selector: 'app-post-detail-page',
  imports: [RouterLink],
  templateUrl: './post-detail.component.html',
})
export class PostDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private postService = inject(PostService);

  post: Post | null = null;
  loading = true;
  errorMessage = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.postService
      .getPost(id)
      .pipe(
        catchError(() => {
          this.errorMessage = '게시글을 찾을 수 없습니다.';
          return of(null);
        }),
      )
      .subscribe((post) => {
        this.post = post;
        this.loading = false;
      });
  }
}
