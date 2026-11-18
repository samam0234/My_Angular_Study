# study11 — 상태·데이터 흐름 심화

> 🎯 **목표**: 로그인과 즐겨찾기의 원본을 signal로 두고, 비동기 요청은 최신 것만 남기며, NgRx SignalStore와 BehaviorSubject를 같은 화면에서 비교한다.

- 위치: 후반 심화 (study11~18)
- 대응 코드: [`project/src/app/core/auth/auth.service.ts`](./project/src/app/core/auth/auth.service.ts), [`project/src/app/features/posts/favorites.service.ts`](./project/src/app/features/posts/favorites.service.ts), [`project/src/app/features/lab`](./project/src/app/features/lab), [`project/src/app/app.config.ts`](./project/src/app/app.config.ts)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

`BehaviorSubject`는 현재 값을 `.value`로 읽고 `next`로 바꾼 뒤, 구독자에게 스트림으로 알린다. `signal`은 읽을 때 `user()`처럼 호출하고 `set`/`update`로 바꾼다. 템플릿이 그 함수를 호출하면 Angular가 그 컴포넌트를 다시 그릴 대상으로 기억한다.

이 게시판은 둘을 같이 쓴다. 원본은 signal이고, 이미 `async` 파이프로 짜 둔 목록·헤더는 `toObservable(signal)`이 만든 스트림을 구독한다. 원본이 두 개면 새로고침 복원과 화면이 어긋난다.

비동기에서 중요한 연산자는 그대로다.

- `switchMap`은 페이지를 빨리 넘길 때 이전 HTTP를 버린다. 이는 요청 취소 정책이다. 별도의 메모리 캐시는 page·limit·q를 키로 30초 동안 보관하며 최대 30개 키를 둔다. 등록·수정·삭제 성공 시 전체 캐시를 무효화한다.
- `forkJoin`은 글과 댓글처럼 둘 다 있어야 화면이 되는 요청을 모은다.
- `combineLatest`는 목록, 즐겨찾기, 검색어처럼 출처가 다른 현재 값을 한 화면 모델로 합친다.

Zone.js는 비동기 작업이 끝날 때마다 컴포넌트 트리를 검사한다. signal, `async` 파이프, 템플릿 이벤트만으로 화면을 고칠 수 있으면 그 검사를 끌 수 있다. Angular 19의 함수는 `provideExperimentalZonelessChangeDetection()`다. `project/` 게시판은 이 함수를 켜고, 브라우저 빌드 polyfill에서 `zone.js`를 뺐다. 테스트 러너는 그대로 `zone.js`를 쓴다. `demo/`의 재고 모니터는 `setInterval`로 클래스 필드를 바꾸므로 Zone.js를 유지한다.

목록의 `loading`과 `draftError`는 `tap`과 HTTP 콜백 안에서 바뀐다. 클래스 필드면 요청이 끝나는 순간까지 로딩 문구가 안 그려진다. signal로 바꾸면 그 대입 자체가 화면 갱신을 예약한다. 상세 화면의 오류 문장도 필드에 숨기지 않고 `viewModel$` 값으로 흘려, `async` 파이프가 그리게 했다.

NgRx SignalStore는 signal 위에 상태와 메서드를 선언하는 라이브러리다. `BehaviorSubject` 서비스와 하는 일은 같다. "지금 숫자와 그 숫자를 바꾸는 함수"다. 차이는 업데이트 경로가 `patchState`로 모이고, 상태가 커질 때 메서드 목록이 한 선언에 보인다는 점이다. 게시판 로그인 원본을 SignalStore로 바꾸지는 않았다. 실습실 카운터만 올려 비교한다.

---

## 🛠️ 실기

### 1. 원본은 signal, 구독은 옵저버블

```ts
private favoriteIdsSignal = signal<Set<number>>(readStoredIds());
readonly favoriteIds = this.favoriteIdsSignal.asReadonly();
readonly favoriteIds$ = toObservable(this.favoriteIdsSignal);

toggle(id: number) {
  const next = new Set(this.favoriteIdsSignal());
  if (next.has(id)) next.delete(id);
  else next.add(id);
  this.favoriteIdsSignal.set(next);
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...next]));
}
```

1. 저장소의 배열을 `Set`으로 읽어 첫 signal 값으로 쓴다.
2. 바깥에서는 읽기 전용 signal만 준다. `set`은 서비스만 한다.
3. 목록의 `combineLatest`가 이미 구독하던 스트림을 유지한다.
4. `Set`은 제자리 `add`를 하면 같은 참조라 signal이 변화를 놓칠 수 있다. 항상 새 `Set`을 만든다.
5. 있으면 빼고 없으면 넣는다.
6. 새 `Set`을 넣어 구독자와 템플릿에 알린다.
7. 배열로 바꿔 저장한다. `Set`은 JSON이 되지 않는다.

로그인 사용자도 같은 패턴이다. study7의 `login`/`logout`이 그 코드다.

### 2. 실습실에서 세 가지를 나란히

