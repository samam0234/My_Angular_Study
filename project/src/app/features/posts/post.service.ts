import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { Post } from '../../models/post.model';
import { PostComment } from '../../models/comment.model';
import { environment } from '../../../environments/environment';

const BASE_URL = `${environment.apiBaseUrl}/posts`;

export interface PostDetail {
  post: Post;
  comments: PostComment[];
}

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);

  getPosts(page: number, limit: number): Observable<Post[]> {
    const params = new HttpParams().set('_page', page).set('_limit', limit);
    return this.http.get<Post[]>(BASE_URL, { params });
  }

  getPostDetail(id: number): Observable<PostDetail> {
    // forkJoin: Promise.all의 RxJS 버전. 두 Observable이 "모두 끝나면" 결과를 배열로 묶어 한 번에 방출한다.
    return forkJoin([
      this.http.get<Post>(`${BASE_URL}/${id}`),
      this.http.get<PostComment[]>(`${BASE_URL}/${id}/comments`),
    ]).pipe(map(([post, comments]) => ({ post, comments })));
  }
}
