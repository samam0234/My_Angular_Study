# study0 — Angular 시작 전 기초 이론

이 문서는 실습(코드 작성) 이전에, Angular에서 앞으로 나올 용어와 개념을 미리 이해하기 위한 문서입니다.
[Vue.js 학습](../vue.js/study0.md), [React 학습](../react/study0.md)을 먼저 마친 상태를 전제로, **React와 다른 점 위주로** 정리했습니다.

```
- [ ] Angular CLI로 스커폴드 생성
- [ ] 컴포넌트 / 템플릿 / 스타일 / 모듈
- [ ] 디펜던시 주입
- [ ] 라우팅 + 가드
- [ ] 반응형 폼 (Reactive Forms)
- [ ] HttpClient로 REST 연동
- [ ] RxJS 기초 (map, switchMap, error)
- [ ] 인터셉터로 JWT 접붙
```

---

## 0. Angular는 "프레임워크"다 — React와의 첫 번째 차이

React는 UI를 그리는 라이브러리 하나만 담당하고, 라우팅·상태관리·HTTP 통신은 전부 서드파티(`react-router-dom`, `zustand`, `axios`)를 골라 조합해야 했습니다.

Angular는 다릅니다. Google이 만든 **올인원(batteries-included) 프레임워크**로, 아래 항목이 전부 공식 패키지 하나(`@angular/core` 생태계) 안에 들어 있습니다.

- 라우팅 → `@angular/router` (공식, 내장)
- HTTP 통신 → `@angular/common/http`의 `HttpClient` (공식, 내장)
- 폼 처리 → `@angular/forms` (공식, 내장)
- 의존성 주입(DI) → `@angular/core`에 프레임워크 차원에서 내장
- 프로젝트 생성/빌드 도구 → `Angular CLI` (공식, Vite/webpack을 내부에서 감싸서 제공)

**그래서 Angular 생태계는 "선택지가 적고 정해진 방식이 있다"는 게 특징입니다.** React처럼 "팀마다 조합이 다른" 상황이 잘 안 생깁니다. 대신 배워야 할 공식 개념(DI, RxJS, 모듈 시스템)이 많아서 초반 진입 장벽이 React보다 높습니다. 이 학습 로드맵에서는 Angular 공식 스택만으로 React demo/project와 동일한 기능을 재구현합니다.

## 1. 변경 감지(Change Detection) — Virtual DOM과 다른 원리

React/Vue는 **Virtual DOM**을 만들어 이전 트리와 비교(diffing)한 뒤 달라진 부분만 실제 DOM에 반영합니다.

Angular는 접근 자체가 다릅니다.

> Angular는 `Zone.js`라는 라이브러리로 `setTimeout`, `click` 이벤트, `fetch` 응답 같은 **비동기 작업이 끝나는 시점**을 전부 감지합니다. 그 시점마다 "혹시 화면에 영향을 줄 데이터가 바뀌었는지" 컴포넌트 트리를 훑어보고(Change Detection), 바뀐 부분만 실제 DOM에 반영합니다. Virtual DOM처럼 트리 전체를 새로 만들어 비교하는 게 아니라, **컴파일 시점에 미리 생성해둔 "이 템플릿의 이 부분은 이 표현식과 연결돼 있다"는 정보(구조화된 명령어)를 그대로 재실행**하는 방식이라 비교 자체가 없습니다.

| | React | Angular |
|---|---|---|
| 변경 감지 트리거 | `setState`/`useState` setter 호출 | Zone.js가 감지하는 모든 비동기 이벤트(클릭, 타이머, HTTP 응답 등) |
| 반영 방식 | Virtual DOM 생성 → 이전 트리와 diff → 실제 DOM 패치 | 컴파일된 템플릿 명령어를 재실행해 바뀐 바인딩만 실제 DOM에 반영 (diff 없음) |
| 최근 방향 | React 19: Compiler로 자동 메모이제이션 | Angular 17+: `Signal`s로 Zone.js 없이(zoneless) 필요한 부분만 정밀 갱신하는 방향으로 전환 중 |

**실무 포인트**: 이 커리큘럼은 최신 Angular(17+) 방식을 따르므로, 나중에 `Signal` 기반 상태(`signal()`, `computed()`)도 다룹니다. 이는 Vue 3의 `ref`/`computed`와 개념적으로 매우 유사합니다.

## 2. 템플릿 — JSX와 다른 접근

### 2.1 템플릿은 "HTML + 전용 문법"이다

