# study7 (고급2) — HttpClient + RxJS(map/switchMap/catchError), 로딩/에러/빈 상태

## 1. `HttpClient` 등록

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),   // 추가
  ],
};
```

React에서 axios를 쓰려면 `npm install axios` 후 별도 인스턴스를 만들었지만, Angular는 `@angular/common/http`가 이미 내장돼 있고 `provideHttpClient()` 한 줄로 앱 전체에서 `HttpClient`를 주입받을 수 있게 됩니다(study0 0절).

## 2. 서비스에서 `Observable` 반환 — `map`

```typescript
// services/post.service.ts
@Injectable({ providedIn: 'root' })
export class PostService {
  private http = inject(HttpClient);

  getPosts(userId?: string): Observable<Post[]> {
    const params = userId ? new HttpParams().set('userId', userId) : undefined;
    return this.http.get<Post[]>(BASE_URL, { params }).pipe(
      map((posts) => posts.slice(0, 10)),   // 응답을 그대로 쓰지 않고 가공
    );
  }
}
```

- `this.http.get<Post[]>(...)`는 **Promise가 아니라 Observable**을 반환합니다(study0 7절). `.then()`이 아니라 `.pipe(연산자, 연산자, ...)`로 값을 가공합니다.
- `map`은 배열의 `Array.prototype.map`과 이름은 같지만 **RxJS 연산자**입니다 — "Observable이 값을 방출할 때마다 그 값을 변환해서 다시 방출"한다는 뜻입니다.

## 3. `switchMap` — 검색어가 바뀔 때마다 이전 요청은 취소

```typescript
// pages/post-list/post-list.component.ts
this.userIdControl.valueChanges.pipe(
  startWith(''),
  debounceTime(300),
  distinctUntilChanged(),
  tap(() => { this.loading = true; this.errorMessage = ''; }),
  switchMap((userId) =>
    this.postService.getPosts(userId).pipe(
      catchError(() => { this.errorMessage = '게시글을 불러오지 못했습니다.'; return of<Post[]>([]); }),
    ),
  ),
).subscribe((posts) => { this.posts = posts; this.loading = false; });
```

`FormControl.valueChanges` 자체가 **Observable**입니다(input 값이 바뀔 때마다 새 값을 방출하는 스트림). 여기에 연산자를 체이닝합니다.

| 연산자 | 역할 | React(Promise)로 하려면 |
|---|---|---|
| `startWith('')` | 구독 시작 즉시 빈 문자열 1회 방출(초기 로딩 트리거) | `useEffect(..., [])`로 마운트 시 1회 별도 처리 |
| `debounceTime(300)` | 입력이 300ms 동안 멈춰야 다음 단계로 통과 | `setTimeout` + `clearTimeout`을 직접 관리 |
| `distinctUntilChanged()` | 이전 값과 같으면 무시 | 이전 값을 별도 변수에 저장해 직접 비교 |
| `tap(...)` | 값을 변경하지 않고 부수효과만 실행(로딩 상태 켜기) | 그냥 코드 중간에 `setLoading(true)` 호출 |
| **`switchMap`** | 새 값이 들어오면 **이전 내부 Observable(진행 중이던 HTTP 요청)을 취소**하고 새 요청으로 전환 | 요청마다 취소 토큰(`AbortController`)을 직접 만들어 관리 |
| `catchError` | 에러를 잡아서 대체 값(`of([])`)으로 스트림을 이어감 | `.catch()` 또는 `try/catch` |

**`switchMap`이 이 커리큘럼에서 가장 중요한 연산자입니다.** "사용자가 검색창에 빠르게 여러 글자를 입력했을 때, 먼저 보낸 요청의 응답이 나중에 도착해서 화면이 엉뚱한 결과로 덮어써지는 버그"(race condition)를 연산자 하나로 막아줍니다. React+axios로 같은 걸 구현하려면 각 요청마다 "이 요청이 최신 요청인가"를 직접 추적하는 코드가 필요합니다.

## 4. 로딩 / 에러 / 빈 상태 패턴

React study7에서 만들었던 "로딩 중.../에러 발생/데이터 없음" 패턴을 Angular의 `@if`/`@else if` 체인으로 그대로 재현합니다.

```html
@if (loading) {
  <p>불러오는 중...</p>
} @else if (errorMessage) {
  <p class="error-text">{{ errorMessage }}</p>
} @else if (posts.length === 0) {
  <p>게시글이 없습니다.</p>
} @else {
  <ul class="fruit-list">
    @for (post of posts; track post.id) {
      <li class="fruit-card"><a [routerLink]="['/posts', post.id]">{{ post.title }}</a></li>
    }
  </ul>
}
```

세 가지 상태(`loading`, `errorMessage`, 빈 배열)를 항상 화면에 명시적으로 표현하는 습관은 프레임워크와 무관하게 실무에서 중요합니다(study0 9절).

## 5. 게시글 상세 페이지

`PostDetailPageComponent`는 study5~6에서 배운 라우트 파라미터 읽기(`ActivatedRoute`)와 이번 문서의 `HttpClient`/`catchError`를 조합합니다.

```typescript
ngOnInit() {
  const id = Number(this.route.snapshot.paramMap.get('id'));
  this.postService.getPost(id).pipe(
    catchError(() => { this.errorMessage = '게시글을 찾을 수 없습니다.'; return of(null); }),
  ).subscribe((post) => { this.post = post; this.loading = false; });
}
```

## 6. 백엔드 연동 기록

아직 자체 백엔드는 없습니다. React 커리큘럼과 동일하게 JSONPlaceholder(공개 목업 API, `https://jsonplaceholder.typicode.com`)로 실습했습니다. CORS 개념 정리와 실제 백엔드 연동은 study10에서 다룹니다.
