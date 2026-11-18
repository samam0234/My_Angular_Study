# study3 — 데이터 다루기

> 🎯 **목표**: 인터페이스로 데이터 모양을 고정하고, 필드·signal·Observable 중 어디에 상태를 둘지 고른다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`demo/src/app/models/fruit.model.ts`](./demo/src/app/models/fruit.model.ts), [`demo/src/app/components/counter-practice`](./demo/src/app/components/counter-practice), [`demo/src/app/core/auth/auth.service.ts`](./demo/src/app/core/auth/auth.service.ts), [`project/src/app/models/post.model.ts`](./project/src/app/models/post.model.ts)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular에서 "상태"는 특별한 저장소 이름이기 전에, 템플릿이 읽는 값이다.

| 두는 곳 | 맞는 경우 | 이 저장소의 예 |
|---|---|---|
| 컴포넌트 필드 | 그 화면에서만 쓰는 값 | 카운터 `count`, 로딩 플래그 |
| 서비스 필드 | 여러 화면이 같은 값을 봄 | 과일 재고 배열 |
| `BehaviorSubject` | 지금 값도 필요하고, 이후 변화도 구독해야 함 | `demo`의 로그인 사용자 |
| `signal` | 지금 값을 함수처럼 읽고, 템플릿이 그 변화만 따라감 | `project`의 로그인·즐겨찾기. study11에서 이어서 본다 |
| `Observable` | HTTP처럼 나중에 도착하는 값 | 게시글 목록 |

`BehaviorSubject`는 만들어질 때 현재 값을 갖고, 구독하는 즉시 그 값을 한 번 보낸 뒤 이후 `next`도 보낸다. 템플릿에서는 `async` 파이프로 구독한다. 파이프가 구독을 끝내 주므로 컴포넌트가 직접 `unsubscribe`하지 않아도 된다.

모델은 클래스보다 `interface`로 두는 경우가 많다. `Post`는 `id`, `userId`, `title`, `body`만 약속하면 되고, 메서드가 없기 때문이다. HTTP 응답이 이 모양이라고 컴파일러에게 알려 주는 역할이다. 런타임에 서버가 다른 모양을 주면 타입은 막지 못한다. 그건 study16의 검증 문제다.

옵저버블을 직접 구독하면 컴포넌트가 사라질 때 구독을 끊어야 한다. `async` 파이프, `takeUntilDestroyed()`, 또는 HTTP처럼 한 번 끝나고 마치는 스트림이면 누수를 피하기 쉽다. 타이머형 구독은 반드시 해제한다.

---

## 🛠️ 실기

### 1. 모델

`project/src/app/models/post.model.ts`

```ts
export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}
```

1. 게시글 한 건의 필드 이름을 고정한다.
2. `userId`는 API 응답의 `author.id`를 PostService에서 변환한 작성자 번호다. 서버는 작성 시 클라이언트가 보낸 번호를 신뢰하지 않는다.
3. 제목과 본문은 문자열이다.
4. 이 인터페이스를 `HttpClient.get<Post[]>`에 넘기면 응답을 그 배열로 다루게 된다.

과일도 같은 방식이다. `Fruit`은 `id`, `name`, `stock`뿐이다.

### 2. 화면 안에만 있는 상태

카운터의 `count = 0`은 그 컴포넌트 밖에서는 보이지 않는다. 다른 화면에 같은 숫자를 보여줄 필요가 생기면 서비스로 올린다. 올리지 않아도 되는 값을 서비스에 넣으면 앱 전체가 그 화면에 묶인다.

### 3. 여러 화면이 구독하는 상태

`demo`의 인증 서비스는 아직 `BehaviorSubject`다. `project`는 같은 역할을 signal로 옮겨 study11의 기준이 된다. demo 쪽 모양은 다음과 같다.

```ts
private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
currentUser$ = this.currentUserSubject.asObservable();

get isLoggedIn(): boolean {
  return this.currentUserSubject.value !== null;
}

login(username: string) {
  this.currentUserSubject.next({ username });
}
```

1. 처음 사용자는 `null`이다. `BehaviorSubject`라서 "아직 없음"도 현재 값으로 갖는다.
2. 바깥에는 `Observable`만 넘긴다. 누가 `next`를 부를지는 서비스가 정한다.
3. 템플릿이 구독하지 않아도 지금 로그인했는지 바로 읽게 한다.
4. `next`가 새 사용자를 보내면, 구독 중인 헤더가 다시 그려진다.

헤더 템플릿은 `currentUser$ | async`로 그 스트림을 구독한다. 값이 `null`이면 `@else`의 로그인 링크가 보인다.

### 4. 목록을 거르는 파생 값

게시글 목록은 서버 배열을 그대로 그리지 않는다. 키워드는 서버 검색과 페이지 초기화에 쓰고, 조회 결과와 즐겨찾기 여부를 `combineLatest`로 합쳐 화면에 낼 배열을 만든다. 원본 목록과 걸러진 목록을 둘 다 필드로 복사해 두면 쉽게 어긋난다. 스트림 안에서 `map`으로 만드는 편이 안전하다. 코드는 study6과 study9에서 다시 읽는다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 헤더가 로그인 뒤에도 빈 상태 | 템플릿이 `currentUser$`를 구독하지 않음 | `async` 파이프 또는 signal 읽기 |
| `Cannot read properties of null` | `async` 결과가 `null`인데 바로 `.name`을 읽음 | `@if (user$ \| async; as user)`로 값이 있을 때만 사용 |
| 구독이 두 번 실행되어 요청이 두 번 감 | 같은 옵저버블을 템플릿에서 두 번 `async` | 한 번 구독해 지역 변수로 받거나 `shareReplay` |
| 인터페이스와 다른 서버 필드 | 타입은 컴파일 전용 | 응답에서 필요한 필드가 있는지 좁혀서 사용 |
| 컴포넌트 필드와 서비스 값이 따로 놈 | 시작 시에만 `this.items = service.get()` | 서비스가 바뀌면 다시 읽거나 스트림으로 연결 |

---

## ☐ 체크리스트

- ☑ `Post`, `Fruit`, `User` 인터페이스가 있는 파일을 열 수 있다
- ☑ 화면 전용 상태와 앱 전역 상태를 나눌 수 있다
- ☑ `BehaviorSubject`의 현재 값과 `Observable` 공개 방식을 설명할 수 있다
- ☑ `async` 파이프가 구독을 대신한다는 점을 템플릿에서 찾을 수 있다
- ☑ 옵저버블을 구독하고 해제하는 법을 안다
- ☑ 파생 목록을 원본과 따로 저장하지 않고 `map`으로 만든다

## ➡️ 다음 단계 연결

[study4](./study4.md)에서 URL이 어떤 컴포넌트를 여는지, 주소의 id가 데이터 조회로 어떻게 이어지는지 본다.
