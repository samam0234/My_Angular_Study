# study16 — 보안·운영 심화

> 🎯 **목표**: 클라이언트 가드와 서버 인가, 요청 추적, CSRF 방어, 운영 전 미완료 점검을 코드와 증거로 구분한다.

- 대응 코드: [API](./board-api-dotnet/Program.cs), [인증](./project/src/app/core/auth), [오류 서비스](./project/src/app/core/http)

## 📖 이론

가드는 화면 진입 제어다. 서버 인가는 API 직접 호출도 막는다. 게시글 작성자는 클라이언트 `userId` 대신 검증한 JWT에서 정한다. 비밀번호는 해시로 저장하고 오류 응답에는 해시·스택·연결 문자열을 넣지 않는다.

JWT는 HttpOnly·SameSite=Lax 쿠키로 유지하며 1시간 만료다. API는 Bearer도 지원한다. Angular는 로그인 응답 토큰을 저장하지 않고 사용자만 signal에 둔다. CSRF 방어는 변경 요청의 사용자 정의 헤더, JSON 본문, Origin 허용 목록, 제한 CORS의 조합이다. XSS는 이 방어로 해결되지 않는다. 본문은 `{{ }}` 보간으로 출력한다.

서버는 요청 번호·메서드·경로·상태를 구조화 로그로 남긴다. `X-Request-Id`는 요청에 유효한 값이 있으면 유지하고 없으면 생성한다. 오류 JSON `requestId`와 응답 헤더가 같다. 로그인·가입은 IP당 분당 30회, 요약은 분당 10회 제한한다. 현재 nginx 뒤에서는 프록시 IP로 묶이는 보수적인 제한이다. 분산 저장소 기반 제한은 없다.

## 🛠️ 실기 — 코드·줄별 설명

### 1. 서버 작성자 검사 발췌

```csharp
var post = await FindPost(id, db);
if (post.UserId != UserId(ctx))
    throw new ApiException(403, "FORBIDDEN", "작성자만 수정할 수 있습니다.");
ValidatePost(input.Title, input.Body, input.Tags, partial: true);
```

1. DB에서 글과 작성자를 읽는다. id 형식이 틀리면 400, 없으면 404다.
2. JWT의 사용자 번호와 DB 작성자를 비교한다.
3. 다르면 403이다. 관리자도 타인의 글을 수정할 수 없다.
4. 통과한 입력도 서버에서 길이·공백·태그를 검증한다.

### 2. 요청 번호 표시

```ts
const requestId = error.headers.get('X-Request-Id');
if (requestId) errorReport.show(requestId, error.status);
if (error.status === 401 && !req.url.endsWith('/logout')) {
  authService.logout();
  void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
}
```

1. 서버가 준 추적 번호를 읽는다.
2. 헤더 아래 오류 표시 영역의 signal에 번호와 상태를 넣는다.
3. 신원 오류인 401만 로그인으로 이동한다. 403은 권한 부족이므로 세션을 지우지 않는다.
4. 원래 주소를 returnUrl에 남긴다. 전체 인터셉터에는 로그인·복원 예외와 오류 재전파도 있다.

### 3. 실제 운영 점검 명령

```bash
node --test board-api-dotnet/tests/api.test.mjs
docker compose -f project/docker-compose.yml logs --tail 50 api
```

첫 명령은 실제 SQL Server에서 401·403·위조 JWT·CSRF·검증·요청 번호를 검사한다. 두 번째는 같은 요청 번호를 로그에서 찾는 방법이다. 로그를 공유할 때 비밀을 추가로 출력하지 않는다.

`GET /health`는 프로세스 생존, `GET /api/health`는 DB 연결과 업타임을 확인한다. 실습실의 “가동 확인”은 후자를 호출한다. 외부 오류 추적·가동 경보 서비스는 연결하지 않았다.

## ⚠️ 오류 노트

| 증상 | 확인·해결 |
|---|---|
| 403인데 로그아웃됨 | 인터셉터가 401과 403을 구분하는지 확인 |
| API 로그에 비밀번호·토큰이 출력 | 요청 본문이나 전체 헤더를 로그 인자로 넘기지 않는다 |
| 쿠키를 document.cookie에서 못 읽음 | HttpOnly의 정상 동작. Application/Network에서 속성만 확인 |
| 로컬 HTTP에서 Secure 쿠키가 전송되지 않음 | 로컬 compose만 CookieSecure=false. 공개 서비스는 HTTPS와 true가 필요 |
| npm audit 경고 | 기존 Angular 19 의존성 문제. 강제 자동 업그레이드 대신 버전 이행·회귀 검증을 별도 진행 |

## ☐ 체크리스트

- ☑ 인터셉터에서 401이면 로그인 화면, X-Request-Id를 오류 화면에 표시
- ☑ 실제 ASP.NET Core의 401·403과 error.requestId를 계약 테스트로 확인
- ☑ 비밀번호 해시, JWT 검증, 서버 작성자 인가, 회원가입 권한 주입 방어
- ☑ 쿠키 변경 요청의 헤더·Origin 검증, 제한 CORS, 입력·본문 크기 제한
- ☑ 로그는 요청 번호 중심이며 본문은 보간 출력
- ☑ `/api/health`의 DB 연결·업타임과 관리자 서버 검증
- ☐ Angular 19 의존성 보안 경고 해결: 2026-11-19 `npm audit --omit=dev` 결과 8개(high 4, moderate 4)
- ☐ HTTPS·Secure 쿠키, DB 전용 최소 권한 계정, 백업·복구 훈련, 외부 경보, 비밀 저장소
- ☐ JWT 즉시 폐기·갱신과 사용자별 즐겨찾기 저장. 현재 즐겨찾기는 브라우저 공유 키다

## ➡️ 다음 단계 연결

[study17](./study17.md)에서 nginx·ASP.NET Core·SQL Server를 compose로 함께 실행하고 공개 배포 전 조건을 확인한다.
