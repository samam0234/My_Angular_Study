# studyFinal — 심화 응용: Angular 게시판의 실제 API·DB 연결

> 🎯 **목표**: midpoint 게시판에 study11~18의 상태·성능·검사·보안·Docker·AI 경계를 합쳐 실제 데이터가 유지되는 서비스를 만들고 공개 운영 전 조건을 남긴다.

- 위치: study18 다음
- 대응 코드: [project](./project), [board-api-dotnet](./board-api-dotnet), [board-mcp](./board-mcp)
- 검증일: **2026-11-19, Asia/Seoul**. 이 과정은 Angular를 중심으로 하며 다른 프론트엔드 프레임워크와 비교하지 않는다.

## 📖 이론 — 목표

완성된 로컬 흐름은 **브라우저 → nginx 8080 → ASP.NET Core 5080 → SQL Server**다. 개발 서버는 `/api` 프록시로 같은 API를 쓴다. 기존 Node `board-api/`는 이전 실습 기록으로 보존했으며 기본 실행·compose·CI 대상은 새 API다. 두 서버를 5080에 동시에 실행하지 않는다.

로컬 연결 완료와 외부 운영 완료는 구분한다. 공개 URL·레지스트리·원격 CI·실제 모델 호출은 아직 없다. 기존 Angular 19 보안 경고도 남아 있어 현재 결과를 공개 운영 준비 완료로 표시하지 않는다.

## 🛠️ 실기 — 코드·줄별 설명

### 기능 확장

| 영역 | 구현과 결과 | 연결 study |
|---|---|---|
| 기본 화면 | standalone, DI, Reactive Forms, Router, 모델 | 0~5, Midpoint |
| 영구 CRUD | 공통 data/meta/error, PATCH, Location, 204, SQL 저장 | 6 |
| 가입·인증 | 실제 비밀번호 해시, JWT 검증, HttpOnly 쿠키, `/auth/me` | 7 |
| 서버 검색·페이지 | 제목·본문 대소문자 무시 검색, q/page/limit/sort, 전체 건수 | 6, 12 |
| 작성자·관리자 | 비로그인 작성 401, 타인 글 수정·삭제 403, 관리자 API 검사 | 7, 16 |
| 상태·캐시 | 사용자·즐겨찾기 signal, 30초 페이지·검색 캐시, 변경 성공 무효화 | 11 |
| 화면 갱신 | zoneless, OnPush, id track, 상세·관리자·실습실 지연 로딩 | 11, 12 |
| 라이브러리 | date-fns 파이프, NgRx SignalStore·BehaviorSubject 실습, CDK | 13 |
| 정적 검사·테스트 | strictTemplates, lint, 포맷, Karma, 실제 API·DB·E2E | 14, 15 |
| 배포 형태 | Node→nginx 웹 이미지, .NET SDK→런타임 API 이미지, SQL 볼륨 | 17 |
| AI·MCP | 서버 키·키 없는 목 응답, 표준 stdio 경로 도구 | 18 |

등록·수정·삭제 성공은 서버 재조회로 확인한다. 오류를 화면 성공으로 바꾸는 예전 404 대체 처리는 없다. 댓글은 서버 조회·작성·삭제 API가 있고 화면은 조회를 제공한다. 즐겨찾기는 현재 페이지 필터와 브라우저 저장소 기능이며 계정별 서버 저장은 아직 없다.

```ts
return this.http.patch<ApiResponse<ServerPost>>(`${this.url}/${post.id}`, {
  title: post.title,
  body: post.body,
}).pipe(map((result) => toPost(result.data)), tap(() => this.pageCache.clear()));
```

1. 공통 스펙의 부분 수정 경로를 사용한다.
2. 변경 필드만 보낸다. 작성자 신원은 서버가 결정한다.
3. 공통 data 응답을 화면 모델로 바꾼다.
4. 성공한 경우에만 캐시를 비운다. 이후 컴포넌트 재조회가 SQL 결과를 읽는다.

### 성능·보안 점검

