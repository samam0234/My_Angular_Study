# study7 — 인증·보안 기초

> 🎯 **목표**: 실제 비밀번호 검증과 서명 JWT 쿠키로 로그인하고, 새로고침 복원·401·작성자 권한을 구분한다.

- 대응 코드: [AuthService](./project/src/app/core/auth/auth.service.ts), [인터셉터](./project/src/app/core/auth/jwt.interceptor.ts), [API](./board-api-dotnet/Program.cs)

## 📖 이론

인증은 누구인지 확인하고, 인가는 그 사람이 이 동작을 할 수 있는지 확인한다. ASP.NET Core는 SQL Server의 비밀번호 해시를 `PasswordHasher`로 검사한다. 이메일 모양이나 비밀번호 길이가 맞는 것만으로 로그인되지 않는다.

서버는 HS256 JWT의 서명·발급자·대상·만료를 검증한다. 유효기간은 1시간이다. 로그인 응답은 공통 스펙의 `{ data: { user, accessToken } }`이며 동일 JWT를 `board_token` HttpOnly 쿠키에도 설정한다. Angular는 응답에서 사용자만 취해 signal에 두고 토큰을 저장하지 않는다. HttpOnly는 쿠키 읽기를 막는다. 로그인 JSON에도 토큰이 오므로 “브라우저에 토큰이 전혀 전달되지 않는다”는 뜻은 아니다.

| 동작 | 경로 | 결과 |
|---|---|---|
| 가입 | `POST /api/auth/signup` | 이메일·비밀번호·닉네임 검증, 201. 중복 이메일 409 |
| 로그인 | `POST /api/auth/login` | 올바른 비밀번호일 때만 200과 쿠키 |
| 복원 | `GET /api/auth/me` | 쿠키 또는 Bearer 검사 후 `{ data: user }` |
| 로그아웃 | `POST /api/auth/logout` | 쿠키 삭제, 204 |
| 관리자 검사 | `GET /api/admin/status` | 비로그인 401, 일반 사용자 403 |

`provideAppInitializer`가 복원을 기다린 후 최초 라우팅한다. `authGuard`는 화면 이동을 안내할 뿐이다. 서버는 글 작성·수정·삭제와 관리자 API를 각각 다시 검사한다. 공개 회원가입에서 `role: 'admin'`을 보내도 일반 계정으로 저장된다.

쿠키 CSRF를 막기 위해 변경 요청에 `X-Board-Request: 1`을 요구한다. 본문이 있으면 JSON이어야 하고, Origin이 있으면 허용 출처와 일치해야 한다. 서버는 제한된 CORS만 허용한다. 사용자 정의 헤더를 보낼 수 없는 외부 HTML 폼은 거절된다. HTTP 로컬 compose만 `CookieSecure=false`이고 기본값은 true다.

## 🛠️ 실기 — 코드·줄별 설명

### 1. 로그인 응답에서 사용자만 보관

```ts
return this.http.post<ApiResponse<{ user: User; accessToken: string }>>(
  `${environment.apiBaseUrl}/auth/login`, { email, password }, { withCredentials: true },
).pipe(
  map((result) => result.data.user),
  tap((user) => this.currentUserSignal.set(user)),
);
```

1. 공통 로그인 계약으로 POST한다. 비밀번호는 서버로 전달되어 해시 검증된다.
2. 같은 API의 쿠키를 포함하도록 설정한다.
3. 응답 토큰을 저장하지 않고 사용자만 꺼낸다.
4. 사용자 signal을 바꾸면 헤더와 가드가 같은 상태를 본다.

복원은 `/auth/me` 응답의 `data`를 signal에 넣는다. 실패하면 null이다. `localStorage`에는 즐겨찾기만 남고 로그인 사용자·JWT는 쓰지 않는다.

### 2. 인터셉터의 요청 분기

