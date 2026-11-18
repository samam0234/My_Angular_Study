# Angular 학습 기록

Angular 19 standalone·zoneless 게시판에 **ASP.NET Core 10 + EF Core + SQL Server**를 연결했다. 이론과 개념 연습은 `demo/`, 완성 게시판은 `project/`다. 다른 프론트엔드 프레임워크와 비교·통합하지 않는다.

원본 요구사항: [Angular 노션](https://app.notion.com/p/Angular-3d6d7dec5e2e81768111cf546347639b), [공통 API 스펙](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e). 노션 추가 항목의 문서별 반영표와 미완료 조건은 [studyFinal](./studyFinal.md)의 체크리스트가 기준이다.

## 학습 문서

| 문서 | 내용 |
|---|---|
| [study0.md](./study0.md) | 설치, 프로젝트 생성, 폴더, 실행, 핵심 용어 |
| [study1.md](./study1.md) | 첫 화면과 템플릿 문법 |
| [study2.md](./study2.md) | 컴포넌트, 서비스, 의존성 주입 |
| [study3.md](./study3.md) | 모델, 필드, `BehaviorSubject`, signal의 자리 |
| [study4.md](./study4.md) | 라우트, 중첩 경로, 가드 |
| [study5.md](./study5.md) | 반응형 폼, 검증, 오류 문장 |
| [study6.md](./study6.md) | HttpClient CRUD, `switchMap`, `forkJoin` |
| [study7.md](./study7.md) | HttpOnly 서명 쿠키, 401, 관리자 가드 |
| [study8.md](./study8.md) | `core` / `shared` / `features`, 환경 파일 |
| [study9.md](./study9.md) | Karma 테스트와 디버깅 순서 |
| [study10.md](./study10.md) | 운영 빌드와 기초 복습 |
| [studyMidpoint.md](./studyMidpoint.md) | 게시판 + 로그인 조립 |
| [study11.md](./study11.md) | signal, 최신 요청만 유지, NgRx SignalStore |
| [study12.md](./study12.md) | OnPush와 번들 용량 |
| [study13.md](./study13.md) | `date-fns`, `@ngrx/signals` |
| [study14.md](./study14.md) | 엄격 타입, ESLint, Prettier |
| [study15.md](./study15.md) | 단위·통합 테스트와 CI 파일 |
| [study16.md](./study16.md) | 토큰, 로그, 요청 id |
| [study17.md](./study17.md) | 웹·API·SQL Docker와 프록시·재시작 검사 |
| [study18.md](./study18.md) | AI 목 응답과 MCP |
| [studyFinal.md](./studyFinal.md) | 심화 적용과 남은 빈 칸 |


## 프로젝트

| 경로 | 역할 |
|---|---|
| [demo](./demo) | 기초 개념 연습. Zone.js·연습용 인증을 유지 |
| [project](./project) | Angular 게시판. 실제 API와 공통 data/meta/error 계약 |
| [board-api-dotnet](./board-api-dotnet) | 현재 기본 백엔드. ASP.NET Core·EF 마이그레이션·SQL Server |
| [board-api](./board-api) | 예전 Node 메모리 API 보존. 현재 앱 계약과 다르며 기본 실행 대상이 아님 |
| [board-mcp](./board-mcp) | 표준 stdio JSON-RPC 경로 안내 도구 |

## 빠른 실행

Docker Desktop의 Linux 컨테이너가 필요하다. Angular 개발·검사에는 Node 22와 npm을 사용한다. API Docker 빌드는 .NET 10 SDK 이미지를 사용하므로 호스트 SDK 설치는 필수가 아니다.

처음 실행하는 복제본에서는 `project/.env.example`을 `project/.env`로 복사하고 SQL_PASSWORD와 JWT_SECRET을 무작위 값으로 바꾼다. **이번 작업 환경에는 생성해 두었다.** 아래 명령은 루트 PowerShell에서 새 환경에 한 번 실행할 수 있다. 기존 .env가 있으면 덮어쓰지 않는다.

```powershell
if (-not (Test-Path -LiteralPath project/.env)) {
  node --input-type=module -e "import { randomBytes } from 'node:crypto'; import { writeFileSync } from 'node:fs'; writeFileSync('project/.env', 'SQL_PASSWORD=Aa1!' + randomBytes(24).toString('hex') + '\nJWT_SECRET=' + randomBytes(48).toString('hex') + '\nOPENAI_API_KEY=\n');"
}
docker compose -f project/docker-compose.yml up -d --build
node board-api-dotnet/tests/wait-for-api.mjs
```

- 운영 빌드 화면: **http://127.0.0.1:8080**
- API·DB 준비 확인: http://127.0.0.1:5080/api/health
- OpenAPI JSON: http://127.0.0.1:5080/api-docs
- SQL Server 호스트 개발 접속: `127.0.0.1,14333`, DB `AngularBoard` (자격 정보는 로컬 .env)
- 로컬 예제 로그인: `test@example.com`, `admin@example.com`, 비밀번호 둘 다 `password123`

예제 계정·글 100개는 Development + SeedDemoData에서 DB가 비어 있을 때만 생성된다. 일반 계정은 자기 글만 수정·삭제하며 `/admin`에서 마이페이지로 이동한다. 관리자도 남의 글을 수정·삭제할 수 없다. 회원가입은 로그인 화면 아래에 있다.

## Angular 개발 서버

위 API·DB를 실행한 상태에서 별도 터미널을 연다.

```powershell
cd project
npm ci
npm start
```

주소는 http://127.0.0.1:4200 이다. `/api` 요청은 proxy.conf.json을 통해 ASP.NET Core 5080으로 간다. 예전 Node API와 새 API를 같은 5080에 동시에 실행하지 않는다. 다른 개발 포트는 `npx ng serve --port 4300`이며 변경 요청 Origin 허용 목록도 함께 맞춘다.

## 검증

루트에서 실제 API·DB와 MCP를 검사한다.

```powershell
node --test board-api-dotnet/tests/api.test.mjs
node board-api-dotnet/tests/persistence.mjs
node board-mcp/server.mjs --self-test
```

재시작 검사는 실제로 DB·API를 재시작하므로 다른 테스트와 동시에 실행하지 않는다. 계약 테스트는 고유 이메일 계정을 로컬 DB에 남긴다. 사용자 삭제 API는 없다.

```powershell
cd project
npm run lint
npm run format:check
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
$env:E2E_BASE_URL = 'http://127.0.0.1:8080'
npx playwright test
```

2026-11-19 로컬 결과: **Karma 15개, 실제 API 계약 16개, Playwright 5개 성공**, DB·API 재시작 유지·MCP 자가 검사·lint·포맷 통과. 최신 Docker 웹 초기 합계 **304.03 kB**, 전송 추정 **83.13 kB**. 원격 Actions는 아직 실행하지 않았다.

## 설정과 데이터

- Angular는 API 주소만 알고 비밀은 갖지 않는다. 서버 비밀은 compose가 project/.env에서 실행 환경으로 전달한다.
- JWT는 HttpOnly 쿠키에 있고 `/api/auth/me`로 복원한다. 공통 스펙 로그인 JSON에도 accessToken이 오지만 Angular는 저장하지 않는다. localStorage는 즐겨찾기만 사용한다.
- API는 Bearer JWT도 지원하며 실제 계약 테스트가 이를 검사한다. 브라우저 인터셉터는 쿠키·X-Board-Request 방식이다.
- OPENAI_API_KEY가 비면 요약은 명시적인 목 응답이다. 실제 키를 넣은 검증은 하지 않았다. .env 수정 후 API 컨테이너를 다시 생성해야 한다.
- SQL은 named volume에 남고 API 시작 시 EF 마이그레이션을 적용한다. 종료는 `docker compose -f project/docker-compose.yml down`이다. `down -v`는 DB를 삭제하므로 일반 종료에는 사용하지 않는다.

## 남은 작업과 인수인계

- Angular 19 의존성 보안 경고: `npm audit --omit=dev` 8개(high 4, moderate 4). 지원 버전 이행과 회귀 검증 필요.
- 공개 배포: HTTPS·Secure 쿠키, Production·seed 해제, 최소 권한 DB 계정·비밀 저장소, 백업·복구·외부 경보, 레지스트리와 공개 URL 필요. 현재 compose는 로컬 학습용이다.
- 원격 Actions 실행·실제 모델 호출·실제 에디터 MCP 호출은 미검증이다.
- JWT 즉시 폐기·갱신, 사용자별 서버 즐겨찾기, DB 실행 계획·부하 측정은 미완료다.
- 노션의 “인터셉터로 JWT 붙이기”는 원문 체크를 남겼다. 현재 앱은 쿠키 방식이며 직접 Bearer 첨부를 완료로 처리하지 않았다. Redux Toolkit 대조는 단일 프레임워크 요청 범위에 따라 제외했다.
- 기존 미커밋 변경을 보존했다. 이번 작업도 커밋·push하지 않았다.

## 에이전트 규칙

- 공통 규칙: [.agent/AGENTS.md](./.agent/AGENTS.md)
- 커밋 가이드: [.agent/COMMIT_GUIDE.md](./.agent/COMMIT_GUIDE.md)
- 이후 세션은 [studyFinal](./studyFinal.md)의 요구사항 추적·미완료 체크와 현재 코드를 먼저 확인한다.