최신 운영 Docker 빌드는 초기 **304.03 kB**, 전송 추정 **83.13 kB**다. 실습실 **40.34 kB**, 상세 **2.87 kB**, 관리자 **1.07 kB**는 지연 청크다. 초기 경고 예산 500 kB 미만이다. 과거 297.58 kB는 가입 폼·공통 API 변환·추가 검사가 들어오기 전 기록이다. 과거 검색 0.2~3.6ms는 클라이언트 필터 측정이며 현재 SQL 검색 응답 시간으로 재사용하지 않는다.

SQL은 생성 시각·id 인덱스와 서버 페이지 범위를 사용한다. 검색 입력은 250ms debounce, 이전 HTTP는 switchMap 취소, 응답 캐시는 30초다. 대규모 데이터의 실행 계획·p95 부하 성능은 아직 측정하지 않았다.

보안 적용: 비밀번호 해시, JWT 서명·발급자·대상·만료 검증, 서버 작성자 인가, 가입 role 주입 방어, HttpOnly·SameSite 쿠키, JSON·변경 요청 헤더·Origin 허용 목록, CORS·크기·빈도 제한, 오류 envelope, 요청 번호 로그, 본문 보간 출력.

운영 미완료: Angular 19 보안 업데이트, TLS·Secure 쿠키 운영 확인, 최소 권한 DB 계정, 비밀 저장소, 백업·복구, 외부 경보, 분산 빈도 제한. `npm audit --omit=dev`는 **8개(high 4, moderate 4)**다. 로그아웃은 쿠키를 삭제하지만 별도로 복사한 Bearer JWT를 즉시 폐기하지 않는다. 만료는 1시간이며 갱신·폐기 목록은 없다. 로그인 JSON의 accessToken은 공통 스펙 호환용으로 전달되고 Angular는 저장하지 않는다.

### Docker·외부 배포

```bash
docker compose -f project/docker-compose.yml up -d --build
node board-api-dotnet/tests/wait-for-api.mjs
node --test board-api-dotnet/tests/api.test.mjs
node board-api-dotnet/tests/persistence.mjs
```

1. 무작위 비밀이 있는 project/.env를 준비한 뒤 DB·API·웹을 만든다.
2. DB까지 준비된 API를 기다린다.
3. 실제 SQL Server 계약을 검사한다.
4. 임시 글을 쓰고 DB·API를 재시작해 글·계정·서명 세션이 남는지 확인한다.

마이그레이션과 개발 seed가 포함되어 새 SQL 볼륨에서도 실행된다. `http://127.0.0.1:8080`에서 최신 운영 이미지를 확인했다. compose는 로컬 학습 설정으로 Development·예제 계정·sa·HTTP 쿠키를 사용한다. 공개 배포 시 Production, seed 해제, HTTPS, Secure 쿠키, 전용 DB 계정, 별도 마이그레이션 배포 작업을 준비해야 한다.

GitHub Actions 파일에는 검사부터 compose·계약·재시작·브라우저까지 연결했다. 원격 push나 레지스트리 업로드는 하지 않았다. 외부 URL은 없다.

### 테스트 결과

| 검사 | 2026-11-19 로컬 결과 |
|---|---|
| Angular Karma·Jasmine | 15개 성공 |
| 실제 API·SQL Server 계약 | 16개 성공 |
| DB·API 재시작 유지 | 글·사용자·서명 세션 확인 성공 |
| Playwright, nginx 8080 | 5개 성공: 실제 401과 요청 번호, 잘못된 비밀번호, 로그인 복원·일반 계정 관리자 차단, 관리자 서버 통과, 가입·검색·영구 CRUD |
| ESLint·지정 범위 Prettier | 통과 |
| Docker 웹·API 빌드 | 성공. 초기 합계 304.03 kB |
| MCP 자가 검사 | 줄 구분 JSON, 분할 입력, 도구 호출, 파싱 오류 후 ping 복구 성공 |
| GitHub Actions 원격 | 미실행 |
| 실제 모델·공개 URL | 미검증 |

