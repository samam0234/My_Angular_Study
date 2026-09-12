# study10 (고급5) — HTTP 인터셉터로 JWT 자동 첨부, 기업형 폴더 구조, CORS

## 1. HTTP 인터셉터 — 모든 요청을 가로채기

로그인 후 발급받은 토큰을 API 요청마다 일일이 헤더에 넣어주는 대신, **모든 HTTP 요청을 가로채(intercept) 자동으로 처리**하는 것이 인터셉터입니다.

```typescript
// core/auth/jwt.interceptor.ts
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(JWT_STORAGE_KEY);
  if (!token) return next(req);

  const authorizedReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return next(authorizedReq);
};
```

- `HttpInterceptorFn`: Angular 15+ 함수형 인터셉터(study6의 함수형 가드와 같은 흐름). 이전 버전은 클래스로 `HttpInterceptor` 인터페이스를 구현해야 했습니다.
- `req.clone({ setHeaders: {...} })`: `HttpRequest`는 **불변(immutable) 객체**라서 직접 `req.headers.set(...)`처럼 수정할 수 없습니다. 항상 `clone()`으로 값이 바뀐 새 요청 객체를 만들어야 합니다.
- `next(req)`: 다음 인터셉터(또는 실제 네트워크 요청)로 넘기는 함수. React+axios의 `axios.interceptors.request.use(config => {...; return config})`와 목적이 완전히 같습니다.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),   // 등록
  ],
};
```

`withInterceptors([...])`에 등록한 인터셉터는 `HttpClient`로 나가는 **모든 요청**(이 데모에서는 `PostService`의 모든 호출)에 자동 적용됩니다. `PostService` 코드는 인터셉터의 존재를 전혀 몰라도 됩니다 — 관심사 분리(study0 6절 DI의 장점과 같은 맥락)입니다.

### JWT를 어디서 만드는가

이 저장소는 아직 자체 백엔드가 없으므로, `AuthService.login()`에서 **흉내만 낸 토큰 문자열**을 `localStorage`에 저장합니다.

```typescript
// core/auth/auth.service.ts
login(username: string) {
  this.currentUserSubject.next({ username });
  localStorage.setItem(JWT_STORAGE_KEY, btoa(`fake-jwt.${username}.${Date.now()}`));
}
```

실제 서버 연동 시에는 로그인 API 응답에 들어있는 진짜 JWT를 여기 저장하면 됩니다 — 인터셉터/가드 코드는 수정할 필요가 없습니다.

## 2. `environment` 설정

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://jsonplaceholder.typicode.com',
};
```

```typescript
// services/post.service.ts
import { environment } from '../../environments/environment';
const BASE_URL = `${environment.apiBaseUrl}/posts`;
```

React/Vite 프로젝트의 `.env` + `import.meta.env.VITE_API_URL`에 대응하는 Angular 공식 방식입니다. 실제 기업형 프로젝트에서는 `ng generate environments` 명령으로 `environment.ts`(개발용)와 `environment.production.ts`(배포용)를 따로 만들고, `angular.json`의 `fileReplacements` 설정으로 `ng build --configuration production` 실행 시 자동으로 파일을 바꿔치기합니다. 이 저장소는 학습 목적상 파일 하나만 두고 값 구조만 보여줍니다.

## 3. 기업형 폴더 구조 — `core` / `shared` / `pages`

study0 9절에서 미리 본 구조를 실제로 적용했습니다.

```
src/app/
├─ core/
│  └─ auth/
│     ├─ auth.service.ts       # 전역 로그인 상태 (study8)
│     ├─ auth.guard.ts          # 보호된 라우트 (study6)
│     └─ jwt.interceptor.ts     # 이번 문서
├─ shared/
│  ├─ fruit-card/               # 여러 곳에서 재사용하는 순수 UI
│  └─ fruit-badge/
├─ services/                    # 화면(페이지) 단위 데이터 fetch 로직
│  ├─ post.service.ts
│  ├─ favorites.service.ts
│  └─ fruit-inventory.service.ts
├─ pages/                       # 라우트 하나당 화면 하나
├─ components/                  # study 실습 전용 컴포넌트 (홈 화면 누적용)
├─ guards/, environments/, models/, data/
├─ app.routes.ts
└─ app.config.ts
```

