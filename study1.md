# study1 — Angular CLI 명령어 & 프로젝트 생성, 컴포넌트/템플릿/스타일 실습

## 1. Angular CLI 설치 및 명령어

Vue/React의 `npm create vite@latest`에 대응하는 것이 Angular의 `ng new`입니다. CLI 자체를 전역 설치하지 않고 `npx`로 그때그때 실행해도 됩니다.

| 명령어 | 설명 |
|---|---|
| `npx @angular/cli new <이름>` | 새 Angular 프로젝트 생성 (대화형 질문: 라우팅 사용 여부, 스타일 포맷 등) |
| `ng serve` | 개발 서버 실행 (`http://localhost:4200`, 코드 저장 시 자동 새로고침) |
| `ng build` | 프로덕션 빌드 (`dist/` 폴더에 결과물 생성) |
| `ng generate component <경로/이름>` (축약 `ng g c`) | 컴포넌트 3종 파일(`.ts`/`.html`/`.css`) 자동 생성 |
| `ng generate service <경로/이름>` (축약 `ng g s`) | `@Injectable` 서비스 파일 생성 |
| `ng generate guard <경로/이름>` (축약 `ng g g`) | Route Guard 파일 생성 |
| `ng generate interceptor <경로/이름>` | HTTP 인터셉터 파일 생성 |

이 저장소는 아래 명령으로 `demo/` 프로젝트를 생성했습니다.

```bash
npx @angular/cli new demo --routing --style=css --ssr=false --strict=true
```

- `--routing`: 처음부터 `app.routes.ts`를 만들어 라우터를 세팅 (라우팅 실습은 study5부터)
- `--style=css`: 컴포넌트 스타일 포맷을 순수 CSS로 지정 (Sass 등도 선택 가능)
- `--ssr=false`: 서버사이드 렌더링 비활성화 (SPA로만 학습)
- `--strict=true`: TypeScript strict 모드 (Angular CLI 기본값이 이미 strict)

> Node 버전 참고: 최신 Angular CLI(v20+)는 Node 24.15 이상을 요구합니다. 이 환경의 Node 버전(v24.14)에서는 CLI 실행 시 "unsupported Node" 경고가 뜨지만, 빌드/실행 자체는 정상 동작하는 **Angular CLI 19**로 진행합니다.

## 2. 생성된 프로젝트 구조 훑어보기

```
demo/
├─ angular.json          # CLI 빌드/서빙 설정 (Vite의 vite.config.ts에 대응)
├─ src/
│  ├─ main.ts             # 앱 부트스트랩 진입점 (React의 main.tsx에 대응)
│  ├─ index.html
│  ├─ styles.css          # 전역 스타일
│  └─ app/
│     ├─ app.component.ts     # 루트 컴포넌트
│     ├─ app.config.ts        # 앱 전역 provider 설정 (라우터, HttpClient 등을 여기 등록)
│     └─ app.routes.ts        # 라우트 테이블
```

`app.config.ts`는 React로 치면 `<BrowserRouter>`, `<QueryClientProvider>`처럼 앱을 감싸던 Provider들을 **설정 객체 하나로 등록**하는 곳입니다.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)],
};
```

## 3. 컴포넌트 3종 세트 실습 — `FruitBadge`

가장 단순한 컴포넌트부터 만듭니다. `@Input`으로 부모에게 값을 받아 조건부 스타일(`[class.soldout]`)과 삼항연산자로 텍스트를 표시합니다.

```typescript
// components/fruit-badge/fruit-badge.component.ts
@Component({
  selector: 'app-fruit-badge',
  templateUrl: './fruit-badge.component.html',
  styleUrl: './fruit-badge.component.css',
})
export class FruitBadgeComponent {
  @Input({ required: true }) soldOut = false;
}
```

```html
<!-- fruit-badge.component.html -->
<span class="badge" [class.soldout]="soldOut">
  {{ soldOut ? '품절' : '판매중' }}
