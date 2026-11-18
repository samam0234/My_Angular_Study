# study12 — 성능 최적화

> 🎯 **목표**: 목록 카드가 필요 이상으로 다시 그려지지 않게 하고, 운영 빌드 용량을 예산과 함께 읽는다.

- 위치: 후반 심화 (study11~18)
- 대응 코드: [`project/src/app/shared/post-card/post-card.component.ts`](./project/src/app/shared/post-card/post-card.component.ts), [`project/src/app/features/posts/post-list-page/post-list-page.component.html`](./project/src/app/features/posts/post-list-page/post-list-page.component.html), [`project/angular.json`](./project/angular.json)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

기본 변경 감지는 어떤 비동기 작업이 끝나도 컴포넌트 트리를 위에서 아래로 확인한다. 카드가 100개면 검색어를 한 글자 칠 때마다 100개 템플릿을 다시 실행할 수 있다.

`ChangeDetectionStrategy.OnPush`인 컴포넌트는 다음 때에만 자기 템플릿을 다시 본다.

- `@Input` 참조가 바뀜
- 템플릿이 읽는 signal이 바뀜
- 그 컴포넌트의 이벤트 핸들러가 실행됨
- `async` 파이프가 새 값을 받음
- `ChangeDetectorRef.markForCheck()`를 직접 호출

그래서 OnPush 카드에는 부모가 새 `post` 객체를 넘겨야 한다. 부모가 객체를 제자리에서 `post.title = ...`만 하면 카드가 모를 수 있다. 목록은 `map`으로 새 객체를 만들어 `[post]`에 넘긴다.

`@for`의 `track post.id`는 순서가 바뀌어도 같은 id의 DOM을 유지한다. `track`이 인덱스면 정렬만 해도 내용이 뒤섞여 보인다.

번들 쪽은 운영 빌드의 초기 합계가 사용자가 첫 화면에서 받는 양이다. 라우트를 `loadComponent: () => import(...)`로 나누면 상세와 실습실 코드가 첫 묶음에서 빠진다. 이 앱은 상세·실습실·관리자를 이미 지연 로딩한다. 아래 표의 오래된 빌드와 현재 빌드를 구분해 비교한다.

개발 서버 로그의 raw size는 비교에 쓰지 않는다. `ng serve`는 최적화가 꺼져 있다.

---

## 🛠️ 실기

### 1. 카드에 OnPush

```ts
@Component({
  selector: 'app-post-card',
  imports: [RouterLink],
  templateUrl: './post-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCardComponent {
  @Input({ required: true }) post!: Post;
  @Input() isFavorite = false;
  @Output() toggleFavorite = new EventEmitter<number>();
}
```

1. 이 카드는 입력이 바뀌거나 자기 버튼이 눌릴 때만 템플릿을 다시 실행한다.
2. 라우터 링크 지시자를 이 컴포넌트가 직접 가져온다.
3. 템플릿 파일은 그대로다.
4. OnPush를 선언한다.
5. `post`가 새 참조로 바뀌면 제목이 갱신된다.
6. 별 여부는 불리언 입력이라 값이 바뀌면 갱신된다.
7. 클릭은 이 컴포넌트의 이벤트이므로 핸들러가 돈다.

부모 목록은 이미 이렇게 넘긴다.

```html
@for (post of vm.items; track post.id) {
  <app-post-card
    [post]="post"
    [isFavorite]="post.isFavorite"
    (toggleFavorite)="onToggleFavorite($event)"
  />
}
```

`vm.items`의 각 요소는 `map`이 만든 새 객체라 `isFavorite`이 바뀌면 참조도 바뀐다.

### 2. 측정

명령:

```bash
cd project
npx ng build --configuration=production
```

2026-11-18, 글 등록 폼을 넣기 직전 결과다. 이 표는 Zone.js가 polyfill로 들어 있던 기준이다.

