# study0 — 환경 설정

> 🎯 **목표**: Angular CLI로 프로젝트를 만들고, 폴더 구조와 실행 방법, 앞으로 반복될 핵심 용어를 확인한다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`demo/`](./demo) (개념 연습장), [`project/`](./project) (미니 게시판)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular는 화면, 라우팅, HTTP, 폼, 의존성 주입이 한 세트로 들어 있는 프레임워크다. 프로젝트를 만들고 개발 서버를 띄우는 공식 도구가 Angular CLI다.

| 용어 | 한 줄 |
|---|---|
| Node.js | CLI와 개발 서버가 실행되는 런타임. 이 저장소 확인 버전은 v24.14.0 |
| npm | 패키지 설치 도구. 확인 버전은 11.9.0 |
| Angular CLI | `ng new`, `ng serve`, `ng build`, `ng test`, `ng generate`를 제공하는 명령 도구 |
| standalone 컴포넌트 | `NgModule` 없이 `@Component({ imports: [...] })`로 의존을 직접 적는 현재 기본 방식 |
| `bootstrapApplication` | 브라우저에서 루트 컴포넌트를 시작하는 함수 |
| Zone.js | 클릭, 타이머, HTTP 같은 비동기 작업이 끝난 뒤 화면을 다시 검사하게 하는 라이브러리 |
| Signal | 값이 바뀐 곳만 다시 그리는 상태 단위. 최신 Angular는 Zone.js 없이(zoneless) 이 방향으로 가는 중이다 |
| DI | 클래스가 필요한 서비스를 `new`하지 않고, 프레임워크가 넣어 주는 방식 |
| RxJS `Observable` | 여러 번 값을 보낼 수 있고, 구독을 취소할 수 있는 비동기 스트림. `Promise`는 한 번만 끝난다 |

변경 감지의 기본 그림은 이렇다. `demo/`는 Zone.js가 비동기 작업의 끝을 알려 주면 템플릿 명령을 다시 실행한다. `project/` 게시판은 그 알림을 쓰지 않는다. study11에서 `provideExperimentalZonelessChangeDetection()`를 켜고, 화면 갱신은 signal과 `async` 파이프, 템플릿 이벤트가 맡는다.

이 저장소의 패키지 버전은 Angular 19.2, RxJS 7.8, TypeScript 5.7이다. 재현용 CI·Docker는 Node 22를 사용한다. 로컬 Node 24의 실행 확인과 공식 지원 범위는 구분한다. Angular 19의 의존성 보안 경고는 study16의 미완료 항목이다. `zone.js` 패키지는 테스트 러너에만 남긴다. 게시판 브라우저 번들 polyfill에서는 뺐다.

---

## 🛠️ 실기

### 1. 설치 확인

```bash
node -v   # v24.14.0
npm -v    # 11.9.0
```

### 2. 프로젝트 생성

이미 만들어 둔 앱이 `demo/`와 `project/`다. 같은 조건으로 다시 만든다면 아래와 같다. 라우팅과 CSS를 고르고, 최신 CLI는 standalone을 기본으로 쓴다.

```bash
npx @angular/cli@19 new demo --routing --style=css --ssr=false
cd demo
npm start
```

브라우저 주소는 `http://127.0.0.1:4200/` 이다. `demo`와 `project`를 동시에 띄울 때는 한쪽에 `npx ng serve --port 4300`을 준다.

### 3. 실행 진입점

`project/src/main.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// 실제 main.ts는 /app-config.json을 읽은 뒤 이 함수를 호출한다.
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
```

1. `bootstrapApplication`을 가져온다. 이 함수가 브라우저 앱을 시작한다.
2. `appConfig`는 라우터, HTTP, 변경 감지 제공자를 담는다.
3. `AppComponent`는 화면에 처음 붙는 루트 컴포넌트다.
4. 루트 컴포넌트와 설정을 넘겨 앱을 띄운다.
5. 부트스트랩이 실패하면 콘솔에 이유를 남긴다.

`project/src/index.html`의 `<app-root>`가 루트 컴포넌트가 들어갈 자리다. `<base href="/">`는 라우터가 경로를 계산할 때 기준이 된다.

### 4. 폴더 구조

| 경로 | 역할 |
|---|---|
| `demo/src/app/components` | 카운터, 목록, 폼 같은 작은 연습 |
| `demo/src/app/pages` | 홈, 과일 카탈로그, 로그인, 게시글 |
| `demo/src/app/core` | 가드, 인터셉터, 인증 서비스 |
| `demo/src/app/shared` | 카드, 배지처럼 여러 화면이 쓰는 UI |
| `project/src/app/core` | 앱 전역 싱글턴. 인증, HTTP 오류, 로그 |
| `project/src/app/shared` | 게시글 카드, 날짜 파이프 |
| `project/src/app/features` | 라우트 단위 기능. 게시글, 로그인, 실습실 |
| `project/src/environments` | API 주소와 AI 설정 |
| `angular.json` | 빌드, 개발 서버, 테스트, 예산을 정하는 CLI 설정 |

### 5. 실행 확인

1. [README](./README.md)의 비밀 준비 후 루트에서 `docker compose -f project/docker-compose.yml up -d --build`로 실제 API·DB를 먼저 시작한다. 이어 `cd project` 후 `npm ci`, `npm start`
2. `http://127.0.0.1:4200/` 에 "미니 게시판"과 글 목록이 보이는지 확인
3. 개발자도구 Console에 빨간 오류가 없는지 확인
4. 컴포넌트 파일을 저장하면 개발 서버가 바뀐 부분을 다시 반영한다

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `ng`를 찾을 수 없음 | 전역 CLI가 없음 | 프로젝트 안에서 `npx ng` 또는 `npm start`를 쓴다 |
| PowerShell이 `npm.ps1` 실행을 막음 | 실행 정책 | `npm.cmd start`를 쓰거나 CurrentUser 정책을 RemoteSigned로 둔다 |
| `Port 4200 is already in use` | 이전 개발 서버가 살아 있음 | 그 프로세스를 끄거나 `--port 4300`으로 연다 |
| 빈 화면 | `main.ts`의 부트스트랩 실패, 또는 템플릿 오류 | Console의 첫 오류를 본다 |
| `Unsupported engine` | Node가 패키지가 요구하는 버전보다 낮음 | Node 20 이상, 이 저장소는 22/24에서 확인했다 |

---

## ☐ 체크리스트

- ☑ `node -v`, `npm -v`로 버전을 확인했다
- ☑ Angular CLI로 스캐폴드 생성
- ☑ `demo/`와 `project/`의 역할을 구분할 수 있다
- ☑ `bootstrapApplication`이 루트 컴포넌트와 `appConfig`를 받는 이유를 말할 수 있다
- ☑ `core` / `shared` / `features`가 무엇을 나누는지 말할 수 있다
- ☑ `npm start`로 첫 화면을 열었다
- ☑ `project/` 게시판은 zoneless다. 켜는 방법과 체감은 study11에 있다

## ➡️ 다음 단계 연결

[study1](./study1.md)에서 루트 화면과 템플릿 문법으로 첫 내용을 그린다.
