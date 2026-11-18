# study17 — Docker·배포 자동화

> 🎯 **목표**: Angular 운영 빌드·ASP.NET Core·SQL Server를 Docker로 함께 실행하고 데이터 유지와 배포 조건을 검증한다.

- 대응 코드: [compose](./project/docker-compose.yml), [웹 Dockerfile](./project/Dockerfile), [API Dockerfile](./board-api-dotnet/Dockerfile), [마이그레이션](./board-api-dotnet/Data/Migrations), [CI](./.github/workflows/ci.yml)

## 📖 이론

웹 이미지는 Node 22로 빌드하고 nginx가 정적 파일을 제공한다. API 이미지는 .NET 10 SDK로 게시하고 ASP.NET 런타임에서 비루트 사용자로 실행한다. 호스트에 .NET 10 SDK를 설치하지 않아도 Docker 빌드는 된다. SQL Server는 별도 컨테이너와 영구 볼륨을 쓴다.

브라우저는 8080 nginx의 `/api`에만 접근한다. nginx가 Docker 서비스 이름 `api:5080`으로 전달한다. API는 `db:1433`에 연결한다. 호스트 개발 프록시는 `localhost:5080`이다. API·DB의 호스트 포트는 loopback에만 노출한다.

compose는 로컬 학습 설정이다. Development·예제 계정 seed·HTTP 쿠키·SQL sa 연결을 사용한다. 공개 운영에서는 Production, SeedDemoData=false, CookieSecure=true, HTTPS, 전용 DB 계정, 비밀 주입·백업이 필요하다. 현재 설정을 그대로 공개 운영 완료라고 부르지 않는다.

## 🛠️ 실기 — 코드·줄별 설명

### 1. 비밀 준비와 실행

최초에는 `project/.env.example`을 `project/.env`로 복사하고 SQL_PASSWORD와 JWT_SECRET을 무작위 값으로 바꾼다. 이번 환경에는 값을 생성해 두었다. `.env`는 Git과 Docker 빌드 문맥에서 제외한다. SQL 비밀번호는 대·소문자, 숫자, 특수문자를 포함한다. JWT 비밀은 32바이트 이상이다.

```bash
docker compose -f project/docker-compose.yml up -d --build
node board-api-dotnet/tests/wait-for-api.mjs
```

1. SQL Server의 health가 정상일 때 API를 시작한다. API는 EF 마이그레이션 후 개발 데이터가 없는 경우에만 seed한다.
2. API의 DB 연결까지 정상인지 기다린다. 이후 `http://127.0.0.1:8080`을 연다.

### 2. API 이미지

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Board.Api.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=5080
EXPOSE 5080
ENTRYPOINT ["dotnet", "Board.Api.dll"]
```

1. SDK가 있는 단계에서만 컴파일한다.
2. 작업 경로를 고정한다.
3. 의존성 파일을 먼저 복사해 restore 층을 재사용한다.
4. NuGet 패키지를 복원한다. 버전은 csproj에 지정되어 있다.
5. 소스와 마이그레이션을 복사한다. bin·obj·비밀은 제외한다.
6. Release 결과를 `/out`에 만든다.
7. 실행 단계에는 SDK 대신 런타임만 둔다.
8. 실행 폴더를 만든다.
9. 게시 결과만 복사한다.
10. 이미지가 제공하는 비루트 사용자로 실행한다.
11. 컨테이너 HTTP 포트를 설정한다.
12. 문서화한 컨테이너 포트다. 호스트 노출은 compose가 결정한다.
13. 서버 DLL을 시작한다.

nginx의 `try_files $uri $uri/ /index.html`이 `/login`, `/posts/1` 직접 새로고침을 처리한다. `/api/`, `/health`, `/api-docs`는 API로 전달한다.

### 3. 재시작·테스트

```bash
node --test board-api-dotnet/tests/api.test.mjs
node board-api-dotnet/tests/persistence.mjs
```

첫 명령은 실제 DB의 계약을 검사한다. 두 번째는 임시 글 생성 → DB·API 재시작 → 글·사용자·JWT 복원 확인 → 임시 글 삭제 순서다. 새 테스트 계정은 계약 검사마다 고유 이메일로 생성되어 로컬 DB에 남는다. 사용자 삭제 API는 없다.

`docker compose ... down`은 컨테이너를 내리고 볼륨은 유지한다. `down -v`는 DB를 지우므로 평소 종료에 쓰지 않는다. 운영의 다중 API 인스턴스에서는 시작 시 마이그레이션 대신 별도 배포 작업으로 한 번만 수행한다.

### 4. 자동화와 측정

2026-11-19 최신 Docker 웹 빌드 초기 합계는 **304.03 kB**, 전송 추정 **83.13 kB**, 실습실 지연 청크 **40.34 kB**다. 이 소스로 8080 E2E를 실행했다. 예전 323.94 kB 이미지 기록을 현재 검증으로 사용하지 않는다.

CI 파일은 lint·포맷·Karma·빌드·MCP → 임시 비밀 생성 → compose → 실제 API 계약·재시작 검사 → Playwright 순서다. 원격 실행은 아직 없다. 레지스트리·공개 호스트 정보가 없으므로 이미지 업로드와 외부 자동 배포는 미완료다.

## ⚠️ 오류 노트

| 증상 | 확인·해결 |
|---|---|
| SQL_PASSWORD/JWT_SECRET 누락 | `.env.example`만으로 실행되지 않는다. 실제 `.env`를 준비한다 |
| SQL 로그인 실패 | 이미 생성된 볼륨의 sa 비밀번호와 `.env` 값이 달라졌는지 확인 |
| API가 DB 준비 전 시작 | DB health·depends_on, API 재시도 로그 확인 |
| 502 또는 5080 충돌 | 예전 Node 서버와 충돌 여부, API 컨테이너 상태 확인 |
| SDK9로 net10 빌드 실패 | .NET 10 SDK를 쓰거나 문서의 Docker 빌드를 실행 |
| EF 도구의 메타데이터/패키지 파일 누락 | 같은 SDK 컨테이너에서 restore·build·ef 명령을 실행하고 NuGet 볼륨을 공유 |

## ☐ 체크리스트

- ☑ Angular + ASP.NET Core + SQL Server의 compose·프록시 연결
- ☑ EF 마이그레이션, 개발 seed, 영구 SQL 볼륨
- ☑ 최신 소스 Docker 재빌드와 8080 브라우저 E2E
- ☑ DB·API 재시작 후 데이터·서명 세션 유지
- ☑ CI에 전체 검증 명령을 연결했다
- ☐ GitHub Actions 원격 성공 기록
- ☐ 레지스트리 업로드·외부 URL·자동 배포·운영 HTTPS·백업 복구

## ➡️ 다음 단계 연결

[study18](./study18.md)에서 서버에만 모델 키를 두고 AI 요약과 로컬 MCP의 경계를 확인한다.
