# study6 — DB·API 연동

> 🎯 **목표**: Angular HttpClient로 ASP.NET Core API를 호출해 SQL Server에 게시글 CRUD를 반영한다.

- 대응 코드: [PostService](./project/src/app/features/posts/post.service.ts), [API](./board-api-dotnet/Program.cs), [DB 모델](./board-api-dotnet/Data/BoardDb.cs)
- Angular의 HTTP 학습에 필요한 서버 계약만 다룬다. 다른 프론트엔드 프레임워크와 비교하지 않는다.

## 📖 이론

브라우저 → 같은 출처 `/api` → 프록시 → ASP.NET Core → EF Core → SQL Server 순서다. Angular는 DB 연결 문자열을 알지 못한다. API가 사용자 신원과 입력을 검증하고 SQL로 저장한다. `HttpClient`는 Observable을 반환하며 구독할 때 요청한다.

기준은 노션 [게시판 공통 API 스펙 v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e)이다.

| 작업 | 요청 | 성공 응답 |
|---|---|---|
| 목록·검색 | `GET /api/posts?page=1&limit=10&q=검색` | `{ data: [...], meta: { page, limit, total, totalPages, q } }` |
| 상세 | `GET /api/posts/1` | `{ data: { id, title, body, tags, author, commentCount, createdAt, updatedAt } }` |
| 등록 | `POST /api/posts` | 201, `Location`, `{ data: ... }` |
| 부분 수정 | `PATCH /api/posts/1` | 200, `{ data: ... }` |
| 삭제 | `DELETE /api/posts/1` | 204, 빈 본문 |
| 댓글 | `GET/POST /api/posts/1/comments`, `DELETE /api/comments/1` | 목록 200, 등록 201, 삭제 204 |

오류는 `{ error: { code, message, fields, requestId } }`다. 응답 헤더 `X-Request-Id`와 본문의 번호가 같다. 수정·삭제는 작성자만 가능하며 관리자도 남의 글을 고치지 않는다. `userId`를 브라우저가 보내도 서버 작성자는 JWT의 사용자 번호로 정한다.

`map`은 응답 변환, `switchMap`은 이전 요청 취소, `catchError`는 실패 처리, `forkJoin`은 완료되는 여러 HTTP 요청의 결과 결합이다. 요청 취소와 캐시는 서로 다른 기능이다.

## 🛠️ 실기 — 코드·줄별 설명

### 1. 서버와 화면 실행

루트에서 `docker compose -f project/docker-compose.yml up -d --build`를 실행한다. 최초 비밀 설정은 [README](./README.md)를 따른다. `http://127.0.0.1:8080`은 nginx 운영 빌드다. 개발 화면은 별도 `cd project` → `npm ci` → `npm start`로 4200에서 연다. 두 화면 모두 5080의 ASP.NET Core를 쓴다.

### 2. 응답을 화면 모델로 바꾸기

다음은 `PostService`의 목록 처리 핵심 발췌다. 전체 캐시 분기는 실제 파일에 있다.

```ts
const params = new HttpParams().set('page', page).set('limit', limit).set('q', q.trim());
return this.http.get<ApiPage<ServerPost>>(this.url, { params }).pipe(
  map((result) => ({ data: result.data.map(toPost), meta: result.meta })),
);
```

1. 서버가 정한 `page`, `limit`, `q`를 인코딩한다. `_page`, `_limit`은 쓰지 않는다.
2. 제네릭은 공통 응답의 타입이다. 런타임 검증을 대신하지 않는다.
3. `result.data`의 각 글을 `toPost`로 바꾼다. `author.id`가 화면 모델의 `userId`가 된다. `meta`는 페이지 버튼과 전체 건수에 쓴다.

```ts
return this.http.patch<ApiResponse<ServerPost>>(`${this.url}/${post.id}`, {
  title: post.title,
  body: post.body,
}).pipe(map((result) => toPost(result.data)), tap(() => this.pageCache.clear()));
```

1. 부분 수정은 PATCH로 요청한다.
2. 바꿀 제목과 본문만 보낸다. 작성자 번호는 보내지 않는다.
3. 응답을 화면 모델로 바꾸고 캐시를 비운다. 등록과 삭제 성공 때도 캐시를 비운다.

목록 컴포넌트는 성공 뒤 서버를 다시 조회한다. 새로고침해도 글이 남는다. 404는 실패로 표시하며 화면만 성공으로 바꾸지 않는다. 검색어는 250ms debounce 후 1페이지부터 서버에서 제목·본문 전체를 검색한다. 즐겨찾기 필터는 현재 서버 페이지 안에서만 적용한다.

### 3. 저장과 조회가 이어지는 곳

```csharp
db.Posts.Add(post);
await db.SaveChangesAsync();
return Results.Created($"/api/posts/{post.Id}", new { data = PostDto(post) });
```

1. 요청에서 검증하고 신원을 지정한 엔티티를 추적 대상으로 넣는다.
2. SQL Server에 INSERT하고 생성된 id를 받는다.
3. 201과 Location, 공통 data 응답을 반환한다. 전체 엔드포인트는 작성자 로딩도 수행한다.

SQL 데이터는 Docker의 `board-sql` 볼륨에 남는다. 초기 스키마는 [EF 마이그레이션](./board-api-dotnet/Data/Migrations)이며 API 시작 시 적용한다. 이것은 단일 인스턴스 학습 설정이다.

## ⚠️ 오류 노트

| 증상 | 확인·해결 |
|---|---|
| 목록이 `map is not a function` | 배열 자체가 아니라 `result.data`를 읽는다 |
| 요청이 401 | 로그인 후 작성한다. 공개 GET은 로그인 없이 가능하다 |
| 수정·삭제가 403 | 다른 작성자 글이다. 가드와 별도로 서버가 검사한다 |
| 등록 후 화면이 옛 목록 | 성공 뒤 페이지 캐시 무효화와 재조회를 확인한다 |
| 5080 포트 충돌 | 예전 `board-api/server.mjs`와 새 API를 동시에 실행하지 않는다 |
| DB 연결 실패 | `docker compose ... ps`, DB health와 `.env` 설정을 확인한다. 비밀을 출력하지 않는다 |

## ☐ 체크리스트

- ☑ HttpClient로 REST 연동
- ☑ RxJS 기초 (`map`, `switchMap`, 오류 처리, `forkJoin`)
- ☑ 실제 백엔드 연동 + 프록시: `/api` → ASP.NET Core 5080
- ☑ 대표 조합 5번(Angular + ASP.NET Core + SQL Server/Oracle)의 API에 연결, 프록시 설정 — SQL Server를 선택했다
- ☑ 공통 data/meta/error 계약, PATCH, Location, 204를 적용했다
- ☑ 비로그인 작성 401, 남의 글 수정·삭제 403을 실제 DB 계약 테스트로 확인했다
- ☑ SQL Server·API 재시작 뒤 게시글·계정·서명 세션이 유지된다
- ☐ 외부 공개 URL에서 같은 CRUD를 검증한다

## ➡️ 다음 단계 연결

[study7](./study7.md)에서 서버 로그인과 HttpOnly JWT 쿠키, 가드, 인터셉터의 역할을 연결한다.
