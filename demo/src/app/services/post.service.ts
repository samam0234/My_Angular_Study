import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Post } from '../models/post.model';

const BASE_URL = 'https://jsonplaceholder.typicode.com/posts';

@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);

  getPosts(userId?: string): Observable<Post[]> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<Post[]>(BASE_URL, { params }).pipe(
      // map: 응답을 그대로 쓰지 않고 필요한 형태로 가공 (여기서는 목록이 너무 길지 않도록 10개로 제한)
      map((posts) => posts.slice(0, 10)),
    );
  }

  getPost(id: number): Observable<Post> {
    return this.http.get<Post>(`${BASE_URL}/${id}`);
  }
}
