# study2 — 이벤트 바인딩, 양방향 바인딩, 리스트 상태 추가/삭제

## 1. 이벤트 바인딩 — `CounterPractice`

```typescript
export class CounterPracticeComponent {
  count = 0;
  increment() { this.count++; }
  decrement() { this.count--; }
  reset() { this.count = 0; }
}
```

```html
<button (click)="decrement()">-1</button>
<button (click)="increment()">+1</button>
```

`(click)="increment()"`는 React의 `onClick={increment}`에 대응합니다(study0 2.2절). 차이는 값 갱신 방식입니다.

- React: `setCount(count + 1)` — **반드시 setter 함수를 호출**해야 리렌더링됩니다.
- Angular: `this.count++` — **클래스 필드를 직접 대입**해도 됩니다. Zone.js가 `(click)` 이벤트 자체를 감지해서 변경 감지 사이클을 돌리기 때문입니다(study0 1절).

## 2. 배열 상태 추가/삭제 — `FruitInventoryPractice`

```typescript
addFruit() {
  const name = this.newFruitName.trim();
  if (!name) return;
  this.fruits = [...this.fruits, { id: this.nextId++, name, stock: 1 }];
  this.newFruitName = '';
}

removeFruit(id: number) {
  this.fruits = this.fruits.filter((fruit) => fruit.id !== id);
}
```

React와 동일하게 `[...prev, item]` / `filter()`로 **새 배열을 만들어 대입**하는 불변성 습관을 그대로 유지했습니다. Angular는 `this.fruits.push(item)`처럼 원본을 직접 변경해도 (Zone.js가 이벤트 이후 변경 감지를 돌리므로) 화면에는 반영되지만, 이 습관을 들이면 나중에 `OnPush` 변경 감지 전략(참조가 바뀌어야만 갱신하는 성능 최적화 모드)을 쓸 때 버그가 됩니다. **처음부터 새 배열/새 객체를 만드는 습관**을 권장합니다.

```html
<input
  [(ngModel)]="newFruitName"
  (keyup.enter)="addFruit()"
  placeholder="추가할 과일 이름"
/>
<button (click)="addFruit()">추가</button>
```

- `(keyup.enter)`: Angular 이벤트 바인딩은 `(keyup.enter)`, `(keydown.escape)`처럼 **키 이름을 이벤트명에 직접 붙여** 필터링할 수 있습니다. React라면 핸들러 안에서 `if (e.key === 'Enter')`를 직접 체크해야 했던 부분입니다.

## 3. 양방향 바인딩 — `FruitSearchPractice`

`FormsModule`을 컴포넌트 `imports`에 추가하면 `[(ngModel)]` 문법을 쓸 수 있습니다.

```typescript
@Component({
  selector: 'app-fruit-search-practice',
  imports: [FormsModule],
  templateUrl: './fruit-search-practice.component.html',
})
export class FruitSearchPracticeComponent {
  searchTerm = '';

  get filteredFruits() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.allFruits;
    return this.allFruits.filter((fruit) => fruit.name.toLowerCase().includes(term));
  }
}
```

```html
<input [(ngModel)]="searchTerm" placeholder="과일 이름 검색" />
```

`[(ngModel)]="searchTerm"`은 아래 두 바인딩을 한 번에 처리하는 문법 설탕(syntactic sugar)입니다.

```html
<!-- [(ngModel)]="searchTerm" 의 실제 정체 -->
<input [ngModel]="searchTerm" (ngModelChange)="searchTerm = $event" />
```

- `[ngModel]="searchTerm"`: 프로퍼티 바인딩(값을 입력창에 반영)
- `(ngModelChange)="searchTerm = $event"`: 이벤트 바인딩(입력이 바뀌면 필드에 반영)

이 "배열/이벤트 이름을 대괄호+소괄호로 감싸면 양방향"이라는 문법(banana-in-a-box라고 부릅니다)은 React에는 없는 Angular 전용 문법이며, Vue의 `v-model`과 동일한 발상입니다.

또한 `filteredFruits`를 **getter**로 정의해서, `searchTerm`이 바뀔 때마다 다시 계산되도록 했습니다. React의 파생 상태(`useMemo` 없이 렌더링 중 그냥 계산하는 방식)와 같은 접근입니다.

## 4. `@for` + `track`이 리스트 삭제에서 하는 역할

`FruitInventoryPractice`에서 항목을 삭제하면 배열이 재생성되지만, `track fruit.id` 덕분에 Angular는 "삭제된 항목의 DOM만 제거"하고 나머지 `<li>`는 재사용합니다. `track`을 생략(또는 `track $index`로 잘못 지정)하면 배열이 바뀔 때마다 전체 DOM을 다시 그리게 되어 성능 저하와 함께, 입력 중이던 값(포커스 등)이 날아가는 버그로 이어질 수 있습니다. React의 `key` 오용 문제와 정확히 같은 함정입니다.
