import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { PostService } from './post.service';

const serverPost = { id: 101, author: { id: 1, nickname: 'test' }, title: '제목', body: '본문' };
const meta = { page: 1, limit: 10, total: 1, totalPages: 1, q: '' };

describe('PostService', () => {
  let service: PostService;
  let httpMock: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PostService);
    httpMock = TestBed.inject(HttpTestingController);
  });
  afterEach(() => httpMock.verify());

  it('uses the common API envelope and PATCH without trusting a client author id', () => {
    service.createPost('제목', '본문').subscribe((post) => expect(post.userId).toBe(1));
    const created = httpMock.expectOne('/api/posts');
    expect(created.request.method).toBe('POST');
    expect(created.request.body).toEqual({ title: '제목', body: '본문', tags: [] });
    created.flush({ data: serverPost });
    service.updatePost({ id: 101, userId: 1, title: '[수정] 제목', body: '본문' }).subscribe();
    const updated = httpMock.expectOne('/api/posts/101');
    expect(updated.request.method).toBe('PATCH');
    expect(updated.request.body['userId']).toBeUndefined();
    updated.flush({ data: { ...serverPost, title: '[수정] 제목' } });
    service.deletePost(101).subscribe();
    const removed = httpMock.expectOne('/api/posts/101');
    expect(removed.request.method).toBe('DELETE');
    removed.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('caches by page and search query and invalidates after a mutation', () => {
    const url = '/api/posts?page=1&limit=10&q=';
    service.getPosts(1, 10).subscribe();
    httpMock.expectOne(url).flush({ data: [serverPost], meta });
    service.getPosts(1, 10).subscribe((posts) => expect(posts[0].id).toBe(101));
    httpMock.expectNone(url);
    service.getPosts(1, 10, '검색').subscribe();
    httpMock.expectOne((r) => r.params.get('q') === '검색').flush({ data: [], meta });
    service.deletePost(101).subscribe();
    httpMock.expectOne('/api/posts/101').flush(null);
    service.getPosts(1, 10).subscribe();
    httpMock.expectOne(url).flush({ data: [], meta });
  });

  it('does not turn a missing post into a successful local edit', () => {
    service.updatePost({ id: 999, userId: 1, title: '제목', body: '본문' }).subscribe({
      next: () => fail('404 must fail'),
      error: (error) => expect(error.status).toBe(404),
    });
    httpMock
      .expectOne('/api/posts/999')
      .flush({ error: { code: 'NOT_FOUND' } }, { status: 404, statusText: 'Not Found' });
  });
});