JSX는 "JS 안에 HTML을 넣는" 방식이라 JS 문법(`map`, `&&`, 삼항연산자)을 그대로 씁니다. Angular 템플릿은 정반대로, **HTML 파일 안에 Angular 전용 바인딩 문법을 추가**하는 방식입니다. Vue의 `<template>`과 철학이 같습니다(둘 다 컴파일러가 별도로 해석하는 템플릿 언어).

```html
<!-- fruit-card.component.html -->
<div class="card">
  <h3>{{ fruit.name }}</h3>
  <p [class.low-stock]="fruit.stock < 5">재고: {{ fruit.stock }}개</p>
  <button (click)="onBuy()">구매</button>
</div>
```

### 2.2 React JSX → Angular 템플릿 대응표

| React JSX | Angular 템플릿 | 비고 |
|---|---|---|
| `{message}` | `{{ message }}` | 텍스트 삽입(interpolation). 둘 다 "JS 표현식 결과를 넣어라"는 뜻 |
| `src={imageUrl}` | `[src]="imageUrl"` | 프로퍼티 바인딩. 대괄호 `[]`로 표현 |
| `onClick={handler}` | `(click)="handler()"` | 이벤트 바인딩. 소괄호 `()`로 표현, 메서드 호출 형태로 씀 |
| `value={value} onChange={...}` | `[(ngModel)]="value"` | 양방향 바인딩 문법이 **있음**(`FormsModule` 필요). React는 직접 조립해야 했지만 Angular는 문법 하나로 끝 |
| `{cond && <p>...</p>}` | `@if (cond) { <p>...</p> }` | Angular 17+ 신문법. 구버전은 `*ngIf="cond"` |
| `{items.map(item => <li key={item.id}>...</li>)}` | `@for (item of items; track item.id) { <li>...</li> }` | Angular 17+ 신문법. 구버전은 `*ngFor="let item of items; trackBy: ..."`. `track`(key)이 문법에 필수로 포함됨 |
| `className="..."` | `class="..."` | Angular는 HTML 표준 그대로 `class` 사용 가능 |

**한 줄 요약**: React는 "템플릿 전용 문법이 없다"가 특징이고, Angular는 "템플릿 전용 문법이 풍부하다"가 특징입니다. Vue를 배운 사람이라면 Angular 템플릿이 오히려 더 친숙하게 느껴질 수 있습니다(`v-if`↔`@if`, `v-for`↔`@for`, `v-model`↔`[(ngModel)]`).

### 2.3 구조적 디렉티브(Structural Directive)라는 개념

`@if`, `@for`, (구버전의 `*ngIf`, `*ngFor`)처럼 **DOM 자체를 추가/제거**하는 문법을 구조적 디렉티브라고 부릅니다. React에는 이런 전용 문법이 없고 JS 조건문/배열 메서드가 그 역할을 대신했다는 점을 기억하면, "왜 Angular엔 이런 특수 문법이 따로 있지?"에 대한 답이 됩니다 — Angular 템플릿은 순수 JS가 아니라 컴파일러가 해석하는 별도 문법이기 때문입니다.

## 3. 컴포넌트 = 데코레이터가 붙은 클래스

React의 컴포넌트는 "JSX를 반환하는 함수"였습니다. Angular의 컴포넌트는 **`@Component` 데코레이터가 붙은 TypeScript 클래스**입니다.

```typescript
// fruit-card.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-fruit-card',       // 템플릿에서 <app-fruit-card>로 사용
  templateUrl: './fruit-card.component.html',
  styleUrl: './fruit-card.component.css',
})
export class FruitCardComponent {
  @Input() fruit!: { name: string; stock: number };

  onBuy() {
    console.log(`${this.fruit.name} 구매`);
  }
}
```

| | React | Angular |
|---|---|---|
| 정의 단위 | 함수 | 클래스(`@Component` 데코레이터) |
| props 받기 | 함수 매개변수 구조분해 | `@Input()` 데코레이터가 붙은 클래스 필드 |
| 자식→부모 통신 | 콜백 함수를 props로 전달 | `@Output()` + `EventEmitter` |
| 파일 구성 | 보통 1파일(`.tsx`)에 JSX+로직, CSS는 별도 import | 기본적으로 **템플릿/스타일/로직 3파일 분리**(`.ts`/`.html`/`.css`), 필요하면 `template`/`styles` 인라인도 가능 |
| 이름 규칙 | 대문자 시작 함수명 | 클래스명은 `PascalCase` + `Component` 접미사, 셀렉터는 `kebab-case` 태그(`app-fruit-card`) |

## 4. 모듈(NgModule) — 그리고 Standalone Components

