import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Post } from '../../models/post.model';
import { PostComment } from '../../models/comment.model';
import { ApiPage, ApiResponse, PageMeta } from '../../models/api.model';
import { environment } from '../../../environments/environment';

interface ServerPost {
  id: number;
  title: string;
  body: string;
  author: { id: number; nickname: string };
}
interface ServerComment {
  id: number;
  postId: number;
  body: string;
  author: { id: number; nickname: string };
}
export interface PostPage {
  data: Post[];
  meta: PageMeta;
}
export interface PostDetail {
  post: Post;
  comments: PostComment[];
}
const toPost = (p: ServerPost): Post => ({
  id: p.id,
  userId: p.author.id,
  title: p.title,
  body: p.body,
});

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);
  private pageCache = new Map<string, { value: PostPage; expires: number }>();
  private get url() {
    return `${environment.apiBaseUrl}/posts`;
  }

  getPosts(page: number, limit: number, q = ''): Observable<Post[]> {
    return this.getPostPage(page, limit, q).pipe(map((result) => result.data));
  }

  getPostPage(page: number, limit: number, q = ''): Observable<PostPage> {
    const key = JSON.stringify([page, limit, q.trim()]);
    const cached = this.pageCache.get(key);
    if (cached && cached.expires > Date.now()) return of(cached.value);
    const params = new HttpParams().set('page', page).set('limit', limit).set('q', q.trim());
    return this.http.get<ApiPage<ServerPost>>(this.url, { params }).pipe(
      map((result) => ({ data: result.data.map(toPost), meta: result.meta })),
      tap((value) => {
        if (this.pageCache.size >= 30) this.pageCache.clear();
        this.pageCache.set(key, { value, expires: Date.now() + 30_000 });
      }),
    );
  }

  createPost(title: string, body: string): Observable<Post> {
    return this.http.post<ApiResponse<ServerPost>>(this.url, { title, body, tags: [] }).pipe(
      map((result) => toPost(result.data)),
      tap(() => this.pageCache.clear()),
    );
  }

  updatePost(post: Post): Observable<Post> {
    return this.http
      .patch<ApiResponse<ServerPost>>(`${this.url}/${post.id}`, {
        title: post.title,
        body: post.body,
      })
      .pipe(
        map((result) => toPost(result.data)),
        tap(() => this.pageCache.clear()),
      );
  }

  deletePost(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(tap(() => this.pageCache.clear()));
  }

  getPostDetail(id: number): Observable<PostDetail> {
    return forkJoin([
      this.http.get<ApiResponse<ServerPost>>(`${this.url}/${id}`),
      this.http.get<ApiResponse<ServerComment[]>>(`${this.url}/${id}/comments`),
    ]).pipe(
      map(([post, comments]) => ({
        post: toPost(post.data),
        comments: comments.data.map((c) => ({
          id: c.id,
          postId: c.postId,
          body: c.body,
          name: c.author.nickname,
          email: '',
        })),
      })),
    );
  }
}