`/lab`의 버튼 세 개는 서로 다른 저장소를 1씩 올린다.

- `BehaviorSubject`는 `next(value + 1)`이고 템플릿은 `async`다.
- signal은 `update((count) => count + 1)`이고 템플릿은 `signalCount()`다.
- `LabCounterStore`는 `patchState(store, { count: store.count() + 1 })`다.

```ts
export const LabCounterStore = signalStore(
  { providedIn: 'root' },
  withState({ count: 0 }),
  withMethods((store) => ({
    increment(): void {
      patchState(store, { count: store.count() + 1 });
    },
  })),
);
```

1. 이 스토어도 앱 전체 싱글턴이다.
2. 상태 모양은 `{ count: 0 }`이다.
3. 메서드는 스토어를 인자로 받는다.
4. `count()`가 현재 값이고, `patchState`가 다음 값을 만든다.

실습실 컴포넌트는 `ChangeDetectionStrategy.OnPush`다. 세 버튼이 모두 숫자를 바꾸면, OnPush여도 signal과 `async` 파이프, SignalStore signal이 각자 화면을 갱신한다는 뜻이다.

### 3. zoneless를 켠 뒤

`app.config.ts`의 첫 provider는 `provideExperimentalZonelessChangeDetection()`다. `angular.json` 브라우저 polyfill 목록은 비어 있다. 운영 빌드 초기 합계는 Zone.js polyfill 34.59 kB가 빠진 323.94 kB(전송 추정 84.42 kB)다. 직전 Zone.js 포함 빌드는 359.03 kB였다.

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
  ],
};
```

1. 이 한 줄이 Zone.js 스케줄러를 끈다.
2. 라우터 이벤트는 라우터 자신이 화면 갱신을 예약한다.
3. HTTP 응답은 `async` 파이프나 signal이 템플릿에 닿을 때 그려진다.

로딩 문구는 이렇게 signal이다.

```ts
readonly loading = signal(false);

tap(() => {
  this.loading.set(true);
  this.errorMessage.set('');
}),
```

1. 페이지 번호가 바뀌자마자 `true`가 된다. HTTP가 끝나기 전에도 템플릿이 `loading()`을 다시 그린다.
2. 이전 오류 문장을 같은 시점에 지운다.

2026-11-19에 `http://127.0.0.1:4200`에서 목록, 빈 폼 오류, 페이지 이동, 상세, 로그인, 실습실 카운터를 다시 눌렀다. Zone.js 없이 글 목록과 버튼 숫자가 바뀌었다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `Set`에 add했는데 화면이 그대로 | 같은 `Set`을 다시 `set`했거나 제자리 수정만 함 | 새 `Set`을 `set`한다 |
| `toObservable`이 `NG0203` | 주입 컨텍스트 밖에서 호출 | 서비스 필드 초기화나 생성자 안에서 호출 |
| SignalStore 숫자가 0에서 안 변함 | 템플릿이 `counterStore.count`를 호출하지 않음 | `counterStore.count()` |
| zoneless로 바꿨더니 로딩 문구가 멈춤 | `tap`에서 클래스 필드만 변경 | 그 필드를 signal로 바꾸거나 Zone.js를 유지 |
| 로그인 signal과 Subject를 둘 다 갱신 | 원본이 두 개 | 쓰는 쪽은 `toObservable` 하나만 구독 |

---

## ☐ 체크리스트

- ☑ Signal 기반 상태와 로그인 유지(localStorage 동기화 — 노션 원문). 현재 로그인은 HttpOnly 쿠키와 `/auth/me`, localStorage는 즐겨찾기만 동기화한다
- ☑ 즐겨찾기 `Set`도 같은 방식으로 저장소와 맞춘다
- ☑ `switchMap`으로 이전 목록 요청을 버린다
- ☑ NgRx SignalStore와 BehaviorSubject를 실습실에서 나란히 증가시켜 비교했다
- ☑ Signal 기반 상태로 일부 리팩터링해보고 Zone.js 없는(zoneless) 변경 감지 체감해보기. 게시판만 켰고, `demo/` 타이머는 Zone.js에 남긴다
- ☑ 목록 응답을 페이지·검색 키로 30초간 메모리에 둔다. 유효한 동일 키의 두 번째 조회는 HTTP를 열지 않고 변경 성공 시 무효화한다
- ☑ NgRx SignalStore와 BehaviorSubject를 실습실에서 비교했다
- ☐ NgRx 등 상태관리 라이브러리와 BehaviorSubject 서비스 비교(Redux Toolkit와도 대조) — 원문 중 Angular 내 비교는 완료. Redux Toolkit 대조는 사용자의 단일 프레임워크 범위에 따라 제외한다

Redux Toolkit 대조는 이 과정에서 하지 않는다. Angular 쪽 비교는 실습실의 SignalStore와 `BehaviorSubject`까지다.

## ➡️ 다음 단계 연결

[study12](./study12.md)에서 OnPush와 운영 빌드 용량으로, 상태를 나눈 결과가 첫 화면에 얼마나 실리는지 잰다.