전통적인 Angular(~버전 16까지 기본값)는 컴포넌트를 **`NgModule`** 이라는 단위로 묶어서 관리했습니다. `AppModule`, `FruitModule`처럼 기능별로 모듈 파일을 만들고, 그 안에 `declarations`(컴포넌트 목록), `imports`(다른 모듈), `providers`(서비스)를 선언하는 방식입니다.

```typescript
// (구버전 예시) fruit.module.ts
@NgModule({
  declarations: [FruitCardComponent, FruitListComponent],
  imports: [CommonModule, RouterModule],
})
export class FruitModule {}
```

**Angular 17부터는 `Standalone Components`가 기본값**이 되었습니다. 컴포넌트가 스스로 필요한 것을 `imports` 배열에 적어서 가져오고, `NgModule` 없이 동작합니다(위 2절 예시들이 전부 standalone 방식). 이 커리큘럼은 **standalone 방식으로 진행**합니다 — 최신 공식 CLI 기본값이고 보일러플레이트가 훨씬 적기 때문입니다.

다만 NgModule 개념 자체는 알아둬야 합니다. 실무에서 만나는 기존(레거시) Angular 프로젝트 상당수가 아직 NgModule 기반이고, "폴더/모듈 구조가 강제되는 정도"라는 React 대비 비교 포인트가 여기서 나옵니다.

> **React와 비교할 포인트 ① 폴더 구조가 강제되는 정도**
> React는 폴더 구조에 대해 규칙이 없습니다(`pages/`, `components/`를 어떻게 나누든 자유). Angular는 `ng generate`가 만들어주는 파일명 규칙(`*.component.ts`, `*.service.ts`, `*.guard.ts`)과, 과거 NgModule 단위의 "기능별 폴더 분리" 관례가 있어서 프로젝트마다 구조 편차가 React보다 훨씬 적습니다. Standalone 방식으로 바뀐 지금도 `core/`, `shared/`, `features/` 같은 관례적 분리는 여전히 널리 쓰입니다(study10에서 실습).

## 5. 상태(state) — `useState` → 클래스 필드 + `Signal`

### 5.1 가장 단순한 상태: 그냥 클래스 필드

```typescript
export class CounterComponent {
  count = 0;
  increment() {
    this.count++;   // React와 달리 직접 대입해도 됨
  }
}
```

React처럼 "반드시 setter 함수를 호출해야 한다"는 제약이 없습니다. 클래스 필드를 직접 바꾸면 Zone.js가 다음 변경 감지 사이클에서 알아서 화면에 반영합니다(1절 참고).

### 5.2 `Signal` — 더 정밀한 상태 (Vue의 `ref`와 유사)

```typescript
import { signal, computed } from '@angular/core';

export class CounterComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  increment() {
    this.count.update((v) => v + 1);   // 또는 this.count.set(v)
  }
}
```

| Vue | React | Angular (Signal) |
|---|---|---|
| `const count = ref(0)` | `const [count, setCount] = useState(0)` | `count = signal(0)` |
| 읽기: `count.value` | 읽기: `count` | 읽기: `count()` (함수처럼 호출) |
| 쓰기: `count.value = 1` | 쓰기: `setCount(1)` | 쓰기: `count.set(1)` 또는 `count.update(fn)` |

Signal은 "이 값을 템플릿의 정확히 어디서 쓰는지" 추적해서, Zone.js 전체 변경 감지 없이도 **필요한 부분만** 갱신할 수 있게 해주는 최신 기능입니다. 이 커리큘럼에서는 기본 상태는 클래스 필드로, 정밀한 반응성이 필요한 곳(study2 이후)은 Signal로 다룹니다.

## 6. 단방향 데이터 흐름 + 의존성 주입(DI) — React에 없는 개념

props가 부모→자식으로 내려간다는 원칙은 동일합니다(`@Input`/`@Output`, 3절 참고). 하지만 Angular에는 React에 없는 개념이 하나 더 있습니다: **의존성 주입(Dependency Injection, DI)**.

```typescript
@Injectable({ providedIn: 'root' })   // 앱 전체에서 공유되는 싱글턴
export class AuthService {
  login() { /* ... */ }
}

@Component({ /* ... */ })
export class LoginPageComponent {
  constructor(private authService: AuthService) {}   // 생성자에 "주문"만 하면 Angular가 넣어줌
}
```

