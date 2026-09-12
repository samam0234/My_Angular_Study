# study4 — `@Output`(자식→부모 통신), Reactive Forms 실습

## 1. `@Output` — React 콜백 props에 대응

React는 "함수를 props로 내려주고 자식이 그걸 호출"하는 관례로 자식→부모 통신을 했습니다(study0 6절). Angular는 **`@Output` + `EventEmitter`**라는 전용 문법이 있습니다.

```typescript
// 자식: fruit-like-item.component.ts
export class FruitLikeItemComponent {
  @Input({ required: true }) fruit!: Fruit;
  @Input() liked = false;
  @Output() likeToggled = new EventEmitter<number>();

  onToggle() {
    this.likeToggled.emit(this.fruit.id);   // "이벤트를 발생"시킴
  }
}
```

```typescript
// 부모: likeable-fruit-list.component.ts
onLikeToggled(id: number) {
  const next = new Set(this.likedIds);
  next.has(id) ? next.delete(id) : next.add(id);
  this.likedIds = next;
}
```

```html
<!-- 부모 템플릿 -->
<app-fruit-like-item
  [fruit]="fruit"
  [liked]="isLiked(fruit.id)"
  (likeToggled)="onLikeToggled($event)"
/>
```

| | React | Angular |
|---|---|---|
| 자식→부모 전달 방법 | 부모가 콜백 함수를 props로 내려줌(`onLike={() => ...}`), 자식이 그냥 호출 | 자식이 `@Output` 프로퍼티(`EventEmitter`)를 선언, 부모가 `(이벤트이름)="핸들러()"`로 구독 |
| 값 전달 | 콜백 함수의 인자로 직접 전달 | `emit(값)` 호출 → 부모 템플릿에서 `$event`로 그 값을 받음 |
| 문법 성격 | 관례(convention). 이름은 자유(`onLike`, `handleLike` 등 아무거나) | 프레임워크가 정의한 전용 문법. `(이벤트이름)`은 `@Output()` 필드명과 반드시 일치해야 함 |

`$event`는 Vue의 `$event`와 동일한 개념으로, "이 이벤트 핸들러에 전달된 값"을 가리키는 Angular 템플릿 전용 변수입니다.

## 2. Reactive Forms — `FormGroup` / `FormControl` / `Validators`

Vue의 `v-model` 여러 개를 `ref`로 관리하거나, React의 Controlled Component(`useState` + `onChange`)로 폼을 관리했던 것과 달리, Angular는 **폼 상태 전체를 하나의 객체(`FormGroup`)로 코드에서 직접 다루는** Reactive Forms 방식을 공식적으로 권장합니다.

```typescript
private fb = new FormBuilder();
form = this.fb.nonNullable.group({
  username: ['', [Validators.required, Validators.minLength(2)]],
  password: ['', [Validators.required, Validators.minLength(4)]],
});
```

```html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="username" />
  @if (username.invalid && username.touched) {
    <p class="error-text">아이디는 2자 이상 입력해야 합니다.</p>
  }
  <button type="submit">로그인 시도</button>
</form>
```

- `[formGroup]="form"`: `<form>` 엘리먼트를 `FormGroup` 객체와 연결
- `formControlName="username"`: `<input>`을 그룹 안의 특정 `FormControl`과 연결 (이름은 `group({...})`의 키와 일치)
- `Validators.required`, `Validators.minLength(2)`: 검증 규칙을 **선언적으로** 등록. React라면 `if (username.length < 2) setError(...)`처럼 매번 직접 검증 로직을 짜야 했던 부분입니다.
- `.invalid`, `.touched`: 각 컨트롤이 자체적으로 들고 있는 상태. "유효하지 않음" + "한 번이라도 포커스가 갔다 나감"을 조합해서 에러 메시지 노출 시점을 제어하는 흔한 패턴입니다.

### Template-driven Forms와의 비교 (참고)

Angular는 `[(ngModel)]`(study2) 기반의 **Template-driven Forms**도 지원합니다. 간단한 폼은 이 방식이 코드가 짧지만, 검증 로직이 복잡해지거나 폼을 동적으로 구성해야 할 때는 **Reactive Forms**가 테스트하기 쉽고 타입 안정성이 높아 실무에서 더 널리 쓰입니다. 이 커리큘럼은 Reactive Forms로 통일합니다.

## 3. 폼 제출과 `@Output`을 조합하기

```typescript
onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();   // 제출을 눌러야 모든 에러 메시지를 보여줌
    return;
  }
  this.loginAttempt.emit({ username: this.form.getRawValue().username });
  this.form.reset();
}
```

`markAllAsTouched()`는 사용자가 아직 어떤 입력창도 건드리지 않았는데 제출 버튼을 눌렀을 때, 모든 필드의 에러 메시지를 한 번에 보여주기 위한 관례적인 처리입니다. 폼 제출이 성공하면 1절에서 배운 `@Output`으로 결과를 부모(Home)에 알립니다 — 아직 전역 로그인 상태는 아니고(그건 study8), "자식이 부모에게 이벤트를 알린다"는 개념 연습입니다.
