# ASP.NET Core 게시판 API

Angular의 현재 기본 API다. .NET 10, EF Core SQL Server, JWT Bearer·HttpOnly 쿠키를 사용한다. 전체 실행은 루트 [README](../README.md), 학습 흐름은 [study6](../study6.md)·[study7](../study7.md)·[study17](../study17.md)에 있다. 예전 Node `board-api/`와 응답 계약이 다르다.

## 실행

루트에서 비밀 설정 후 다음을 실행한다. 호스트 SDK 없이 Docker SDK 단계로 빌드된다.

```powershell
docker compose -f project/docker-compose.yml up -d --build
node board-api-dotnet/tests/wait-for-api.mjs
```

직접 `dotnet run --project board-api-dotnet`으로 실행하려면 **.NET 10 SDK**와 SQL Server, `ConnectionStrings__Board`, `Jwt__Secret`이 필요하다. 런타임 기본 쿠키는 Secure다. 로컬 HTTP 테스트는 명시적으로 CookieSecure=false를 설정한다. .NET은 예전 Node 서버의 `.env`를 자동으로 읽지 않는다. Development의 User Secrets도 사용할 수 있다.

| 설정 | 의미 |
|---|---|
| `ConnectionStrings__Board` | 실제 SQL Server 연결 문자열 |
| `Jwt__Secret` | 32바이트 이상의 무작위 서명 비밀 |
| `Jwt__Issuer`, `Jwt__Audience` | 토큰 발급자·대상. appsettings 기본값 사용 가능 |
| `CookieSecure` | 기본 true. 로컬 HTTP compose만 false |
| `SeedDemoData` | 기본 false. Development에서 true일 때 빈 DB에만 예제 생성 |
| `CORS_ORIGIN` | 쉼표로 구분한 정확한 허용 출처. 미설정 시 로컬 기본 목록 |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | 서버 전용 모델 설정. 키가 없으면 목 응답 |

## 공통 계약

경로는 `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/posts`, `/api/posts/{id}`, `/api/posts/{id}/comments`, `/api/comments/{id}`다. 수정은 PATCH, 삭제·로그아웃은 204다. `/api/admin/status`는 관리자, `/api/summarize`는 로그인이 필요하다. `/health`는 프로세스, `/api/health`는 DB 준비와 업타임, `/api-docs`는 OpenAPI JSON이다.

단건은 `{ data }`, 목록은 `{ data, meta }`, 오류는 `{ error: { code, message, fields, requestId } }`다. `X-Request-Id`는 오류 번호와 같다. 요청에 유효한 번호가 있으면 유지한다. 목록은 `q`, `page`, `limit`, `sort`를 받고 기본 10개·최대 50개다. JSON은 camelCase, 시각은 UTC다.

변경 요청은 `X-Board-Request: 1`과 JSON 본문을 사용한다. Origin이 있으면 허용 목록에 일치해야 한다. Bearer 또는 board_token 쿠키로 인증하지만 브라우저는 같은 출처 쿠키 방식을 쓴다. 로그인 JSON도 공통 스펙에 따라 accessToken을 포함하며 Angular는 저장하지 않는다. 로그아웃은 쿠키 삭제이고 복사한 JWT의 즉시 폐기는 제공하지 않는다.

## 마이그레이션

`Data/Migrations`가 초기 스키마와 모델 스냅샷을 포함한다. 학습용 단일 API는 시작 시 `MigrateAsync()`를 수행한다. 다중 인스턴스 공개 운영에서는 별도 배포 작업으로 한 번만 적용한다.

.NET 10 SDK와 같은 계열 EF 도구에서 스키마 변경 시 다음을 실행한다. 패키지·도구 버전은 현재 csproj와 맞춘다. 도구의 디자인 타임 팩터리는 비밀 없이 스키마 생성이 가능하며 DB 연결이 필요한 명령에는 실제 연결 설정이 필요하다.

```powershell
dotnet tool install dotnet-ef --version 10.0.15 --tool-path .tools/ef
dotnet restore board-api-dotnet
dotnet build board-api-dotnet
.tools/ef/dotnet-ef migrations add DescribeChange --project board-api-dotnet --output-dir Data/Migrations
```

Docker SDK로 도구를 실행할 때는 같은 컨테이너에서 restore·build·ef를 순서대로 실행하거나 NuGet 볼륨을 공유한다. 다른 임시 컨테이너의 사라진 패키지 경로를 그대로 참조하지 않는다.

## 검사와 운영 범위

```powershell
node --test board-api-dotnet/tests/api.test.mjs
node board-api-dotnet/tests/persistence.mjs
```

루트에서 실행하며 실제 SQL Server를 사용한다. 재시작 검사는 DB·API를 재시작한다. 계약 검사는 고유 이메일 사용자 계정을 남기므로 전용 학습 DB에서 실행한다. AI 검사는 키가 비어 있는 목 모드를 전제로 한다.

현재 compose는 로컬 학습용이다. 공개 배포 전 TLS·Secure 쿠키, Production·seed 해제, 최소 권한 DB 계정, 별도 마이그레이션, 백업·복구, 비밀 저장소·외부 경보, JWT 갱신·폐기를 보강한다. Angular 의존성 보안 경고도 별도 해결해야 한다.

참고: [EF Core SQL Server 제공자](https://learn.microsoft.com/en-us/ef/core/providers/sql-server/), [.NET 지원 정책](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [SQL Server Docker](https://learn.microsoft.com/en-us/sql/linux/quickstart-install-connect-docker?view=sql-server-ver17).