</span>
```

- `[class.soldout]="soldOut"`: `soldOut`이 `true`일 때만 `soldout` CSS 클래스를 추가하는 프로퍼티 바인딩(study0 2.2절 표 참고)
- `@Input({ required: true })`: Angular 16+ 문법으로, 부모가 이 값을 반드시 넘겨야 한다고 컴파일 타임에 강제합니다(React의 `PropTypes`/TS 필수 props와 유사한 안전장치이지만 Angular는 프레임워크 차원에서 지원).

## 4. 부모-자식 조합 — `FruitCard`가 `FruitBadge`를 사용

```typescript
// components/fruit-card/fruit-card.component.ts
@Component({
  selector: 'app-fruit-card',
  imports: [FruitBadgeComponent],   // standalone 컴포넌트는 필요한 것을 스스로 import
  templateUrl: './fruit-card.component.html',
  styleUrl: './fruit-card.component.css',
})
export class FruitCardComponent {
  @Input({ required: true }) fruit!: Fruit;
}
```

```html
<!-- fruit-card.component.html -->
<li class="fruit-card">
  <span class="name" [class.soldout]="fruit.stock === 0">
    {{ fruit.name }} ({{ fruit.stock }}개)
  </span>
  <app-fruit-badge [soldOut]="fruit.stock === 0" />
</li>
```

React에서는 `import FruitBadge from './FruitBadge'` 후 JSX에 `<FruitBadge />`라고 쓰면 끝이었습니다. Angular는 **컴포넌트 클래스의 `imports` 배열에도 추가**해야 템플릿에서 `<app-fruit-badge>` 태그를 인식합니다(study0 4절 Standalone Component). 하나라도 빠뜨리면 "알 수 없는 엘리먼트"라는 컴파일 에러가 납니다.

## 5. 리스트 렌더링 — `@for` 신문법

```html
<!-- fruit-list-practice.component.html -->
<ul class="fruit-list">
  @for (fruit of fruits; track fruit.id) {
    <app-fruit-card [fruit]="fruit" />
  } @empty {
    <li>등록된 과일이 없습니다.</li>
  }
</ul>
```

- `track fruit.id`: React의 `key={item.id}`에 대응하며, `@for` 문법에서는 **생략이 불가능**합니다(study0 2.2절).
- `@empty`: 배열이 비어 있을 때 보여줄 블록을 같은 문법 안에서 바로 정의할 수 있습니다. React는 `items.length === 0 && <p>...</p>`처럼 별도로 조건을 써야 했던 것과 비교됩니다.

> **템플릿 안에서 `@`를 리터럴 텍스트로 쓸 때 주의**: `<code>&#64;for</code>`처럼 HTML 엔티티(`&#64;`)로 이스케이프해야 합니다. 템플릿 파서가 `@`로 시작하는 텍스트를 전부 구조적 디렉티브 블록 시작으로 해석하기 때문입니다(이 프로젝트에서 실제로 겪은 컴파일 에러).

## 6. 실습 결과 확인

`demo/` 프로젝트를 실행하면 홈 화면에 과일 목록(사과/바나나/체리/딸기/수박)이 카드 형태로 나타나고, 재고 0개인 항목은 이름에 취소선이 그어지고 "품절" 배지가 표시됩니다.

```bash
cd demo
npm install
ng serve
```

## 7. 모듈(NgModule) 실습은 왜 안 하는가

Notion 학습 목표의 "컴포넌트 / 템플릿 / 스타일 / 모듈"에서 "모듈"은 study0 4절에서 이론으로 정리한 `NgModule`을 가리킵니다. 이 저장소는 Angular 17+ 기본값인 **Standalone Components**로 실습을 진행하므로, `@NgModule` 데코레이터를 직접 쓰는 코드는 만들지 않습니다. 대신:

- `imports: [...]` 배열(컴포넌트 자신에 선언)이 예전 `NgModule`의 `imports`/`declarations` 역할을 대신합니다.
- `app.config.ts`의 `providers: [...]`가 예전 `AppModule`의 `providers` 역할을 대신합니다.

즉 "모듈이 하던 일"은 다 배우지만, `@NgModule` 문법 자체는 study0 이론 정리로 충분하다고 판단했습니다(최신 공식 문서도 신규 프로젝트에 NgModule을 권장하지 않습니다).