> **React와 비교할 포인트 ② 서비스 계층을 어디에 둘지**
> React에서 "여러 컴포넌트가 공유하는 로직/상태"는 Context나 Zustand 스토어로 만들어 컴포넌트 트리 어딘가에서 `import`해 씁니다. Angular는 `@Injectable({ providedIn: 'root' })`로 선언하면 프레임워크가 **자동으로 싱글턴을 만들어 필요한 곳마다 주입**해줍니다. "이 기능이 필요하면 import해서 직접 생성/관리"(React) vs "필요하다고 생성자에 선언만 하면 프레임워크가 인스턴스를 책임지고 넣어준다"(Angular DI)의 차이입니다. Angular는 서비스 계층이 컴포넌트와 명확히 분리되고, 어디에 로직을 둬야 하는지가 프레임워크 차원에서 정해져 있는 편입니다(HTTP 호출, 전역 상태는 전부 `*.service.ts`).

DI는 테스트하기 쉬운 구조(가짜 서비스로 교체 가능)를 만들어주는 것이 핵심 목적이며, study3·study8에서 본격적으로 다룹니다.

## 7. 비동기 처리 — Promise 대신 RxJS `Observable`

React(및 기존 axios/fetch)는 **Promise** 기반입니다: 한 번 요청하면 한 번 응답을 받고 끝입니다. Angular의 `HttpClient`는 **RxJS의 `Observable`**을 반환합니다.

| | Promise | Observable(RxJS) |
|---|---|---|
| 값을 몇 번 방출하나 | 딱 1번(성공 or 실패) | 0번~여러 번(스트림) |
| 취소 가능한가 | 기본적으로 불가 | `subscribe()`가 반환한 구독을 `unsubscribe()`로 취소 가능 |
| 값 가공 | `.then(x => ...)` | `.pipe(map(x => ...), filter(...), catchError(...))` 처럼 연산자를 체이닝 |
| 대표 사용처(Angular) | - | `HttpClient` 응답, 폼 값 변화(`valueChanges`), 라우터 이벤트 등 "시간에 따라 여러 번 발생할 수 있는 모든 것" |

```typescript
this.http.get<Fruit[]>('/api/fruits').pipe(
  map((fruits) => fruits.filter((f) => f.stock > 0)),
  catchError((err) => { console.error(err); return of([]); }),
).subscribe((fruits) => this.fruits = fruits);
```

> **React와 비교할 포인트 ③ 비동기 처리 방식**
> React에서는 `useEffect` 안에서 `fetch`/`axios`(Promise)를 호출하고, 로딩/에러/데이터를 `useState` 3개로 각각 관리하는 패턴이 일반적이었습니다(study7 복습). Angular는 `HttpClient`가 기본으로 Observable을 주기 때문에, **"검색어가 바뀔 때마다 이전 요청은 취소하고 새 요청만 보낸다"**(`switchMap`) 같은 처리가 연산자 하나로 끝납니다. Promise로 같은 걸 구현하려면 직접 취소 토큰/플래그를 관리해야 합니다. 대신 배워야 할 연산자(`map`, `switchMap`, `catchError`, `debounceTime` 등)가 많아 초반 학습 곡선이 있습니다. study7·study9에서 집중적으로 다룹니다.

## 8. Node.js / npm / Angular CLI

Node.js, npm, `package.json` 개념은 [React study0의 6절](../react/study0.md)과 완전히 동일합니다. 번들러/개발 서버는 Vite 대신 **Angular CLI**(`ng`)가 내부적으로 esbuild/Vite를 감싸서 제공합니다.

- 프로젝트 생성: `npx @angular/cli new <프로젝트명>` (Vue/React의 `npm create vite@latest`에 대응)
- 개발 서버: `ng serve` (Vue/React의 `npm run dev`에 대응)
- 코드 생성: `ng generate component/service/guard/...` — Angular CLI만의 특징. 파일 3종 세트(ts/html/css)와 뼈대 코드를 자동 생성해줍니다.

명령어 전체 목록과 실습은 study1에서 다룹니다.

**실습 전 확인할 것**: 터미널에 `node -v`, `npm -v` 입력해서 버전 확인 (Node 20 이상 권장. 이 저장소는 Angular CLI 19 기준으로 진행합니다).

## 9. 기업형 프로젝트 구조 미리보기

Notion 학습 목표의 "React와 비교할 포인트"에 대응하는 폴더 구조는 study10, studyFinal에서 실제로 적용합니다.

