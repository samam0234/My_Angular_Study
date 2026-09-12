# studyFinal — React 게시판+로그인 프로젝트를 Angular로 재구현

Notion 학습 목표의 "예제: React 게시판 + 로그인을 Angular로 재구현"에 대응하는 문서입니다. [React 프로젝트](../react/project/)에서 만들었던 미니 게시판(로그인, 즐겨찾기, 페이지네이션, 보호된 라우트)을 `project/`에 **처음부터 Angular 방식으로 새로 설계**해서 만들었습니다.

## 1. 폴더 구조 — study10에서 예고한 구조를 처음부터 적용

```
project/src/app/
├─ core/
│  └─ auth/
│     ├─ auth.service.ts        # 전역 로그인 상태 (BehaviorSubject<User | null>)
│     ├─ auth.guard.ts           # /mypage 보호 + returnUrl 리다이렉트
│     └─ jwt.interceptor.ts      # 모든 HTTP 요청에 토큰 자동 첨부
├─ shared/
│  └─ post-card/                 # 목록에서 재사용하는 순수 UI 컴포넌트
├─ features/
│  ├─ posts/
│  │  ├─ post.service.ts         # 페이지네이션 + forkJoin(게시글+댓글 병렬 요청)
│  │  ├─ favorites.service.ts    # 즐겨찾기 전역 상태
│  │  ├─ post-list-page/
│  │  └─ post-detail-page/
│  └─ auth/
│     ├─ login-page/
│     └─ my-page/
├─ components/
│  └─ app-header/                # 모든 페이지 상단에 고정되는 헤더
├─ models/
├─ app.routes.ts
└─ app.config.ts
```

`demo/`는 study1부터 실습이 누적되며 자연스럽게 만들어진 구조였다면, `project/`는 study10에서 정리한 `core`/`shared`/`features` 기준을 **설계 단계에서부터** 적용했습니다.

## 2. 화면 구성 (React 프로젝트와 1:1 대응)

| 라우트 | 컴포넌트 | 대응하는 React 컴포넌트 |
|---|---|---|
| `/` | `PostListPageComponent` | `PostListPage` |
| `/posts/:id` | `PostDetailPageComponent` | `PostDetailPage` |
| `/login` | `LoginPageComponent` | `LoginPage` |
| `/mypage` (보호됨) | `MyPageComponent` | `MyPage` |
| (모든 페이지 상단) | `AppHeaderComponent` | `AppHeader` |
| (게시글 카드) | `PostCardComponent` | `PostCard` |

## 3. 로그인 — 검증 규칙과 리다이렉트 기억

React 버전은 "이메일에 `@` 포함 + 비밀번호 8자 이상"이면 로그인 처리했습니다. Angular는 Reactive Forms의 내장 검증기로 표현합니다.

```typescript
form = this.fb.nonNullable.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});
```

React 버전은 `useNavigate()`의 `location.state.from`으로 "로그인 전에 가려던 페이지"를 기억했습니다(비로그인 상태로 `/mypage` 접근 → `ProtectedRoute`가 `<Navigate to="/login" state={{ from: location }} />`). Angular는 **쿼리 파라미터**로 같은 걸 구현합니다.