```ts
const base = environment.apiBaseUrl.replace(/\/$/, '');
const sameApi = req.url === base || req.url.startsWith(`${base}/`);
const mutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
const outgoing = sameApi ? req.clone({
  withCredentials: true,
  ...(mutation ? { setHeaders: { 'X-Board-Request': '1' } } : {}),
}) : req;
```

1. API 기준 주소 끝의 `/`를 정리한다.
2. 경로 경계까지 검사해 `/api-other`나 외부 요청을 잘못 포함하지 않는다.
3. 조회가 아닌 요청인지 판단한다.
4. API 요청만 복제해 쿠키와 변경 요청 헤더를 설정한다.
5. 브라우저는 Authorization을 직접 만들지 않는다. 서버의 Bearer 지원은 계약 테스트·외부 API 클라이언트에서 검증한다.

응답 오류에서는 `/auth/me`, `/auth/login`, `/auth/signup`, `/auth/logout`을 조용히 처리한다. 로그아웃 보조 요청의 401은 원래 요청 번호를 덮지 않는다. 그 외 401은 signal을 지우고 쿠키 삭제를 요청한 뒤 `/login?returnUrl=...`로 이동한다. 403·404는 로그아웃하지 않는다. `X-Request-Id`는 오류 서비스로 전달하고 오류를 다시 던진다.

### 3. 직접 확인

1. `/login`에서 `test@example.com / password123`으로 로그인하고 새로고침한다.
2. `/admin`으로 직접 이동하면 일반 계정은 `/mypage`로 간다.
3. `admin@example.com / password123`은 관리자 화면과 서버 관리자 API를 통과한다.
4. 다른 비밀번호로 로그인하면 실패한다. 두 예제 계정은 Development + SeedDemoData에서만 생성된다.
5. 로그인 화면의 회원가입으로 새 계정을 만들면 자기 글만 수정·삭제 버튼이 보인다.

## ⚠️ 오류 노트

| 증상 | 확인·해결 |
|---|---|
| 새로고침 후 비로그인 | `/auth/me` 상태, 쿠키 만료·Secure·같은 호스트 사용 여부를 확인 |
| 변경 요청 403 | `X-Board-Request`, Origin 허용 목록, 작성자 여부를 차례로 확인 |
| 로그인 실패가 화면에 안 나타남 | zoneless 비동기 오류 문장을 signal로 둔다 |
| 로그인 직후 관리자 테스트가 실패 | 로그인 응답과 헤더 이름 표시를 기다린 후 이동 |
| 로그아웃한 Bearer가 계속 유효 | 로그아웃은 쿠키 삭제다. 별도로 복사한 JWT는 1시간 만료까지 유효하다. 서버 폐기 목록은 미구현 |

## ☐ 체크리스트

- ☑ 로그인 상태는 signal, 복원은 HttpOnly 쿠키와 `GET /api/auth/me`다
- ☑ 인터셉터에서 401이면 로그인 화면, `X-Request-Id`를 오류 화면에 표시
- ☑ 가드 + returnUrl, 관리자 가드와 서버 관리자 인가를 확인했다
- ☑ 실제 비밀번호 해시 검증과 JWT 서명·만료·발급자·대상 검증을 적용했다
- ☑ 새로고침 로그인 유지. localStorage 동기화는 즐겨찾기에만 적용한다
- ☑ 비로그인 작성 401, 남의 글 수정·삭제 403, 위조 JWT 거부를 검사했다
- ☐ 인터셉터로 JWT 붙이기(노션 원문: Authorization 직접 첨부). 현재 Angular는 쿠키 전달을 선택했고 직접 Bearer 첨부는 구현하지 않았다
- ☐ 서버 JWT 즉시 폐기·갱신, 운영 HTTPS에서 쿠키 검증

## ➡️ 다음 단계 연결

[study8](./study8.md)에서 공통 API 모델, 환경 설정, 서버 비밀의 위치를 분리한다.
