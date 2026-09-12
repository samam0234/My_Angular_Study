# study5 — Angular Router 기본 라우팅 (목록 → 상세)

## 1. 라우트 등록

React의 `<Routes><Route path="..." element={...} /></Routes>`(JSX 안에서 선언)와 달리, Angular는 **배열 하나(`routes.ts`)**로 라우트 테이블을 선언합니다.

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'fruits', component: FruitCatalogPageComponent },
  { path: 'fruits/:id', component: FruitDetailPageComponent },
];
```

이 배열은 `app.config.ts`의 `provideRouter(routes)`로 앱에 등록됩니다(study1 2절). React의 `<BrowserRouter>`가 하던 역할을 `provideRouter`가 대신합니다.

## 2. `RouterOutlet` — React의 `<Routes>`가 그려지는 자리

```html
<!-- app.component.html -->
<router-outlet />
```

현재 URL과 일치하는 라우트의 컴포넌트가 이 자리에 그려집니다. React의 `<Routes>{...}</Routes>` 블록이 실제로 렌더링되는 위치에 대응합니다.

## 3. `RouterLink` — `<Link>`에 대응

```html
<a routerLink="/fruits" routerLinkActive="active-link">과일 카탈로그</a>
<a [routerLinkActiveOptions]="{ exact: true }" routerLink="/" routerLinkActive="active-link">홈</a>
```

| React Router | Angular Router |
|---|---|
| `<Link to="/fruits">` | `<a routerLink="/fruits">` |
| `useNavigate()` | `Router.navigate([...])` (서비스 주입 후 호출) |
| `NavLink`의 `isActive` 자동 클래스 | `routerLinkActive="active-link"` (문자열로 클래스명 지정) |
| 정확히 일치할 때만 활성화하려면 `end` prop | `[routerLinkActiveOptions]="{ exact: true }"` |

일반 HTML `<a href="...">`을 그대로 쓰면 브라우저가 페이지를 통째로 새로고침합니다. `routerLink` 디렉티브를 붙여야 Angular Router가 클릭을 가로채 **SPA 방식으로 화면만 교체**합니다.

## 4. 동적 라우트 파라미터 — `ActivatedRoute`

```html
<!-- 목록: fruits/:id 로 이동하는 링크 -->
<a [routerLink]="['/fruits', fruit.id]">상세보기</a>
```

```typescript
// 상세 페이지
export class FruitDetailPageComponent {
  private route = inject(ActivatedRoute);
  fruitId = Number(this.route.snapshot.paramMap.get('id'));
  fruit = FRUIT_CATALOG.find((f) => f.id === this.fruitId);
}
```

- `inject(ActivatedRoute)`: `constructor(private route: ActivatedRoute)`와 동일한 DI 방식을, 함수형으로 쓸 수 있게 해주는 최신 문법(`inject()` 함수, Angular 14+). study0 6절의 DI가 라우트 정보를 가져올 때도 똑같이 쓰입니다.
- `route.snapshot.paramMap.get('id')`: React Router의 `useParams()`가 반환하는 `{ id }` 객체에서 `id`를 꺼내는 것과 동일한 목적입니다. `snapshot`은 "이 컴포넌트가 생성된 시점의 값을 1회성으로 읽기"라는 뜻으로, 같은 컴포넌트를 재사용한 채 파라미터만 바뀌는 경우(`/fruits/1` → `/fruits/2`로 이동해도 컴포넌트가 재생성되지 않는 경우)에는 값이 갱신되지 않습니다. 그런 경우를 위한 옵저버블 방식(`route.paramMap`을 구독)은 study7에서 RxJS를 배운 뒤 자연스럽게 다룹니다.

## 5. 실습 결과

`/` (홈), `/fruits`(카탈로그 목록), `/fruits/1`처럼 숫자 id가 붙은 상세 페이지 세 종류의 URL이 동작합니다. 상단 네비게이션에서 현재 위치한 링크에는 `active-link` 클래스가 자동으로 붙어 스타일이 강조됩니다.
