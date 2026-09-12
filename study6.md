# study6 (고급1) — Router 중첩 라우팅 + Route Guard

## 1. 중첩 라우팅 — `children`

`/fruits/:id`(개요)와 `/fruits/:id/reviews`(리뷰)처럼, 같은 부모 화면(과일 이름, 탭 메뉴) 아래에서 내용만 바뀌는 구조를 **중첩 라우팅**이라고 합니다.

```typescript
// app.routes.ts
{
  path: 'fruits/:id',
  component: FruitDetailLayoutComponent,
  children: [
    { path: '', component: FruitOverviewComponent },      // /fruits/1
    { path: 'reviews', component: FruitReviewsComponent }, // /fruits/1/reviews
  ],
},
```

`FruitDetailLayoutComponent`는 공통 레이아웃(과일 이름, 탭 네비게이션)만 그리고, 실제 탭 내용은 **자신의 템플릿 안에 있는 또 다른 `<router-outlet>`**에 자식 라우트가 그려지도록 합니다.

```html
<!-- fruit-detail-layout.component.html -->
<nav class="actions">
  <a [routerLink]="['/fruits', fruitId]" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="active-link">개요</a>
  <a [routerLink]="['/fruits', fruitId, 'reviews']" routerLinkActive="active-link">리뷰</a>
</nav>

<router-outlet />  <!-- 자식 라우트(개요/리뷰)가 여기 그려짐 -->
```

React Router의 `<Route path=":id" element={<Layout />}><Route index element={...} /><Route path="reviews" element={...} /></Route>` 구조와 개념이 완전히 동일합니다 — 부모 라우트 엘리먼트 안에 `<Outlet />`을 두고, 그 자리에 자식 라우트가 그려지는 방식입니다. Angular는 `<Outlet />` 대신 `<router-outlet />`을 쓰고, 부모 라우트를 여러 개 중첩할 때마다 `<router-outlet>`도 그만큼 중첩해서 배치합니다.

## 2. 자식 라우트에서 부모 라우트의 파라미터 읽기

`FruitOverviewComponent`의 라우트(`''`)에는 `:id`가 없습니다. `:id`는 부모 라우트(`fruits/:id`)에 있으므로, `ActivatedRoute.parent`로 한 단계 올라가서 읽어야 합니다.

```typescript
// fruit-overview.component.ts
private route = inject(ActivatedRoute);
fruitId = Number(this.route.parent?.snapshot.paramMap.get('id'));
```

React Router는 `useParams()`가 매칭된 전체 URL 트리에서 파라미터를 한 번에 모아 반환하므로 이런 "부모로 거슬러 올라가기"가 필요 없습니다. Angular Router는 라우트 계층을 트리 그대로 유지하기 때문에(`route.parent`, `route.parent.parent`, ...) 계층 구조를 명시적으로 인지하고 있어야 합니다 — 대신 각 라우트가 정확히 어떤 데이터에 접근 가능한지가 더 명확합니다.

## 3. Route Guard — React의 `<ProtectedRoute>`를 함수로

React에서는 "로그인 안 했으면 `<Navigate to="/login" />`를 렌더링"하는 **컴포넌트**(`ProtectedRoute`)로 보호된 라우트를 구현했습니다. Angular는 라우트 진입 자체를 판단하는 **함수(Guard)**를 라우트 설정에 등록합니다.

```typescript
// guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }
  return router.parseUrl('/login');   // UrlTree를 반환하면 그 주소로 리다이렉트
};
```

```typescript
// app.routes.ts
{ path: 'mypage', component: MyPageComponent, canActivate: [authGuard] },
```

- `CanActivateFn`: Angular 15+ 에서 나온 **함수형 가드**. 이전 버전은 `class AuthGuard implements CanActivate`처럼 클래스로 만들어야 했습니다(주입 방식은 같지만 보일러플레이트가 더 많았습니다).
- 반환값이 `true`면 진입 허용, `false`면 그냥 막힘, **`UrlTree`(다른 주소)를 반환하면 그 주소로 리다이렉트**됩니다. React의 `<Navigate to="/login" />`이 하던 일을 반환값으로 표현한 것입니다.
- `inject()`로 `AuthService`, `Router`를 함수 내부에서 바로 주입받습니다(study5 4절에서 본 함수형 DI 패턴).

## 4. 임시 `AuthService`와 study8의 관계

이번 문서의 `AuthService`는 로그인 여부(`boolean`)만 기억하는 **최소 버전**입니다.

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private loggedIn = signal(false);
  isLoggedIn = this.loggedIn.asReadonly();
  login() { this.loggedIn.set(true); }
  logout() { this.loggedIn.set(false); }
}
```

지금은 로그인 버튼을 누르면 실제 자격 검증 없이 바로 `true`가 됩니다 — 이번 문서의 목표가 "가드가 라우트 진입을 어떻게 막고 리다이렉트하는지" 그 배관(plumbing)을 이해하는 것이기 때문입니다. **실제 사용자 정보를 담고, 폼과 연결하는 것은 study8(DI 심화 + 전역 상태 관리)에서 이 서비스를 그대로 확장**합니다. React 커리큘럼의 "study6: 우선 단순한 값으로 ProtectedRoute 동작 확인 → study8: Context API로 진짜 로그인 상태 관리"와 같은 순서입니다.

## 5. 실습 결과

- `/login`에서 버튼을 누르면 `authService.login()` 호출 후 `/mypage`로 이동
- 로그인하지 않고 `/mypage`에 직접 접근하면 가드가 `/login`으로 돌려보냄
- `/mypage`의 로그아웃 버튼을 누르면 다시 `/login`으로 이동하고, 이후 `/mypage` 접근이 다시 막힘
