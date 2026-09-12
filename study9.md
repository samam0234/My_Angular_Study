# study9 (고급4) — RxJS 심화(Subject 종류, combineLatest), 즐겨찾기 상태관리

## 1. `Subject` 종류 비교

study8에서 `BehaviorSubject`를 실전에 썼습니다. RxJS에는 성격이 다른 Subject가 몇 가지 더 있습니다.

| 종류 | 특징 | 비유 |
|---|---|---|
| `Subject` | 구독 시점 **이후에** 흘러온 값만 받음. 과거 값 기억 안 함 | 라디오 방송 — 켜는 순간부터만 들림 |
| `BehaviorSubject` | **현재 값 1개**를 항상 기억. 새 구독자는 즉시 최신값을 받음 | 온도계 — 지금 몇 도인지 항상 확인 가능 |
| `ReplaySubject(n)` | 최근 값 **n개**를 기억했다가 새 구독자에게 순서대로 재생 | 최근 알림 목록 — 늦게 들어와도 최근 n개는 다시 봄 |

```typescript
const subject = new Subject<number>();
subject.subscribe((v) => console.log('A', v));
subject.next(1);                                  // A: 1
subject.subscribe((v) => console.log('B', v));    // B는 아직 아무것도 못 받음
subject.next(2);                                  // A: 2, B: 2

const behavior = new BehaviorSubject<number>(0);
behavior.subscribe((v) => console.log('C', v));   // C: 0 (즉시 현재값을 받음)
behavior.next(1);                                 // C: 1
behavior.subscribe((v) => console.log('D', v));   // D: 1 (뒤늦게 구독해도 최신값부터)
```

이 커리큘럼에서 전역 상태(`AuthService`, `FavoritesService`)에 항상 `BehaviorSubject`를 쓴 이유가 이것입니다 — "지금 로그인 상태가 뭐지?"를 **아무 때나 새로 구독해도 즉시 알 수 있어야** 하기 때문입니다. 일반 `Subject`를 썼다면, 로그인 이후에 화면에 새로 나타난 컴포넌트는 로그인 여부를 알 방법이 없습니다(그 시점 이전에 흘러간 값이라 놓침).

## 2. 즐겨찾기 상태 서비스

study8과 완전히 같은 패턴으로, 즐겨찾기 id 집합을 서비스에 둡니다.

```typescript
// services/favorites.service.ts
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private favoriteIdsSubject = new BehaviorSubject<Set<number>>(new Set());
  favoriteIds$ = this.favoriteIdsSubject.asObservable();

  toggle(id: number) {
    const next = new Set(this.favoriteIdsSubject.value);
    next.has(id) ? next.delete(id) : next.add(id);
    this.favoriteIdsSubject.next(next);
  }
}
```

## 3. `combineLatest` — 서로 다른 두 스트림을 하나로 합치기

게시글 목록 화면에 "이 게시글이 즐겨찾기됐는지"를 같이 보여주려면, **서로 다른 두 서비스의 상태(게시글 목록 + 즐겨찾기 id 집합)를 조합**해야 합니다.

```typescript
private posts$ = this.userIdControl.valueChanges.pipe(
  startWith(''),
  debounceTime(300),
  distinctUntilChanged(),
  tap(() => { this.loading = true; this.errorMessage = ''; }),
  switchMap((userId) => this.postService.getPosts(userId).pipe(catchError(() => { /* ... */ return of<Post[]>([]); }))),
  tap(() => { this.loading = false; }),
);

// combineLatest: 두 스트림 중 하나라도 새 값을 내보내면, 최신 값 두 개를 다시 조합해서 내보낸다.
viewModel$ = combineLatest([this.posts$, this.favoritesService.favoriteIds$]).pipe(
  map(([posts, favoriteIds]) => posts.map((post) => ({ ...post, isFavorite: favoriteIds.has(post.id) }))),
);
```

`combineLatest([a$, b$])`는 `a$`와 `b$` **둘 다 최소 한 번씩 값을 낸 뒤부터**, 둘 중 어느 하나라도 새 값을 내면 `[a의 최신값, b의 최신값]`을 새로 조합해서 내보냅니다.

- React라면 `posts` state와 `favoriteIds` state를 각각 `useState`로 관리하고, 렌더링 시점에 `posts.map(p => ({...p, isFavorite: favoriteIds.has(p.id)}))`을 직접 계산했을 것입니다(파생 상태를 렌더 중 계산 — study0의 `useMemo` 없이도 되는 패턴과 유사).
- RxJS 방식은 "두 상태가 어떻게 합쳐지는지"를 **선언적으로 스트림 파이프라인에 표현**합니다. 상태의 출처(다른 서비스, 심지어 다른 컴포넌트)가 늘어나도 `combineLatest([a$, b$, c$, ...])`로 계속 이어붙이면 됩니다.

## 4. 즐겨찾기 토글 UI

```html
@if (viewModel$ | async; as posts) {
  @if (loading) {
    <p>불러오는 중...</p>
  } @else if (errorMessage) {
    <p class="error-text">{{ errorMessage }}</p>
  } @else if (posts.length === 0) {
    <p>게시글이 없습니다.</p>
  } @else {
    <ul class="fruit-list">
      @for (post of posts; track post.id) {
        <li class="fruit-card">
          <a [routerLink]="['/posts', post.id]">{{ post.title }}</a>
          <button [class.active]="post.isFavorite" (click)="toggleFavorite(post.id)">
            {{ post.isFavorite ? '★ 즐겨찾기 취소' : '☆ 즐겨찾기' }}
          </button>
        </li>
      }
    </ul>
  }
} @else {
  <p>불러오는 중...</p>
}
```

`as` 바인딩(`; as posts`)은 **그 블록 체인의 첫 `@if`에만** 붙일 수 있어서(Angular 컴파일러 제약), `viewModel$ | async` 결과를 가장 바깥 `@if`로 두고, `loading`/`errorMessage`/빈 배열 분기는 그 안에서 다시 `@if`/`@else if`로 중첩했습니다.

즐겨찾기 버튼을 누르면 `FavoritesService.toggle()`이 `BehaviorSubject`에 새 `Set`을 흘려보내고, `combineLatest`가 즉시 반응해서 `viewModel$`가 새 값을 내보냅니다 — 게시글 목록을 다시 불러오지 않고도(HTTP 요청 없이) 화면의 즐겨찾기 표시만 갱신됩니다.