```
src/app/
├─ core/         # 앱 전체에서 하나만 존재하는 것: 인증 서비스, 인터셉터, 가드
├─ shared/       # 여러 feature가 재사용하는 순수 UI 컴포넌트
├─ features/     # 라우트(페이지) 단위 기능 묶음 (Vue의 views/, React의 pages/에 대응)
│  └─ posts/
│     ├─ post-list.component.ts
│     ├─ post-detail.component.ts
│     └─ post.service.ts
├─ app.routes.ts
└─ app.config.ts
```

- **서비스가 데이터 fetch를 책임진다**: 컴포넌트는 서비스의 Observable을 구독만 하고, 실제 HTTP 호출 로직은 `*.service.ts`에 둡니다(6절의 DI 비교 포인트).
- **에러/로딩/빈 상태를 항상 화면에 명시**: React와 동일한 습관을 Angular의 `async` 파이프 + `@if`로 재현합니다(study7에서 패턴화).

## 10. 학습 로드맵 (전체 목차)

| 문서 | 내용 |
|---|---|
| study0 (이 문서) | Angular 기초 이론, React와 비교 |
| study1 | Angular CLI 명령어, 프로젝트 생성, 컴포넌트/템플릿/스타일/모듈 기초 실습 |
| study2 | 이벤트 바인딩, `[(ngModel)]` 양방향 바인딩, `@for`/`@if` 리스트·조건 렌더링 |
| study3 | 라이프사이클 훅(`ngOnInit`/`ngOnDestroy`), `ViewChild`, 첫 서비스(DI) 맛보기 |
| study4 | `@Output`(자식→부모 통신), Reactive Forms(`FormGroup`/`FormControl`) 실습 |
| study5 | Angular Router 기본 라우팅 (목록 → 상세) |
| study6 (고급1) | Router 중첩 라우팅 + Route Guard(`CanActivate`) |
| study7 (고급2) | `HttpClient` API 연동, RxJS(`map`/`switchMap`/`catchError`), 로딩/에러/빈 상태 |
| study8 (고급3) | DI 심화, 서비스 + `BehaviorSubject`로 전역 로그인 상태 관리 |
| study9 (고급4) | RxJS 심화(`Subject` 종류, `combineLatest`, `debounceTime`), 즐겨찾기 상태관리 |
| study10 (고급5) | HTTP 인터셉터로 JWT 자동 첨부, 기업형 폴더 구조, CORS/environment 설정 |
| studyFinal | React로 만든 게시판+로그인 프로젝트를 Angular로 재구현 |

각 단계는 이전 단계 위에 쌓이는 구조이므로 순서를 크게 건너뛰지 않는 걸 권장합니다.

---

## 부록: 용어 미니 사전 (React 대비 Angular 용어)

| 용어 | 한 줄 설명 |
|---|---|
| 템플릿(Template) | HTML + Angular 전용 바인딩 문법으로 UI를 표현하는 파일(`.html`). JSX와 달리 순수 JS가 아님 |
| 변경 감지(Change Detection) | Zone.js가 비동기 이벤트를 감지해 컴포넌트 트리를 갱신하는 메커니즘. Virtual DOM diff와는 다른 방식 |
| 구조적 디렉티브 | `@if`, `@for`처럼 DOM 자체를 추가/제거하는 템플릿 문법 |
| `@Component` | 클래스를 컴포넌트로 만드는 데코레이터 |
| `@Input` / `@Output` | 부모→자식 데이터 전달 / 자식→부모 이벤트 전달을 위한 데코레이터 |
| NgModule | 컴포넌트/서비스를 기능 단위로 묶는 전통적 방식(레거시). 지금은 Standalone Components가 기본 |
| Standalone Component | NgModule 없이 컴포넌트가 스스로 의존성을 선언하는 최신(v17+) 기본 방식 |
| 의존성 주입(DI) | 클래스가 필요한 의존성을 직접 생성하지 않고 프레임워크가 넣어주는 설계 방식. `@Injectable` |
| Signal | Vue의 `ref`와 유사한, 값 변화를 정밀 추적하는 최신 반응형 상태(v17+) |
| RxJS `Observable` | 시간에 따라 여러 번 값을 방출할 수 있는 비동기 스트림. Promise보다 강력하지만 학습 곡선이 있음 |
| Reactive Forms | `FormGroup`/`FormControl` 객체로 폼 상태를 코드에서 직접 관리하는 방식(Angular 공식 권장) |
| Route Guard | 라우트 진입 가능 여부를 판단하는 함수(`CanActivate` 등). React의 `ProtectedRoute` 컴포넌트에 대응 |
| HTTP Interceptor | 모든 HTTP 요청/응답을 가로채 공통 처리(JWT 헤더 첨부, 에러 처리 등)를 하는 함수 |
