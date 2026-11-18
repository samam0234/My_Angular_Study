# study15 — 고급 테스트·CI

> 🎯 **목표**: Angular 단위·HTTP 테스트, 실제 SQL API 계약, 재시작 검사, 브라우저 E2E를 CI 순서로 연결한다.

- 대응 코드: [Angular 스펙](./project/src/app), [API 계약](./board-api-dotnet/tests/api.test.mjs), [E2E](./project/e2e), [CI](./.github/workflows/ci.yml)

## 📖 이론

검증마다 바꾸는 경계를 구분한다. Angular 테스트의 HTTP는 HttpTestingController로 대체한다. API 계약 테스트는 실제 ASP.NET Core와 SQL Server를 사용한다. Playwright는 실제 브라우저에서 nginx 또는 개발 프록시를 거쳐 같은 서버를 호출한다. API 재시작 검사는 메모리가 아니라 DB에 저장되는지 확인한다.

| 검사 | 확인하는 내용 | 현재 로컬 결과 |
|---|---|---|
| Karma·Jasmine | 인증 signal, 복원, 가드, 쿠키·변경 헤더, 오류 번호, DTO, PATCH·캐시 | 15개 성공 |
| Node 계약 테스트 | 가입·중복·로그인 검증, JWT·권한·CRUD·검색·댓글·CSRF·오류·목 AI | 16개 성공 |
| 재시작 | DB·API 재시작 후 글·계정·세션 유지 | 성공 |
| Playwright | 잘못된 로그인, 로그인 복원·관리자 차단/허용, 가입·CRUD·서버 검색, 실제 401 | nginx 8080에서 5개 성공 |
| GitHub Actions | 위 실행 순서 재현 | 파일 작성, 원격 미실행 |

## 🛠️ 실기 — 코드·줄별 설명

### 1. 로컬 검증

```bash
cd project
npm ci
npm run lint
npm run format:check
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

1. 프로젝트 폴더에서 실행한다.
2. 잠금 파일 그대로 설치한다.
3. 미사용 변수 등 코드 규칙을 검사한다.
4. 지정한 core·실습실·날짜 파이프의 포맷을 검사한다.
5. 브라우저를 고정하고 워치 없이 한 번 실행한다.
6. 템플릿·타입·운영 예산을 확인한다.

실제 서버 검사는 루트에서 실행한다.

```bash
docker compose -f project/docker-compose.yml up -d --build
node board-api-dotnet/tests/wait-for-api.mjs
node --test board-api-dotnet/tests/api.test.mjs
node board-api-dotnet/tests/persistence.mjs
node board-mcp/server.mjs --self-test
```

첫 줄은 실제 DB를 포함한 서버 기동이다. 둘째 줄은 DB 연결 준비를 기다린다. 셋째는 HTTP 계약을 검증한다. 넷째는 실제로 DB와 API를 재시작하므로 브라우저 테스트와 동시에 돌리지 않는다. 마지막은 표준 MCP 줄 구분 JSON 전송을 검사한다. 이 검사에는 모델 키가 필요 없다.

### 2. E2E

PowerShell에서 운영 이미지를 대상으로 한다.

```powershell
cd project
$env:E2E_BASE_URL = 'http://127.0.0.1:8080'
npx playwright test
```

1. E2E 설정이 있는 폴더로 이동한다.
2. 운영 nginx 주소를 지정한다. 기본값 4200을 쓰려면 개발 서버가 먼저 있어야 한다.
3. 로컬 Chrome에서 실행한다. CI는 Playwright Chromium을 설치해 사용한다.

```ts
await page.getByRole('button', { name: '로그인', exact: true }).click();
await expect(page.getByText('admin님')).toBeVisible();
await page.goto('/admin');
await expect(page.getByRole('heading', { name: '관리자 전용' })).toBeVisible();
```

1. 버튼 클릭만 끝났다고 로그인 HTTP가 완료된 것은 아니다.
2. 사용자가 보이는 상태까지 기다린다.
3. 새로고침 방식으로 관리자 주소를 연다. 앱 초기 복원도 검사한다.
4. 서버 관리자 API가 성공한 경우에만 보이는 제목을 기다린다.

### 3. CI

`ci.yml`은 Node 22에서 검사·빌드를 실행하고 임시 무작위 SQL/JWT 비밀을 만든다. compose 기동 → readiness → 계약 → 재시작 → Chromium 설치 → 8080 E2E 순서다. 실패하면 서비스 로그를 남기고 항상 컨테이너를 내린다. push·pull_request가 트리거이며 이번 작업에서는 커밋·push를 하지 않았다.

## ⚠️ 오류 노트

| 증상 | 원인·해결 |
|---|---|
| E2E의 connection refused | 대상 서버가 없다. compose와 E2E_BASE_URL을 확인 |
| 로그인 직후 이동이 가끔 실패 | 응답·화면 상태를 기다리지 않고 page.goto를 실행함 |
| 카드 제목 선택자가 별까지 포함 | 링크 안에 버튼을 중첩하지 않고 제목 링크와 별 버튼을 분리 |
| 테스트 반복 후 계정이 남음 | 고유 이메일을 쓰는 실제 DB 검사다. 테스트 DB와 운영 DB를 분리 |
| API 429 | 분당 인증 제한에 걸림. 동일 IP 테스트를 무한 반복하지 않는다 |
| 포맷 검사 실패 | 안내된 파일만 prettier --write 후 검사 |

## ☐ 체크리스트

- ☑ Angular 단위·HTTP 테스트 15개 성공
- ☑ 실제 API·SQL 계약 테스트 16개 성공
- ☑ 비로그인 401·타인 글 403·요청 번호·DB 재시작 유지 검증
- ☑ Playwright 실제 서버 시나리오와 CI 실행 순서 작성
- ☑ MCP 줄 구분 메시지·분할 입력·파싱 오류 복구 자가 테스트
- ☐ GitHub Actions 원격 실행 성공과 결과 링크

## ➡️ 다음 단계 연결

[study16](./study16.md)에서 검사 결과와 운영 보안의 남은 조건을 구분한다.