```typescript
// core/auth/auth.guard.ts
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn) return true;
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

```typescript
// features/auth/login-page/login-page.component.ts
onSubmit() {
  // ...
  this.authService.login(this.form.getRawValue().email);
  const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
  this.router.navigateByUrl(returnUrl);
}
```

`CanActivateFn`의 두 번째 인자 `state: RouterStateSnapshot`이 "지금 가려던 주소"(`state.url`)를 담고 있어서, React의 `location.state`처럼 별도 상태 전달 없이 URL 자체에 목적지를 실어 보낼 수 있습니다.

## 4. 페이지네이션 + 검색 + 즐겨찾기 — 하나의 스트림으로 결합

React 버전은 `page`/`keyword`/`showOnlyFavorites` 세 개의 `useState`와, `useFetch`가 반환한 `posts`를 렌더링 시점에 직접 필터링했습니다. Angular 버전은 이 네 가지 입력을 **하나의 `combineLatest` 파이프라인**으로 합칩니다.

```typescript
viewModel$ = combineLatest([
  this.rawPosts$,                                              // page가 바뀌면 새로 fetch (switchMap)
  this.favoritesService.favoriteIds$,                          // 즐겨찾기 토글 시 즉시 반영
  this.keywordControl.valueChanges.pipe(startWith('')),        // 검색어 입력마다
  this.showFavoritesOnlySubject,                                // "즐겨찾기만 보기" 토글마다
]).pipe(
  map(([posts, favoriteIds, keyword, favoritesOnly]) => ({
    rawCount: posts.length,   // "다음 페이지" 버튼 비활성화 판단용 (필터 적용 전 원본 개수)
    items: posts
      .filter((post) => post.title.includes(keyword.trim()))
      .filter((post) => !favoritesOnly || favoriteIds.has(post.id))
      .map((post) => ({ ...post, isFavorite: favoriteIds.has(post.id) })),
  })),
);
```

네 스트림 중 **어느 하나라도** 바뀌면(페이지 이동, 즐겨찾기 토글, 검색어 입력, 필터 토글) 전체 목록이 자동으로 다시 계산됩니다. React라면 이 네 상태를 각각 관리하며 렌더링마다 파생값을 계산했겠지만, RxJS는 "이 화면은 이 네 가지 소스의 조합이다"라는 관계 자체를 코드로 표현합니다.

## 5. 병렬 요청 — `Promise.all` → `forkJoin`

React 버전은 게시글 상세 화면에서 본문과 댓글을 동시에 요청했습니다.

```typescript
// React
const [postRes, commentsRes] = await Promise.all([
  apiClient.get<Post>(`/posts/${id}`),
  apiClient.get<Comment[]>(`/posts/${id}/comments`),
])
```

RxJS의 대응 연산자는 `forkJoin`입니다.

```typescript
// Angular
getPostDetail(id: number): Observable<PostDetail> {
  return forkJoin([
    this.http.get<Post>(`${BASE_URL}/${id}`),
    this.http.get<PostComment[]>(`${BASE_URL}/${id}/comments`),
  ]).pipe(map(([post, comments]) => ({ post, comments })));
}
```

`forkJoin`은 배열 안의 **모든 Observable이 완료(complete)되어야** 결과를 한 번에 묶어서 내보냅니다. HTTP 요청처럼 "값을 1번만 내고 끝나는" Observable에 한해 `Promise.all`과 동일하게 동작합니다.

## 6. 카드 컴포넌트 — 클릭 버블링 막기

React 버전의 `PostCard`는 카드 전체가 `<Link>`이고, 즐겨찾기 버튼 클릭 시 `event.preventDefault()` + `event.stopPropagation()`으로 페이지 이동을 막았습니다. Angular도 표준 DOM 이벤트 API를 그대로 씁니다 — 프레임워크가 별도 문법을 제공하지 않는 부분입니다.

```typescript
// shared/post-card/post-card.component.ts
onFavoriteClick(event: MouseEvent) {
  event.preventDefault();   // routerLink의 페이지 이동을 막음
  event.stopPropagation();
  this.toggleFavorite.emit(this.post.id);
}
```

## 7. 실행 방법

```bash
cd project
npm install
ng serve
```

- `/` — 게시글 목록(검색, 즐겨찾기 필터, 페이지네이션)
- `/posts/:id` — 게시글 상세 + 댓글 + 즐겨찾기 토글
- `/login` — "테스트 계정 채우기" 버튼으로 빠르게 로그인 가능
- `/mypage` — 로그인 없이 접근 시 `/login?returnUrl=/mypage`로 리다이렉트, 로그인 후 자동으로 `/mypage`로 복귀

## 8. React 버전과 비교해 남은 차이

- **JWT 저장**: 두 버전 모두 실제 백엔드가 없어 흉내만 낸 토큰입니다. React는 별도로 다루지 않았지만, Angular 버전은 인터셉터 실습(study10)을 위해 `AuthService.login()`에서 `localStorage`에 토큰을 저장하고 `jwtInterceptor`가 모든 요청에 자동으로 붙입니다.
- **새로고침 시 상태 유지**: React `studyFinal`과 마찬가지로 Angular 버전도 새로고침하면 로그인/즐겨찾기 상태가 초기화됩니다(`BehaviorSubject`는 메모리에만 존재). `localStorage`/`sessionStorage`와 동기화하는 것은 두 스택 모두 다음 단계 과제로 남겨둡니다.
- **실제 백엔드 연동**: 여전히 JSONPlaceholder(공개 목업 API)를 사용합니다. study10에서 정리한 CORS/프록시 설정은 실제 자체 백엔드가 생기면 적용합니다.