실제 DB 테스트는 고유 이메일 계정을 남긴다. 생성한 검사용 글·댓글은 성공 경로에서 삭제한다. 테스트 대상은 로컬 학습 DB다.

## ⚠️ 오류 노트

- Angular가 배열을 기대하는데 data/meta 객체가 오면 서비스 변환을 확인한다.
- 로그인 버튼 클릭 뒤 즉시 새 주소로 이동하면 인증 요청이 취소될 수 있다. 성공 상태를 기다린다.
- 401 처리 뒤 로그아웃 요청도 401일 수 있다. 인터셉터는 그 보조 오류가 원래 요청 번호를 덮지 않게 한다.
- 4200 서버가 꺼져 있으면 E2E_BASE_URL을 실행 중인 8080으로 설정한다.
- API는 .NET 10 대상이다. 호스트 .NET 9 대신 Docker SDK 빌드를 사용했다.
- 예전 Node API의 .env 로더·비표준 MCP Content-Length 설명을 현재 구현에 적용하지 않는다.

## ☐ 체크리스트 — 노션 요구사항 추적

| 노션 항목 | 문서와 상태 |
|---|---|
| CLI 스캐폴드 | study0 ☑ |
| 컴포넌트·템플릿·스타일·모듈, DI | study1~2 ☑. 모듈 역할은 standalone imports/provider로 설명 |
| 라우팅·가드 | study4·7 ☑ |
| Reactive Forms | study5 ☑ |
| HttpClient REST·RxJS map/switchMap/error | study6·11 ☑ |
| 인터셉터로 JWT 붙이기 | study7 ☐. 현재 브라우저는 HttpOnly 쿠키 전달, 직접 Bearer 첨부는 미구현 |
| signal + 로그인 유지(localStorage 동기화) | study11 ☑. 로그인은 쿠키 복원, localStorage는 즐겨찾기 |
| zoneless 체감 | study11 ☑. project만 적용, demo 타이머는 Zone.js 유지 |
| 실제 API + 대표 조합 5번 + 프록시 | study6·17 ☑. SQL Server 선택 |
| 실제 응답의 401 이동·X-Request-Id | study7·16 ☑. 단위·계약·브라우저 검사 |
| NgRx 등과 BehaviorSubject 비교 | study11·13 ☑. Redux Toolkit 대조 부분은 단일 프레임워크 요청에 따라 제외, 원문 체크는 ☐ |

- ☑ 루트의 study0~18, studyMidpoint, studyFinal 총 21개와 README 유지
- ☑ 목표 → 이론 → 실기·코드 설명 → 오류 노트 → 체크리스트 → 다음 단계 구성
- ☑ 실제 ASP.NET Core + SQL Server 연결·영구 CRUD·서버 인가
- ☑ 최신 이미지와 로컬 검증 결과를 문서에 반영
- ☐ 의존성 보안 경고 해소와 공개 운영 전 점검
- ☐ 외부 배포·레지스트리·공개 URL
- ☐ 원격 Actions 성공·실제 모델 호출·에디터 MCP 실연결

## 최종 회고

UI가 그럴듯하게 바뀌는 것과 서버·DB에 저장되는 것은 다른 검증이었다. 공통 API를 실제로 읽은 뒤 경로·응답 객체·페이지·PATCH·권한을 함께 바꿔야 연결이 완성됐다. 가드와 서버 인가도 서로 대신할 수 없다.

이번에 끝낸 범위는 Angular 게시판과 ASP.NET Core·SQL Server의 로컬 연결이다. 다음 순서는 Angular 의존성 이행·운영 설정 보강 → 원격 CI → 공개 배포 → 실제 모델 호출 검증이다. 다른 프레임워크 조합을 이 학습 과정에 추가하지 않는다. 커밋·push는 하지 않았다.

## ➡️ 다음 단계 연결

기초는 [study0](./study0.md)~[study10](./study10.md), 조립은 [studyMidpoint](./studyMidpoint.md), 심화는 [study11](./study11.md)~[study18](./study18.md)다. 다음 세션은 위 미완료 체크부터 확인한다.
