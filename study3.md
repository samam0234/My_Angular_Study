# study3 — 라이프사이클 훅, ViewChild, 첫 서비스(DI) 실습

## 1. 첫 서비스 만들기 — 의존성 주입(DI) 실전

study0 6절에서 이론으로 다룬 DI를 처음 실전에 적용합니다. `@Injectable({ providedIn: 'root' })`를 붙이면 앱 전체에서 **하나의 인스턴스만 만들어 공유**되는 싱글턴 서비스가 됩니다.

```typescript
// services/fruit-inventory.service.ts
@Injectable({ providedIn: 'root' })
export class FruitInventoryService {
  private fruits: Fruit[] = FRUIT_CATALOG.map((fruit) => ({ ...fruit }));

  getFruits(): Fruit[] {
    return this.fruits;
  }

  bumpRandomStock() {
    const index = Math.floor(Math.random() * this.fruits.length);
    this.fruits[index] = { ...this.fruits[index], stock: this.fruits[index].stock + 1 };
  }
}
```

컴포넌트에서는 **생성자(constructor)에 타입만 선언**하면 Angular가 알아서 인스턴스를 만들어 넣어줍니다. `new FruitInventoryService()`를 직접 호출하는 코드는 어디에도 없습니다.

```typescript
constructor(private inventoryService: FruitInventoryService) {}
```

React의 Context/Zustand와 비교하면(study0 6절):

- React: 스토어 파일을 직접 `import`해서 씀 → "내가 이 의존성을 어디서 가져올지" 직접 관리
- Angular DI: 생성자에 타입만 적으면 프레임워크가 인스턴스를 찾아서 넣어줌 → 테스트할 때 가짜(Mock) 서비스로 쉽게 교체 가능 (study8에서 이 장점을 실제로 체감합니다)

## 2. 라이프사이클 훅 — `ngOnInit` / `ngOnDestroy`

React의 `useEffect(() => { ... }, [])`(마운트 시 1회) + `return () => { ... }`(언마운트 시 정리)에 대응하는 것이 Angular 컴포넌트 클래스의 **인터페이스 구현**입니다.

```typescript
export class FruitStockMonitorComponent implements OnInit, OnDestroy {
  private intervalId?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.intervalId = setInterval(() => {
      this.inventoryService.bumpRandomStock();
      this.tickCount++;
    }, 2000);
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);
  }
}
```

| React | Angular |
|---|---|
| `useEffect(() => { setup() }, [])` | `ngOnInit()` |
| `useEffect`가 반환하는 정리 함수 | `ngOnDestroy()` |
| 의존성 배열(`[dep1, dep2]`)로 재실행 시점 제어 | 훅이 아니라 **인터페이스**라서 "재실행"이라는 개념이 없음. 값이 바뀔 때마다 뭔가 하려면 `ngOnChanges` 또는 `effect()`(Signal 기반)를 따로 씀 |

`implements OnInit, OnDestroy`는 TypeScript에게 "이 클래스는 `ngOnInit`, `ngOnDestroy` 메서드를 반드시 구현한다"고 알려주는 타입 체크 장치입니다. 실제 호출은 Angular 프레임워크가 컴포넌트 생성/제거 시점에 자동으로 해줍니다.

Home 화면의 "재고 모니터 언마운트" 버튼으로 `@if`를 꺼보면, 콘솔이나 브라우저 성능 탭에서 타이머가 실제로 멈추는 것(=`ngOnDestroy` 호출)을 확인할 수 있습니다.

## 3. `ViewChild` — DOM 요소 직접 접근

React의 `useRef` + `ref={inputRef}`에 대응합니다.

```html
<input #filterInput placeholder="..." />
<button (click)="focusFilterInput()">ViewChild로 입력창 포커스</button>
```

```typescript
@ViewChild('filterInput') filterInput?: ElementRef<HTMLInputElement>;

focusFilterInput() {
  this.filterInput?.nativeElement.focus();
}
```

- `#filterInput`: 템플릿 참조 변수(template reference variable). React에는 없는 문법으로, 템플릿 안에서 특정 엘리먼트를 가리키는 이름표를 붙입니다.
- `@ViewChild('filterInput')`: 그 이름표가 붙은 엘리먼트를 클래스 필드로 연결합니다. React의 `const inputRef = useRef<HTMLInputElement>(null)` + `<input ref={inputRef} />`와 정확히 같은 역할을 2단계(템플릿 이름표 + 클래스 필드)로 나눠서 합니다.
- `nativeElement`: 실제 DOM 엘리먼트. React의 `inputRef.current`에 대응.

## 4. 정리 — 이 컴포넌트가 study0~3 개념을 어떻게 조합하는지

`FruitStockMonitorComponent` 하나에 지금까지 배운 게 다 들어 있습니다.

1. 생성자로 서비스를 주입받음 (DI, 이번 문서 1절)
2. `ngOnInit`에서 타이머 시작, `ngOnDestroy`에서 정리 (라이프사이클, 이번 문서 2절)
3. `@ViewChild`로 DOM 접근 (이번 문서 3절)
4. `@for`로 서비스가 들고 있는 배열을 렌더링 (study1)
5. Home에서 `@if`로 마운트/언마운트 토글 (study0 2.2절)
