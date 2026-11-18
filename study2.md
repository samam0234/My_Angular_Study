# study2 — 핵심 구조

> 🎯 **목표**: standalone 컴포넌트, 입력/출력, `@Injectable` 서비스를 만들어 화면과 데이터 책임을 나눈다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`demo/src/app/services/fruit-inventory.service.ts`](./demo/src/app/services/fruit-inventory.service.ts), [`demo/src/app/components/fruit-stock-monitor`](./demo/src/app/components/fruit-stock-monitor), [`demo/src/app/components/login-form-practice`](./demo/src/app/components/login-form-practice)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular 앱의 기본 단위는 컴포넌트와 서비스다.

- 컴포넌트는 화면이다. `@Component`가 선택자, 템플릿, 스타일, 이 템플릿이 쓸 다른 구성 요소를 선언한다.
- 서비스는 화면이 아닌 로직이다. 목록 보관, 로그인 상태, HTTP 호출이 여기 있다.
- `@Injectable({ providedIn: 'root' })`는 그 서비스의 인스턴스를 앱 전체에서 하나(싱글턴)로 만든다. 컴포넌트마다 `new` 하지 않는다.
- 의존성 주입은 생성자나 `inject()`로 그 싱글턴을 받아 오는 방식이다. 호출하는 쪽이 대상을 만들지 않으므로, 테스트에서 가짜 서비스를 넣기 쉽다.
- 예전 앱은 `NgModule`의 `declarations`와 `providers`에 구성 요소를 등록했다. 이 저장소는 standalone이라 모듈 파일을 두지 않고, 컴포넌트 `imports`와 `providedIn: 'root'`로 같은 역할을 한다.

부모와 자식의 데이터 방향은 두 가지다.

- `@Input()` : 부모가 자식에게 값을 내린다.
- `@Output()` + `EventEmitter` : 자식이 부모에게 일이 생겼다고 알린다. 자식이 부모 필드를 직접 고치지 않는다.

라이프사이클 중 지금 필요한 두 훅만 기억한다.

- `ngOnInit` : 입력이 준비된 뒤 한 번. 타이머나 첫 로드를 시작한다.
- `ngOnDestroy` : 컴포넌트가 화면에서 제거되기 직전. 여기서 타이머를 끄지 않으면 사라진 화면이 계속 일한다.

`@ViewChild`는 템플릿 안의 특정 요소를 클래스에서 가리킨다. 모니터의 "필터 입력에 포커스"가 그 예다.

---

## 🛠️ 실기

### 1. 서비스

`demo/src/app/services/fruit-inventory.service.ts`

```ts
@Injectable({ providedIn: 'root' })
export class FruitInventoryService {
  private fruits: Fruit[] = FRUIT_CATALOG.map((fruit) => ({ ...fruit }));

  getFruits(): Fruit[] {
    return this.fruits;
  }

  bumpRandomStock() {
    const index = Math.floor(Math.random() * this.fruits.length);
    this.fruits[index] = {
      ...this.fruits[index],
      stock: this.fruits[index].stock + 1,
    };
  }
}
```

1. `providedIn: 'root'`라서 루트 주입기가 이 클래스의 인스턴스를 공유한다. 하위 컴포넌트 providers에서 다시 제공하면 별도 인스턴스가 생길 수 있다.
2. 카탈로그를 복사해 둔다. 원본 상수를 직접 고치지 않기 위해서다.
3. 화면은 이 배열을 읽어 그린다.
4. 임의 과일의 재고를 1 올린다.
5. 요소를 교체할 때 새 객체를 만들어 넣는다. 같은 객체의 필드만 조용히 고치는 것보다 이후 변경 감지가 읽기 쉽다.

### 2. 컴포넌트가 서비스를 받는다

`demo/src/app/components/fruit-stock-monitor/fruit-stock-monitor.component.ts`

```ts
export class FruitStockMonitorComponent implements OnInit, OnDestroy {
  @ViewChild('filterInput') filterInput?: ElementRef<HTMLInputElement>;

  constructor(private inventoryService: FruitInventoryService) {}

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

1. `OnInit`, `OnDestroy`를 구현한다고 타입에 적는다.
2. `#filterInput` 요소를 나중에 포커스하려고 잡아 둔다. 뷰가 생기기 전에는 `undefined`일 수 있다.
3. 생성자 매개변수에 서비스 타입을 적으면 Angular가 싱글턴을 넣어 준다.
4. 화면에 붙은 뒤 2초마다 재고를 올리고 횟수를 센다.
5. 홈의 버튼이 `@if`로 이 컴포넌트를 제거하면 `ngOnDestroy`가 타이머를 끈다.

같은 서비스를 `inject(FruitInventoryService)`로 받아도 된다. `project`의 페이지들은 생성자 대신 `inject()`를 쓴다. 둘 다 주입이다.

### 3. 출력으로 부모에게 알리기

`LoginFormPracticeComponent`는 로그인 값을 자기가 저장하지 않고 부모에게 넘긴다.

```ts
@Output() loginAttempt = new EventEmitter<{ username: string }>();

onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }
  this.loginAttempt.emit({ username: this.form.getRawValue().username });
}
```

부모 템플릿은 `(loginAttempt)="onLoginAttempt($event)"`로 받는다. `$event`가 `emit`에 넣은 객체다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `NullInjectorError: No provider for FruitInventoryService` | `@Injectable`이 빠졌거나 `providedIn`이 없음 | `@Injectable({ providedIn: 'root' })` |
| 화면을 닫아도 콘솔이 2초마다 돈다 | `clearInterval`을 안 함 | `ngOnDestroy`에서 해제 |
| `filterInput`이 항상 `undefined` | `@ViewChild`를 `ngOnInit`에서 읽음 | 뷰가 만들어진 뒤인 `ngAfterViewInit`에서 쓴다 |
| 자식이 `emit`해도 부모가 모름 | 템플릿에 `(loginAttempt)`가 없음 | 출력 이름과 괄호 바인딩을 맞춘다 |
| 서비스 배열을 고쳤는데 일부 화면만 옛 값 | 컴포넌트가 배열을 한 번 복사해 자기 필드로 둠 | 화면은 서비스 메서드로 최신 값을 읽는다 |

---

## ☐ 체크리스트

- ☑ 컴포넌트 / 템플릿 / 스타일 / 모듈
- ☑ 디펜던시 주입
- ☑ `providedIn: 'root'`가 싱글턴이라는 점을 예시로 말할 수 있다
- ☑ `@Input`과 `@Output`의 방향을 코드에서 가리킬 수 있다
- ☑ `ngOnInit`에서 시작한 타이머를 `ngOnDestroy`에서 끈다
- ☑ 컴포넌트와 서비스의 책임이 나뉘어 있다
- ☑ 이 저장소는 `NgModule` 대신 standalone `imports`를 쓴다

## ➡️ 다음 단계 연결

[study3](./study3.md)에서 컴포넌트 필드, 모델, `BehaviorSubject`로 상태를 다루는 방식을 비교한다.