| 구분 | 원본 | 전송 추정 |
|---|---|---|
| main | 318.32 kB | 82.94 kB |
| polyfills (Zone.js 포함) | 34.59 kB | 11.33 kB |
| styles | 3.73 kB | 1.07 kB |
| 초기 합계 | 356.64 kB | 95.34 kB |

2026-11-19, zoneless를 켜고 브라우저 polyfill에서 Zone.js를 뺀 뒤의 결과다. CRUD와 404 처리가 들어 있는 소스다.

| 구분 | 원본 | 전송 추정 |
|---|---|---|
| main | 320.21 kB | 83.35 kB |
| styles | 3.73 kB | 1.07 kB |
| 초기 합계 | 323.94 kB | 84.42 kB |

polyfills 청크가 사라졌다. 줄어든 양은 대략 이전 Zone.js 34.59 kB와 같다. 경고 500 kB 아래다.

쿼리 쪽은 page·limit·q를 서버에 넘기고 SQL에서 검색·정렬·페이지를 처리한다. 기본 10개, 최대 50개다. 검색은 250ms debounce, switchMap은 이전 요청을 취소한다. 응답 캐시는 30초이며 쓰기 성공 시 비운다. 생성 시각·id 인덱스는 있지만 부분 문자열 검색의 대규모 실행 계획·부하 측정은 아직 없다.

2026-11-19 ASP.NET 연결 후 최신 Docker 운영 빌드: 초기 **304.03 kB**, 전송 추정 **83.13 kB**, 실습실 지연 청크 **40.34 kB**. 직전 297.58 kB에 가입 폼·공통 응답 처리 등이 추가된 결과다. 아래 검색 0.2~3.6ms는 과거 클라이언트 필터의 측정이며 현재 서버 검색 응답 성능을 뜻하지 않는다. 이미지 최적화·서버 응답 캐시·DB 실행 계획 측정은 미완료다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| OnPush 카드의 별이 안 바뀜 | 부모가 같은 객체 필드를 수정 | 새 객체를 입력으로 넘긴다 |
| `@for`가 항목을 전부 다시 만듦 | `track`이 매 변경마다 다른 값 | `track post.id` |
| 개발 서버는 70kB인데 운영은 300kB | 둘은 다른 빌드 | 판단은 `ng build`만 |
| 예산 오류로 빌드 실패 | 초기 합계 1MB 초과 | `source-map-explorer`나 빌드 표에서 큰 파일을 찾고, 그 라우트를 `loadComponent`로 뺀다 |
| OnPush 부모 아래 기본 자식도 멈춘 것처럼 보임 | 부모 검사가 건너뛰어지면 자식 검사도 줄어듦 | 자식을 OnPush로 두고 입력을 새 참조로 내린다 |

---

## ☐ 체크리스트

- ☑ 게시글 카드가 OnPush다
- ☑ 목록 `@for`가 `post.id`를 track한다
- ☑ 운영 빌드 초기 합계를 기록했다. Zone.js 포함 356.64 kB, zoneless 이후 323.94 kB. 둘 다 500 kB 경고보다 작다
- ☑ 목록 쿼리가 페이지와 개수를 서버에 넘긴다
- ☑ 상세·실습실·관리자를 `loadComponent`로 뺐다. 지연 로딩 직후에는 297.58 kB였으며, 현재 API·가입 폼 반영 후 초기 304.03 kB, 실습실 지연 청크 40.34 kB다
- ☑ 검색 입력 다섯 번의 갱신 시간은 0.2, 1.6, 0.5, 3.6, 0.4 ms였다. 입력 이벤트 뒤 다음 태스크까지다

- ☐ 실제 DB 검색 실행 계획·부하 테스트·p95 응답 시간 측정

## ➡️ 다음 단계 연결

[study13](./study13.md)에서 날짜 표시는 `date-fns`에, 실습실 카운터는 NgRx SignalStore에 맡긴다.
