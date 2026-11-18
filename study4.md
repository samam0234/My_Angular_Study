# study4 — 라우팅·요청 처리

> 🎯 **목표**: URL을 컴포넌트에 연결하고, 주소 매개변수와 중첩 라우트, 가드가 요청 흐름 어디에 끼는지 본다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`demo/src/app/app.routes.ts`](./demo/src/app/app.routes.ts), [`project/src/app/app.routes.ts`](./project/src/app/app.routes.ts), [`project/src/app/core/auth/auth.guard.ts`](./project/src/app/core/auth/auth.guard.ts)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular Router는 브라우저 주소와 컴포넌트를 짝짓는다. 서버에 HTML을 다시 요청하지 않고, `<router-outlet>` 자리를 해당 컴포넌트로 바꾼다.

흐름은 이렇다.

1. 사용자가 `/posts/3`으로 이동한다.
2. `provideRouter(routes)`가 라우트 표를 갖고 있다.
3. `path: 'posts/:id'`가 맞고, `PostDetailPageComponent`가 아웃렛에 생성된다.
4. 컴포넌트는 `ActivatedRoute`에서 `id`를 읽어 HTTP로 그 글을 요청한다.
5. 응답이 오면 템플릿이 제목과 댓글을 그린다.

`canActivate` 가드는 컴포넌트를 만들기 전에 통과 여부를 본다. 실패하면 `UrlTree`를 반환해 다른 주소로 보낸다. `false`만 반환하면 이동이 취소되고 사용자는 원래 화면에 남는다. 로그인 화면으로 보내려면 `UrlTree`가 맞다.

중첩 라우트는 부모 컴포넌트 안에 또 아웃렛이 있는 구조다. 과일 상세는 개요와 리뷰가 같은 레이아웃을 공유한다.

`routerLink`는 클릭으로 그 주소를 연다. `routerLinkActive`는 현재 주소와 같을 때 클래스를 붙인다. 홈처럼 정확히 일치해야 하는 링크는 `{ exact: true }`가 필요하다. 안 그러면 `/posts/1`에서도 `/` 링크가 켜질 수 있다.

---

## 🛠️ 실기

### 1. 연습 앱의 라우트 표

`demo/src/app/app.routes.ts`의 일부다.

```ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'fruits', component: FruitCatalogPageComponent },
  {
    path: 'fruits/:id',
    component: FruitDetailLayoutComponent,
    children: [
      { path: '', component: FruitOverviewComponent },
      { path: 'reviews', component: FruitReviewsComponent },
    ],
  },
  { path: 'mypage', component: MyPageComponent, canActivate: [authGuard] },
  { path: 'posts/:id', component: PostDetailPageComponent },
];
```

1. 빈 경로는 홈이다.
2. `/fruits`는 카탈로그다.
3. `/fruits/2`의 `2`는 `:id`다. 부모는 레이아웃만 그린다.
4. 자식의 빈 경로는 `/fruits/2` 본문(개요)이다.
5. `/fruits/2/reviews`는 같은 레이아웃의 리뷰 아웃렛이다.
6. `/mypage`는 가드를 통과해야 컴포넌트가 생긴다.
7. `/posts/10`은 상세 컴포넌트다. `:id`라는 이름만 같고 과일 id와는 별개의 라우트다.

`app.config.ts`의 `provideRouter(routes)`가 이 표를 앱에 등록한다.

### 2. 게시판 라우트

`project/src/app/app.routes.ts`

```ts
export const routes:Routes = [
  { path: '', component: PostListPageComponent },
  {
    path: 'posts/:id',
    loadComponent: () =>
      import('./features/posts/post-detail-page/post-detail-page.component').then(
        (module) => module.PostDetailPageComponent,
      ),
  },
  { path: 'login', component: LoginPageComponent },
  { path: 'mypage', component: MyPageComponent, canActivate: [authGuard] },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/auth/admin-page/admin-page.component').then((module) => module.AdminPageComponent),
  },
  {
    path: 'lab',
    loadComponent: () => import('./features/lab/lab-page.component').then((module) => module.LabPageComponent),
  },
];
```

1. `/`는 목록이고 상세는 주소에 id를 받는다.
2. 로그인 화면은 공개다.
3. `/mypage`는 authGuard, `/admin`은 authGuard와 adminGuard를 거친다.
4. 상세·관리자·실습실은 loadComponent로 지연 로딩한다.
5. 관리자 컴포넌트는 서버 `/api/admin/status`도 호출한다. 가드만으로 API 권한을 대신하지 않는다.

### 3. 가드와 returnUrl

`project/src/app/core/auth/auth.guard.ts`

```ts
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    return true;
  }

  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
```

1. 함수형 가드다. 클래스의 `canActivate` 메서드와 같은 자리다.
2. `_route`는 이번엔 안 쓴다. `state.url`이 사용자가 가려던 주소다.
3. 가드 함수 안에서도 `inject`로 서비스와 라우터를 받는다.
4. 로그인되어 있으면 라우트를 허용한다.
5. 아니면 컴포넌트를 만들지 않는다.
6. `/login?returnUrl=/mypage` 형태의 주소 트리를 반환한다.

로그인 성공 뒤의 복귀는 study7에서 `queryParamMap`으로 읽는다.

상세 화면은 `Number(this.route.snapshot.paramMap.get('id'))`로 id를 한 번 읽는다. 같은 컴포넌트 인스턴스에서 id만 바뀌는 링크를 쓰면 `snapshot`은 옛 값에 남을 수 있다. 그때는 `paramMap`을 구독한다. 이 게시판의 상세는 목록으로 나갔다가 다시 들어오므로 인스턴스가 새로 생긴다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 주소는 바뀌는데 화면이 그대로 | 템플릿에 `<router-outlet>`이 없음 | 루트 또는 레이아웃에 아웃렛을 둔다 |
| 새로고침하면 서버가 404 | 배포 서버가 `index.html`로 돌려주지 않음 | study17의 nginx `try_files` |
| `/` 메뉴가 모든 페이지에서 켜짐 | `routerLinkActive`가 접두사로 일치 | 홈만 `{ exact: true }` |
| 가드가 있어도 마이페이지가 열림 | `canActivate`를 라우트에 안 넣음 | `canActivate: [authGuard]` |
| 상세 id가 `NaN` | `paramMap.get('id')`가 `null` | 라우트 경로의 `:id` 이름을 확인 |
| 자식 라우트가 안 보임 | 부모 템플릿에 두 번째 아웃렛이 없음 | 레이아웃 컴포넌트에 `<router-outlet>` |

---

## ☐ 체크리스트

- ☑ 라우팅 + 가드
- ☑ 목록, 상세, 로그인, 마이페이지, 실습실의 경로를 표로 말할 수 있다
- ☑ `:id`를 `ActivatedRoute`에서 읽는 코드를 찾을 수 있다
- ☑ 중첩 라우트에서 부모 레이아웃과 자식 아웃렛을 구분한다
- ☑ 가드가 `true`와 `UrlTree` 중 무엇을 반환하는지 안다
- ☑ `returnUrl`에 원래 주소가 실리는 이유를 설명할 수 있다

## ➡️ 다음 단계 연결

[study5](./study5.md)에서 로그인 폼의 입력, 검증, 오류 문장을 만든다. 가드를 통과한 뒤의 로그인 처리 자체는 study7이다.
