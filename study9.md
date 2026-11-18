# study9 — 테스트·디버깅

> 🎯 **목표**: Karma로 서비스·가드·인터셉터·파이프를 자동 실행하고, 화면이 조용할 때 어디를 볼지 정한다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`project/src/app/core/auth`](./project/src/app/core/auth), [`project/src/app/features/posts/post.service.spec.ts`](./project/src/app/features/posts/post.service.spec.ts)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

테스트는 브라우저를 손으로 누르기 전에, 규칙이 아직 맞는지 확인하는 실행이다. 이 프로젝트의 실행기는 Karma이고 검증 문장은 Jasmine이다. `ng test`가 `src/**/*.spec.ts`를 Chrome Headless에서 연다.

종류를 이 저장소 기준으로 나누면 다음과 같다.

| 종류 | 무엇을 대체하는가 | 파일 |
|---|---|---|
| 단위 | 클래스 규칙·상태 또는 저장소 | `favorites.service.spec.ts`, `format-instant.pipe.spec.ts` |
| 라우트 규칙 | 가짜 라우터 | `auth.guard.spec.ts` |
| HTTP 통합 | 네트워크 대신 `HttpTestingController` | `jwt.interceptor.spec.ts`, `post.service.spec.ts` |

`HttpTestingController`는 요청이 나갔는지 잡고, `flush`로 응답을 넣어 준다. Angular HTTP 테스트는 실제 네트워크에 의존하지 않는다. 별도의 API 계약 테스트는 실제 ASP.NET Core·SQL Server를 사용한다. `expectOne`은 그 주소의 요청이 정확히 하나여야 한다. `verify()`는 처리하지 않은 요청이 남아 있으면 실패한다.

디버깅 순서도 고정해 두는 편이 빠르다.

1. 터미널의 컴파일 오류. 템플릿 오류는 여기 먼저 나온다.
2. 브라우저 Console의 런타임 오류. `NullInjectorError`는 제공자가 없다는 뜻이다.
3. Network 탭. 상태 코드, 요청의 쿠키·변경 요청 `X-Board-Request`, 응답 헤더의 `X-Request-Id`.
4. Angular DevTools가 있으면 컴포넌트 트리와 변경 감지. 없어도 3번까지로 이 앱의 오류는 대부분 보인다.

자주 만나는 오류는 각 study의 오류 노트에 나눠 적었다. 여기에는 테스트 자체가 실패할 때의 원인만 모은다.

---

## 🛠️ 실기

### 1. 실행

```bash
cd project
npx ng test --watch=false --browsers=ChromeHeadless
```

2026-11-19 실제 API 계약 반영 후 Chrome Headless에서 15개 성공. 인증 3, 가드 3, 인터셉터 3, 즐겨찾기 1, 날짜 파이프 2, 게시글 서비스 3이다.

같은 실행에서 Electron이 한 번 더 붙어 20회로 집계된 적이 있다. 지정한 브라우저는 ChromeHeadless 하나다. 추가 브라우저가 붙으면 같은 스펙이 두 번 돈다. CI 설정은 ChromeHeadless만 적는다.

### 2. 가드를 주입 컨텍스트에서 호출

```ts
const result = TestBed.runInInjectionContext(() =>
  authGuard({} as never, { url: '/mypage' } as never),
);
expect(result instanceof UrlTree).toBeTrue();
const url = TestBed.inject(Router).serializeUrl(result as UrlTree);
expect(decodeURIComponent(url)).toContain('/mypage');
```

1. `authGuard`는 안에서 `inject`를 쓴다. `TestBed.runInInjectionContext` 밖에서 부르면 제공자를 못 찾는다.
2. 라우트 인자와 상태 인자 중 테스트가 필요한 것은 `state.url`뿐이다.
3. 비로그인이면 결과가 `true`가 아니라 다른 주소다.
4. 그 주소를 문자열로 바꿔 쿼리를 확인한다.
5. `returnUrl`은 인코딩되어 있으므로 풀어 보고 `/mypage`가 있는지 본다.

즐겨찾기 저장소를 쓰는 테스트는 beforeEach에서 localStorage를 비운다. 로그인은 새 TestBed의 signal에서 시작하며 /auth/me 응답으로 복원한다.

### 3. HTTP 테스트

```ts
http.get('/api/posts').subscribe({ error: () => undefined });
const req = httpMock.expectOne('/api/posts');
req.flush('nope', {
  status: 401,
  statusText: 'Unauthorized',
  headers: { 'X-Request-Id': 'req-9' },
});
expect(errors.requestId()).toBe('req-9');
```

1. 구독해야 인터셉터와 요청이 실제로 만들어진다.
2. 401을 일부러 받으므로 오류 콜백을 비워 테스트가 예외로 끊기지 않게 한다.
3. 그 주소의 요청을 하나 집는다.
4. 상태 401과 요청 id 헤더를 넣어 응답시킨다.
5. 인터셉터가 헤더 서비스에 그 id를 올렸는지 본다.

### 4. 화면이 안 바뀔 때

- 저장이 반영됐는지 개발 서버 로그를 본다.
- `async` 파이프를 빠뜨렸는지 템플릿을 본다.
- Network에 요청이 없으면 옵저버블을 구독하지 않은 것이다.
- 요청이 401이면 인터셉터가 로그인으로 보냈는지 주소창을 본다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `NG0203: inject() must be called in an injection context` | 가드나 `toObservable`을 테스트 밖에서 호출 | `TestBed.inject` 또는 `runInInjectionContext` |
| 테스트끼리 즐겨찾기가 샘 | `localStorage`를 안 지움 | `beforeEach`에서 `clear()` |
| `Expected no open requests` | `flush`하지 않은 요청 | 모든 `expectOne` 뒤에 `flush`, `afterEach`에 `verify` |
| Chrome을 찾을 수 없음 | Headless 크롬 미설치 | Chrome을 설치하거나 CI 러너에 크롬이 있는 이미지를 쓴다 |
| 테스트는 통과하는데 화면은 실패 | 스펙이 템플릿을 안 봄 | 그 경로는 브라우저에서 한 번 더 누른다. study15의 Playwright E2E로 실제 화면과 API도 검사한다 |
| Karma가 안 끝남 | `--watch=false`를 빠뜨림 | 위 명령처럼 한 번만 실행 |

---

## ☐ 체크리스트

- ☑ `ng test --watch=false --browsers=ChromeHeadless`로 15개가 성공했다
- ☑ 가드, 쿠키 전달·변경 헤더, 401, 공통 응답·PATCH·캐시 무효화을 네트워크 없이 검사했다
- ☑ 실패하면 터미널 → Console → Network 순서로 본다
- ☑ 옵저버블을 구독하지 않으면 HTTP가 나가지 않는다는 점을 테스트로 확인했다
- ☑ Playwright로 로그인과 관리자 화면을 자동 클릭한다. 스크립트는 `project/e2e/login.spec.ts`다

## ➡️ 다음 단계 연결

[study10](./study10.md)에서 운영 빌드와 기초 구간 전체를 한 번에 복습한다.
