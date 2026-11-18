# study8 — 구조화·재사용

> 🎯 **목표**: 전역 싱글턴, 재사용 UI, 화면 기능을 폴더로 나누고 API 주소를 환경 파일로 뺀다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`project/src/app`](./project/src/app), [`project/src/environments`](./project/src/environments), [`project/angular.json`](./project/angular.json)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

폴더를 나누는 이유는 예쁘게 보이려고가 아니다. 고칠 때 여는 범위를 줄이려고다.

| 폴더 | 넣는 것 | 넣지 않는 것 |
|---|---|---|
| `core` | 앱에 하나만 있는 인증, 인터셉터, 오류 표시, 로그 | 특정 게시글 화면 |
| `shared` | 여러 기능이 쓰는 카드, 파이프 | HTTP 주소, 로그인 규칙 |
| `features/posts` | 목록, 상세, 게시글 서비스, 즐겨찾기 | 라우터 제공자 설정 |
| `features/auth` | 로그인 페이지, 마이페이지 | 토큰을 붙이는 인터셉터. 그건 `core` |
| `features/lab` | 상태 비교와 AI 목 호출 | 게시판 본 기능 |
| `environments` | 주소, 빌드마다 바뀌는 값 | 컴포넌트 |

`providedIn: 'root'`인 서비스는 누가 먼저 `inject`하든 같은 인스턴스다. 그래서 인증은 `core`에 두고 게시글 화면은 그 서비스를 주입만 한다. 화면이 토큰 키를 직접 읽으면 키가 여러 파일로 퍼진다.

환경 파일은 개발용 `environment.ts`와 운영용 `environment.production.ts`로 나눈다. `angular.json`의 `fileReplacements`가 운영 빌드에서 파일을 갈아끼운다. 비밀 키를 여기 커밋하지 않는다. 모델 키와 JWT 서명 비밀·DB 연결 문자열은 서버 실행 환경에만 둔다.

---

## 🛠️ 실기

### 1. 지금 트리

```text
project/src/app/
  app.config.ts          라우터, HTTP, 변경 감지
  app.routes.ts          주소와 기능 컴포넌트
  core/auth/             세션, 가드, 인터셉터
  core/http/             요청 id 표시, 개발 로그
  core/ai/               요약 호출. 키 없으면 목 응답
  core/state/            실습실용 NgRx SignalStore
  shared/                게시글 카드, 날짜 파이프
  features/posts/        목록·상세·CRUD·즐겨찾기
  features/auth/         로그인, 마이페이지
  features/lab/          상태·날짜·요약 비교
  components/app-header/ 모든 화면 위의 막대
  models/                Post, Comment, User
```

헤더는 `features` 밖에 있다. 어느 한 기능의 소유가 아니라 앱 껍데기이기 때문이다.

### 2. 환경 파일

`project/src/environments/environment.ts`

```ts
export const environment = {
  production: false,
  apiBaseUrl: '/api',
};
```

1. 개발 빌드다.
2. 게시글과 요약은 같은 `/api`를 쓴다. 모델 키는 이 파일에 없다.
3. compose가 `project/.env`의 OPENAI_API_KEY를 ASP.NET Core 실행 환경에 주입한다. 비어 있으면 서버가 목 문장을 반환한다. dotnet 직접 실행 시에는 환경 변수나 User Secrets를 사용한다.

운영 파일은 `production: true`만 다르고 주소는 같다. `angular.json` 운영 설정은 아래 교체를 한다.

```json
"fileReplacements": [
  {
    "replace": "src/environments/environment.ts",
    "with": "src/environments/environment.production.ts"
  }
]
```

개발 서버의 `proxyConfig`는 `proxy.conf.json`이다. `/api`로 시작하는 상대 요청만 `localhost:5080`으로 간다.

### 3. 재사용 카드

`PostCardComponent`는 목록만 안다. 제목 링크와 별 버튼만 있고, HTTP와 로그인 규칙은 부모가 처리한다. 카드가 `AuthService`를 직접 부르면 카드 테스트를 할 때마다 인증을 만들어야 한다. 부모는 `[isFavorite]`와 `(toggleFavorite)`만 넘긴다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 운영 빌드인데 개발 주소 | `fileReplacements` 경로가 틀려 교체가 안 됨 | `ng build` 로그와 치환 경로를 맞춘다 |
| `environment` import 경로 오류 | `features` 깊이와 `core` 깊이가 다름 | `../../../environments/environment`처럼 상대 경로를 센다 |
| 기능 폴더가 `core` 서비스를 다시 구현 | 복사해서 키 이름이 달라짐 | AuthService는 사용자 signal과 쿠키 API를 한 곳에서 처리한다. 로그인 저장 키는 없다 |
| 공유 컴포넌트가 라우트를 하드코딩 | 카드가 상세 주소 규칙을 소유 | 이 앱은 카드가 `/posts/:id`를 안다. 규칙이 바뀌면 카드만 고친다 |
| 프록시가 안 탐 | `apiBaseUrl`이 `https://`로 시작 | 프록시를 쓸 거면 서비스를 `/api` 상대 경로로 바꾼다. 현재 서비스는 `/api` 상대 주소를 사용한다 |

---

## ☐ 체크리스트

- ☑ `core` / `shared` / `features`에 파일을 나눠 두었다
- ☑ API 주소가 컴포넌트가 아니라 `environment`에 있다
- ☑ 운영 빌드가 `environment.production.ts`로 갈아끼운다
- ☑ 카드는 입출력만 받고 인증을 직접 호출하지 않는다
- ☑ AI 키는 빈 값이고 저장소에 비밀이 없다
- ☑ `proxy.conf.json`의 대상이 `localhost:5080`인 이유를 말할 수 있다
- ☑ 실행 시 `public/app-config.json`이 `apiBaseUrl`을 덮어쓴다. 서명 비밀은 ASP.NET Core의 `Jwt__Secret`이고 DB는 `ConnectionStrings__Board`다. compose에서 project/.env 값을 주입한다. 클라우드 비밀 저장소는 없다

## ➡️ 다음 단계 연결

[study9](./study9.md)에서 이 구조의 서비스와 가드, HTTP를 브라우저 없이 검사한다.
