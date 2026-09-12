# study8 (고급3) — DI 심화, 서비스 + BehaviorSubject로 전역 로그인 상태 관리

## 1. `AuthService`를 진짜 전역 상태로 업그레이드

study6에서 만든 `AuthService`는 `boolean` 하나만 가진 임시 버전이었습니다. 이번에는 **누가 로그인했는지(사용자 정보)까지 앱 전체가 공유**하도록 `BehaviorSubject`로 다시 만듭니다.

```typescript
// services/auth.service.ts
export interface AuthUser {
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  login(username: string) {
    this.currentUserSubject.next({ username });
  }

  logout() {
    this.currentUserSubject.next(null);
  }
}
```

### `BehaviorSubject`란?

RxJS의 `Subject`는 "값을 흘려보내는 파이프"입니다. 일반 `Subject`는 **구독 시점 이후에 흘러온 값만** 받을 수 있지만, `BehaviorSubject`는 **항상 "현재 값"을 기억**하고 있다가 새로 구독하는 쪽에게 즉시 그 값부터 알려줍니다(study9에서 `Subject` 종류를 더 자세히 비교합니다).

> **React와 비교할 포인트 ② 서비스 계층을 어디에 둘지 (study0 6절 복습, 실전 적용)**
> React의 Context API는 `<AuthProvider>`로 컴포넌트 트리를 감싸야 하위 컴포넌트들이 값을 쓸 수 있었고, Zustand는 스토어 파일을 직접 `import`해서 썼습니다. Angular는 `@Injectable({ providedIn: 'root' })` 하나로 끝입니다 — **Provider로 감쌀 필요도 없이**, `AuthService`를 주입받는 모든 컴포넌트가 자동으로 같은 인스턴스(=같은 상태)를 공유합니다. DI 컨테이너가 "이 서비스는 앱에 하나만 존재한다"는 것을 보장해주기 때문입니다.

## 2. `async` 파이프 — Observable을 템플릿에서 구독하기

컴포넌트 클래스에서 `.subscribe()`를 직접 호출하고 필드에 대입할 수도 있지만, 그러면 `ngOnDestroy`에서 구독 해제(`unsubscribe`)를 직접 챙겨야 합니다. Angular는 이를 대신해주는 **`async` 파이프**를 제공합니다.

```html
<!-- my-page.component.html -->
@if (currentUser$ | async; as user) {
  <p><strong>{{ user.username }}</strong>님, 환영합니다.</p>
}
```

```typescript
currentUser$ = this.authService.currentUser$;
```

- `currentUser$ | async`: Observable을 구독해서 최신 값을 꺼내주고, **컴포넌트가 파괴될 때 자동으로 구독 해제**까지 해줍니다.
- `; as user`: `@if` 블록의 문법으로, 파이프 결과에 `user`라는 이름을 붙여 블록 안에서 재사용합니다(값을 두 번 구독하지 않기 위한 관례).
- 이름 끝에 `$`를 붙이는 것(`currentUser$`)은 Angular/RxJS 커뮤니티의 관례로 "이 변수는 Observable이다"라는 표시입니다(문법적 의미는 없음).

React라면 `useContext(AuthContext)`로 값을 즉시 꺼내 썼겠지만, Angular는 "구독"이라는 한 단계가 더 있습니다. 대신 `async` 파이프 덕분에 구독/해제 관리 코드를 직접 쓸 필요가 없습니다.

## 3. 로그인 폼과 서비스 연결

```typescript
// pages/login/login.component.ts
onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }
  this.authService.login(this.form.getRawValue().username);
  this.router.navigateByUrl('/mypage');
}
```

study4에서 연습한 Reactive Forms(`FormGroup`, `Validators`)를 이번엔 로컬 `@Output` 대신 **전역 서비스 호출**과 연결했습니다. 로그인에 성공하면 `AuthService.login()`이 `BehaviorSubject`에 새 값을 흘려보내고, 그 값을 구독 중인 모든 컴포넌트(헤더의 `AuthStatus`, `MyPage`)가 동시에 갱신됩니다.

## 4. `AuthStatus` 컴포넌트 — 여러 곳에서 같은 상태 구독

```typescript
// components/auth-status/auth-status.component.ts
export class AuthStatusComponent {
  private authService = inject(AuthService);
  currentUser$ = this.authService.currentUser$;
}
```

헤더의 `AuthStatus`와 `/mypage`의 인사말은 **서로 다른 컴포넌트**지만 같은 `AuthService` 인스턴스(싱글턴)를 주입받으므로, 로그인/로그아웃 즉시 두 곳 모두 갱신됩니다. Provider 트리 없이 "주입만 받으면 자동으로 같은 상태"라는 게 이번 문서에서 가장 체감해야 할 부분입니다.

## 5. Guard도 자연스럽게 갱신됨

study6의 `authGuard`는 `authService.isLoggedIn`(getter)만 확인하도록 한 줄만 바꿨습니다. `BehaviorSubject`의 현재 값(`.value`)을 기반으로 하는 getter라서, 로그인 상태가 바뀌어도 가드 로직은 손댈 필요가 없었습니다 — 서비스 뒤에 구현을 숨기고 "로그인 여부"라는 인터페이스만 노출한 덕분입니다(DI가 주는 관심사 분리).
