# studyMidpoint — 중간 응용: 게시판과 로그인

> 🎯 **목표**: study0~10의 컴포넌트·DI·폼·라우터·HttpClient·인증만으로 작은 게시판을 완성한다.

- 위치: study10 다음, study11 이전
- 대응 코드: [project](./project). API의 내부 구현·배포 심화는 study17과 studyFinal에서 읽는다.

## 📖 이론

### 목표

Angular의 기본 기능으로 “로그인 → 글쓰기 → 목록·상세 → 수정·삭제 → 새로고침 유지”를 잇는다. API는 공통 스펙을 만족하는 서버라는 전제로 사용한다. 현재 연결 서버는 ASP.NET Core·SQL Server이며 직접 DB에 연결하는 코드는 Angular에 없다.

### 기능 목록

- 회원가입, 로그인, 로그아웃, 쿠키 기반 새로고침 복원
- 서버 제목·본문 검색, 10개씩 페이지, 전체 건수·마지막 페이지 표시
- 목록·상세·댓글 조회, 로그인 작성, 자기 글 수정·삭제
- 로그인 뒤 즐겨찾기. 저장은 브라우저 localStorage, 필터 범위는 현재 페이지
- 보호된 마이페이지, returnUrl 복귀, 401·X-Request-Id 표시

SignalStore·성능 측정·Docker·AI·MCP는 이 중간 응용의 필수 학습 항목에 넣지 않는다. 저장소의 최종 소스에는 심화 코드가 같이 있지만 이 문서의 구현 순서는 기초 기능만 사용한다.

## 🛠️ 실기 — 코드·줄별 설명

### 폴더 구조

```text
project/src/
  app/
    app.config.ts             라우터·HTTP·시작 시 세션 복원
    app.routes.ts             화면 경로·가드
    core/auth/                AuthService·가드·인터셉터
    core/http/                요청 번호·개발 로그
    shared/post-card/         입력·출력만 받는 카드
    features/posts/           목록·상세·CRUD·즐겨찾기
    features/auth/            가입·로그인·마이페이지
    components/app-header/    공통 헤더
    models/                   화면 모델과 API data/meta 타입
  environments/               API 기준 주소
```

### 구현 순서

1. study0처럼 CLI 프로젝트를 만들고 study1의 보간·조건·반복으로 첫 화면을 그린다.
2. 컴포넌트·서비스를 나누고 `inject`로 같은 서비스를 공유한다.
3. `environment.apiBaseUrl='/api'`와 개발 프록시를 설정한다.
4. API의 data/meta 응답을 모델로 정하고 `PostService`에서 화면 모델로 변환한다.
5. 목록·검색·페이지는 query → `switchMap` → `async` 파이프로 연결한다.
6. 상세 주소 id로 글·댓글을 `forkJoin`하여 읽는다.
7. 등록 반응형 폼을 만들고 서버 성공 뒤 목록을 재조회한다. 수정은 PATCH, 삭제는 DELETE다.
8. 가입·로그인은 입력 검증 후 서버 응답을 기다린다. 비밀번호 길이만으로 성공 처리하지 않는다.
9. 사용자 signal을 헤더·가드에서 공유한다. 시작 시 `/auth/me`를 기다린다.
10. 마이페이지 가드에 returnUrl을 두고, 인터셉터에서 API 쿠키·변경 요청 헤더·401·요청 번호를 처리한다.
11. 기초 테스트·빌드를 실행하고 아래 체크리스트를 브라우저에서 확인한다.

등록 핵심을 읽는다. 전체 성공·오류 분기는 실제 컴포넌트에 있다.

```ts
const { title, body } = this.draft.getRawValue();
this.postService.createPost(title, body).subscribe({
  next: () => {
    this.draft.reset();
    this.query.next({ page: 1, q: this.query.value.q });
  },
});
```

1. 검증을 통과한 폼에서 문자열을 읽는다.
2. 구독해서 POST를 실행한다.
3. 성공 응답을 받은 뒤 입력을 비운다.
4. 검색 조건을 유지한 채 서버 1페이지를 다시 읽는다. 화면 전용 가짜 글 목록에 쌓지 않는다.

## ⚠️ 오류 노트

- 401: 작성 전에 로그인한다. 화면 가드가 있어도 서버가 별도로 검사한다.
- 403: 남의 글 수정·삭제 또는 요청 출처·변경 헤더를 확인한다.
- 새로고침 뒤 사라지는 글: API·DB 연결과 서버 성공 여부를 확인한다. 404를 화면 성공으로 바꾸지 않는다.
- 로그인 오류가 보이지 않음: 비동기 문구를 signal로 유지한다.

## ☐ 완성 체크리스트

- ☑ 목록·상세·댓글 조회, 서버 제목·본문 검색과 페이지 메타데이터
- ☑ 빈 글 클라이언트 검증과 서버 검증
- ☑ 회원가입·올바른 비밀번호 로그인·로그아웃·새로고침 유지
- ☑ 자기 글 등록·수정·삭제 후 서버 결과 재조회
- ☑ 마이페이지 가드와 returnUrl
- ☑ 실제 백엔드 연동 + `/api` 프록시
- ☑ 대표 조합 5번 API 연결 — ASP.NET Core + SQL Server를 선택
- ☑ 로그인 뒤 즐겨찾기를 토글하고 localStorage에 유지
- ☐ 즐겨찾기를 계정별로 나누고 전체 페이지에서 조회

## 회고

공식 폼·HTTP·라우터·DI를 연결하면 작은 서비스가 완성된다. 서버의 저장 성공과 화면 메모리 갱신을 혼동하지 않는 것이 핵심이었다. 상세의 읽기와 작성자의 수정 권한은 서로 다른 조건이다. 기초에서는 API 계약과 실패 흐름을 먼저 확인하고 성능·배포·운영은 다음 구간으로 넘긴다.

## ➡️ 다음 단계 연결

[study11](./study11.md)에서 signal·BehaviorSubject·SignalStore, 요청 취소와 캐시 무효화를 구분한다.
