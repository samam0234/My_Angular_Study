# study1 — Hello World와 기본 문법

> 🎯 **목표**: 루트 화면에 제목을 띄우고, 보간·속성 바인딩·이벤트·`@if`·`@for`로 템플릿을 읽는다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`demo/src/app/app.component.html`](./demo/src/app/app.component.html), [`demo/src/app/shared/fruit-card`](./demo/src/app/shared/fruit-card), [`demo/src/app/components/counter-practice`](./demo/src/app/components/counter-practice)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular 템플릿은 HTML 파일에 전용 문법을 더한 것이다. 컴파일러가 그 문법을 DOM을 갱신하는 명령으로 바꾼다.

| 문법 | 방향 | 예 |
|---|---|---|
| `{{ 식 }}` | 클래스 → 글자 | `{{ title }}` |
| `[속성]` | 클래스 → DOM 속성·클래스 | `[class.soldout]="fruit.stock === 0"` |
| `(이벤트)` | DOM → 클래스 메서드 | `(click)="increment()"` |
| `@if` | 조건이 참일 때만 그 블록을 만든다 | `@if (show) { ... }` |
| `@for` | 배열을 반복한다. `track`은 항목의 신원이다 | `@for (fruit of fruits; track fruit.id)` |

`@for`에는 `track`이 필수이며 빠지면 템플릿 컴파일 오류다. `fruit.id`처럼 안정적인 값을 주면 같은 항목은 재사용한다.

standalone 컴포넌트는 템플릿에서 쓰는 다른 컴포넌트와 지시자를 `imports`에 적어야 한다. 안 적으면 템플릿이 그 선택자를 모른다.

---

## 🛠️ 실기

### 1. 루트 화면

`demo/src/app/app.component.ts`는 `title = 'Angular 학습 데모'`를 갖는다. 템플릿은 그 필드를 그대로 출력한다.

```html
<h1>{{ title }}</h1>
<p>study1부터 하나씩 실습 컴포넌트를 이 화면에 쌓아갑니다.</p>
```

1. `{{ title }}`는 클래스 필드 `title`의 현재 값을 텍스트로 넣는다.
2. 필드를 바꾸면 변경 감지가 이 글자를 다시 쓴다.
3. 일반 `<p>`는 바인딩이 없는 고정 문장이다.

`project`의 루트는 더 얇다. `app.component.html`은 헤더와 `<router-outlet />`만 둔다. 첫 화면의 실제 내용은 라우터가 목록 컴포넌트로 채운다. study4에서 그 연결을 본다.

### 2. 속성 바인딩과 자식 입력

`demo/src/app/shared/fruit-card/fruit-card.component.html`

```html
<li class="fruit-card">
  <span class="name" [class.soldout]="fruit.stock === 0">
    {{ fruit.name }} ({{ fruit.stock }}개)
  </span>
  <app-fruit-badge [soldOut]="fruit.stock === 0" />
</li>
```

1. `<li>`는 스타일용 고정 클래스만 갖는다.
2. `[class.soldout]`은 재고가 0일 때만 `soldout` 클래스를 붙인다.
3. 이름과 재고를 보간으로 이어 붙인다.
4. 자식 `app-fruit-badge`의 입력 `soldOut`에 같은 조건을 넘긴다.

부모 목록은 이렇게 카드를 반복한다.

```html
@for (fruit of fruits; track fruit.id) {
  <app-fruit-card [fruit]="fruit" />
} @empty {
  <li>등록된 과일이 없습니다.</li>
}
```

1. `fruits` 배열을 돈다.
2. `track fruit.id`로 같은 과일을 다시 식별한다.
3. `[fruit]`은 자식의 `@Input() fruit`이다.
4. 배열이 비면 `@empty` 블록만 보인다.

### 3. 이벤트

`demo/src/app/components/counter-practice/counter-practice.component.ts`

```ts
count = 0;

increment() {
  this.count++;
}
```

```html
<p><code>{{ count }}</code></p>
<button (click)="increment()">+1</button>
```

1. `count`는 컴포넌트 상태다.
2. `increment`는 그 값을 1 올린다. 별도의 setter 함수는 필요 없다.
3. 템플릿은 현재 숫자를 보여 준다.
4. 버튼 클릭이 `increment`를 호출하고, Zone.js가 끝난 뒤 화면의 숫자가 바뀐다.

홈 화면은 `@if (showStockMonitor)`로 재고 모니터를 DOM에 넣거나 뺀다. 빼는 순간 그 컴포넌트는 파괴된다. study2에서 그 파괴 시점에 타이머를 끄는 이유를 본다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `NG8002: can't bind to 'fruit'` | 자식에 `@Input`이 없거나 부모가 자식을 `imports`에 안 넣음 | `@Input({ required: true }) fruit`과 부모 `imports`를 확인 |
| `NG8001: 'app-fruit-card' is not a known element` | standalone 컴포넌트의 `imports` 누락 | 부모 `@Component({ imports: [FruitCardComponent] })` |
| `@for` 컴파일 오류 | `track`을 빠뜨림 | `@for (item of items; track item.id)` |
| 클릭해도 숫자가 안 변함 | 메서드가 필드를 안 바꾸거나, 다른 객체를 바꾸고 있음 | `this.count++`처럼 템플릿이 읽는 값을 바꾼다 |
| `{{ title }}`이 그대로 보임 | Angular가 그 요소를 컴포넌트로 컴파일하지 않음 | 선택자와 `templateUrl`이 맞는지 확인 |

---

## ☐ 체크리스트

- ☑ 루트 제목이 브라우저에 보인다
- ☑ `{{ }}`, `[속성]`, `(이벤트)`의 방향을 구분한다
- ☑ `@for`에 `track`을 붙이고, 빈 목록은 `@empty`로 처리한다
- ☑ `@if`로 컴포넌트를 화면에 넣었다 뺐다 할 수 있다
- ☑ 부모 `imports` 없이 자식 선택자를 쓰면 컴파일 오류가 나는 이유를 안다
- ☑ 컴포넌트 / 템플릿 / 스타일 파일을 한 세트로 찾아 열 수 있다

## ➡️ 다음 단계 연결

[study2](./study2.md)에서 컴포넌트와 서비스라는 기본 단위를 직접 나누고, 의존성 주입으로 데이터를 넘긴다.