| 폴더 | 기준 |
|---|---|
| `core/` | 앱 전체에서 **하나만 존재**해야 하는 것 (인증, 인터셉터, 가드). 다른 feature가 이 폴더에 의존하는 건 괜찮지만, 반대로 `core/`가 특정 feature를 알아서는 안 됨 |
| `shared/` | 여러 feature가 그대로 재사용하는 **순수 UI 컴포넌트** (자체 상태 없이 `@Input`/`@Output`만 가짐) |
| `pages/` + `services/` | 라우트(화면) 단위 기능. React의 `pages/` + `hooks/`(또는 `api/`)에 대응 |

`studyFinal`의 `project/`는 이 구조를 **처음부터** 적용해서 새로 만듭니다(지금 `demo/`는 study1부터 누적돼 온 실습 잔재가 섞여 있어 완전히 이상적인 구조는 아닙니다 — 실무에서도 신규 프로젝트가 아니면 완벽한 구조 이전이 항상 쉬운 것은 아니라는 점 자체가 교훈입니다).

> **React와 비교할 포인트 ① 폴더 구조가 강제되는 정도 (study0 4절 복습, 최종 정리)**
> React는 `ng generate`에 대응하는 공식 스캐폴딩 도구가 없어서 폴더 구조가 팀마다 다릅니다. Angular는 `ng generate component/service/guard`가 파일명 규칙을 강제하고, `core/shared/features` 관례도 공식 스타일 가이드에서 오랫동안 권장돼 온 것이라 프로젝트 간 구조 편차가 작습니다.

## 4. CORS — Angular 관점에서 재정리

React study10에서 정리한 CORS 개념(Origin, preflight, `Access-Control-Allow-Origin`)은 Angular에서도 동일하게 적용됩니다. Angular 관점에서 추가로 알아둘 것:

- **자격 증명(쿠키) 포함 요청**: axios의 `withCredentials: true`에 대응하는 옵션은 `HttpClient`의 요청 옵션 `{ withCredentials: true }`입니다. 쿠키 기반 인증(세션 쿠키)을 쓴다면 인터셉터가 아니라 이 옵션으로 처리합니다. 이 데모는 JWT를 헤더로 보내는 방식(Bearer 토큰)이라 쿠키 옵션은 쓰지 않았습니다.
- **개발 중 프록시 우회**: Angular CLI는 `proxy.conf.json` 파일 하나로 `ng serve`가 백엔드로 요청을 대신 전달해주는 프록시를 지원합니다(Vite의 `server.proxy` 옵션과 동일한 목적). 예:
  ```json
  { "/api": { "target": "http://localhost:8080", "secure": false } }
  ```
  `ng serve --proxy-config proxy.conf.json`으로 실행하면, 프론트가 `/api/...`로 보낸 요청을 개발 서버가 백엔드로 중계해 CORS 문제 자체를 개발 중엔 우회할 수 있습니다.
- **인터셉터와 CORS는 무관**: 인터셉터는 브라우저가 요청을 "보내기 전" 헤더를 조작하는 것이고, CORS는 브라우저가 응답을 받은 뒤 "이 응답을 JS에 노출해도 되는지" 서버 헤더를 보고 판단하는 것입니다. 인터셉터로 CORS 에러 자체를 해결할 수는 없고, 반드시 백엔드(또는 개발 중엔 프록시)에서 처리해야 합니다.

## 5. 다음 단계

여기까지가 `demo/` 프로젝트의 마지막 실습입니다. `studyFinal`에서는 지금까지 배운 모든 개념(컴포넌트, DI, Router+Guard, Reactive Forms, HttpClient+RxJS, 전역 상태, 인터셉터)을 조합해 React로 만들었던 게시판+로그인 미니 웹사이트를 `project/`에 Angular로 재구현합니다.
