# study10 — 배포·정리

> 🎯 **목표**: 운영 빌드를 만들고 용량 예산을 확인한 뒤, study0~9에서 만든 게시판 조각을 한 장으로 복습한다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`project/angular.json`](./project/angular.json), [`project/package.json`](./project/package.json)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

`ng serve`는 개발용이다. 저장할 때마다 다시 묶고, 용량 최적화는 하지 않는다. 사용자에게 줄 파일은 `ng build`가 `dist/project/browser`에 만든다. 운영 설정은 파일을 해시한 이름으로 바꾸고, `environment.production.ts`로 갈아끼우며, 예산보다 크면 빌드를 실패시킨다.

`angular.json`의 예산은 초기 묶음 경고 500kB, 오류 1MB, 컴포넌트 스타일 경고 4kB, 오류 8kB다. 예산을 넘는다는 것은 첫 화면이 무겁다는 신호다. 줄이는 방법은 study12에서 측정과 함께 본다.

빌드 결과물은 정적 파일이다. 서버는 `index.html`과 js, css를 그대로 내려 주면 된다. 주소 `/posts/1`을 새로고침해도 `index.html`을 줘야 라우터가 그 화면을 연다. 그 설정은 study17의 nginx다. 외부 호스팅에 올린 주소는 아직 없다.

---

## 🛠️ 실기

### 1. 빌드

```bash
cd project
npx ng build --configuration=production
```

아래는 2026-11-18의 과거 측정이다. 현재 ASP.NET 연결·지연 로딩 적용 빌드는 초기 304.03 kB, 전송 추정 83.13 kB다.

2026-11-18에 목록 등록 폼을 넣기 직전 측정이다. 이후 등록·수정·삭제를 더하면 수 kB 커진다. Docker로 다시 빌드한 운영 묶음은 main 320.56 kB, 초기 합계 358.87 kB(전송 추정 95.83 kB)였다. 둘 다 경고선 500kB 아래다.

| 파일 | 원본 | 전송 추정 |
|---|---|---|
| main | 318.32 kB | 82.94 kB |
| polyfills | 34.59 kB | 11.33 kB |
| styles | 3.73 kB | 1.07 kB |
| 초기 합계 | 356.64 kB | 95.34 kB |

경고선 500kB보다 작다. 출력 위치는 `project/dist/project/browser`다.

### 2. 기초 구간이 게시판에서 만나는 곳

| study | 게시판에서의 자리 |
|---|---|
| 0 | `npm start`, `bootstrapApplication`, `core/shared/features` |
| 1 | 헤더의 `{{ }}`, 목록의 `@for`와 `@if` |
| 2 | standalone 컴포넌트, `inject`, 카드의 입력과 출력 |
| 3 | `Post` 모델, 로그인 signal, 즐겨찾기 `Set` |
| 4 | `/`, `/posts/:id`, `/login`, `/mypage`, `/lab`, 가드 |
| 5 | 로그인 폼과 글 등록 폼의 검증 문장 |
| 6 | 목록·상세·등록·수정·삭제, `switchMap`, `forkJoin` |
| 7 | 실제 JWT HttpOnly 쿠키, `/auth/me`, 401, `X-Request-Id` |
| 8 | 환경 파일, 카드는 화면만 담당 |
| 9 | Angular 테스트 15개. 실제 API 검사는 study15 |

`demo/`는 같은 개념을 과일 카탈로그와 카운터로 먼저 연습한 폴더다. `project/`는 그 개념으로 만든 미니 게시판이다.

### 3. 복습 문제

답을 코드에서 가리키며 말한다. 정답 문장을 외우지 않는다.

1. `main.ts`에서 앱을 시작하는 함수 이름과, 그 함수가 받는 두 인자는 무엇인가?
2. `@for`의 필수 track이 없을 때 어떤 오류가 나는가? 인덱스 대신 id를 쓰는 이유는?
3. `providedIn: 'root'`를 빼면 어떤 런타임 오류가 나는가?
4. 로그인 사용자 스트림을 템플릿에서 구독하는 문자는 무엇인가?
5. `/mypage`로 직접 들어갔을 때 가드가 만드는 쿼리 이름은 무엇인가?
6. 이메일 형식이 틀린데 오류가 안 보이면 템플릿의 어떤 조건이 빠졌을 가능성이 큰가?
7. 페이지를 연속으로 누를 때 이전 응답을 버리는 연산자는 무엇인가?
8. 쿠키 전달과 변경 요청 헤더를 설정할 때 원본 req를 복제하는 메서드는 무엇인가?
9. 운영 빌드가 개발 환경 파일 대신 읽는 파일 이름은 무엇인가?
10. 테스트에서 실제 서버로 요청이 나가지 않게 응답을 넣어 주는 클래스 이름은 무엇인가?

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `budget exceeded` | 초기 묶음이 1MB를 넘음 | 라우트 지연 로딩, 안 쓰는 패키지 제거. study12 |
| 빌드는 되는데 새로고침 404 | 호스트가 SPA fallback을 안 함 | nginx `try_files`. study17 |
| `dist`를 열었더니 모듈 오류 | `file://`로 html을 염 | 정적 서버로 연다. `npx ng serve`는 개발용이고, 결과를 보려면 서버가 필요하다 |
| 운영에서 개발 API를 침 | `fileReplacements` 누락 | `angular.json`의 production 설정을 확인 |
| 개발 서버 용량과 운영 용량을 비교 | 개발 묶음은 최적화 전 | 비교는 `ng build` 표로만 한다 |

---

## ☐ 체크리스트

- ☑ `ng build`가 성공하고 초기 합계가 500kB 경고보다 작다
- ☑ 출력 폴더가 `dist/project/browser`다
- ☑ study0~9의 코드 위치를 위 표에서 열 수 있다
- ☑ 복습 문제 10개의 답을 파일을 열고 가리킬 수 있다
- ☐ 빌드 결과를 외부 URL에 올렸다. study17에서 이미지까지 만들고, 공개 주소는 아직 없다

## ➡️ 다음 단계 연결

[studyMidpoint](./studyMidpoint.md)에서 study0~10만으로 게시판과 로그인을 처음부터 다시 조립하는 순서를 적는다. 심화 상태와 배포 자동화는 그 다음이다.
