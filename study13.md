# study13 — 생태계 라이브러리

> 🎯 **목표**: Angular에 자주 붙는 유틸과 상태 라이브러리를 앱 기능과 분리해 한 군데에만 연결한다.

- 위치: 후반 심화 (study11~18)
- 대응 코드: [`project/src/app/shared/format-instant.pipe.ts`](./project/src/app/shared/format-instant.pipe.ts), [`project/src/app/core/state/lab-counter.store.ts`](./project/src/app/core/state/lab-counter.store.ts), [`project/package.json`](./project/package.json)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular가 이미 가진 것 위에 라이브러리를 더할 때는 "화면 전체가 그 라이브러리의 컴포넌트가 되지 않게" 경계를 둔다.

이 저장소는 날짜 유틸, 상태 저장소, 접근성 CDK를 실습실 경계 안에 연결했다.

| 패키지 | 버전 | 역할 | 경계 |
|---|---|---|---|
| `date-fns` | 4.4 | 날짜를 `yyyy-MM-dd HH:mm`으로 표시 | 파이프 한 파일만 import |
| `@ngrx/signals` | 19.2 | 실습실 카운터의 SignalStore | `LabCounterStore`만 사용 |
| `@angular/cdk` | 19.2 | 실습실 포커스 트랩 | LabPageComponent만 사용 |

게시판 목록과 로그인은 이 둘을 import하지 않는다. 라이브러리를 빼도 목록은 빌드되어야 한다. 실습실만 실패해야 한다.

고르지 않은 것도 적는다. Angular Material 테마는 넣지 않았다. CDK의 cdkTrapFocus는 실습실에만 적용했고 버튼과 입력은 기본 HTML이다. UI 라이브러리를 넣으면 스타일 예산과 테마 제공자가 앱 설정으로 들어오므로, 필요한 화면이 생긴 뒤에 한 컴포넌트부터 붙이는 편이 맞다.

RxJS는 Angular 앱의 기본 의존이지 이번 단계에서 새로 고른 라이브러리가 아니다. `switchMap`과 `forkJoin`은 study6에 있다.

---

## 🛠️ 실기

### 1. 날짜 파이프

`project/src/app/shared/format-instant.pipe.ts`

```ts
@Pipe({ name: 'formatInstant' })
export class FormatInstantPipe implements PipeTransform {
  transform(value: Date | number | string | null | undefined, pattern = 'yyyy-MM-dd HH:mm'): string {
    if (value == null || value === '') return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return format(date, pattern, { locale: ko });
  }
}
```

1. 템플릿에서 `value | formatInstant`로 부른다.
2. `PipeTransform`의 `transform`이 그 호출이다.
3. 두 번째 인자가 없으면 분까지 보여 준다.
4. 비어 있으면 빈 문자열이다. 파이프가 예외를 던지면 화면 전체가 깨진다.
5. `Date`가 아니면 파싱한다.
6. `Invalid Date`는 빈 문자열로 돌린다.
7. `date-fns`의 `format`과 한국어 로케일로 만든다. 월 이름 패턴을 쓸 때만 로케일 차이가 드러나고, `yyyy-MM-dd`는 숫자라 로케일과 무관하다.

실습실 템플릿은 `{{ now() | formatInstant }}`다. signal 버튼을 누르면 `now`도 새 `Date`가 되어 문장이 바뀐다.

파이프 테스트는 `new Date(2026, 10, 18, 9, 30)`을 `yyyy-MM-dd`에 넣어 `2026-11-18`을 기대한다. `null`과 `'not-a-date'`는 빈 문자열이다.

### 2. 라이브러리를 템플릿에 노출하는 위치

`LabPageComponent`의 `imports: [AsyncPipe, FormatInstantPipe, CdkTrapFocus]`에만 파이프를 넣는다. standalone이라 전역 선언이 없다. 다른 화면 템플릿에 같은 파이프를 쓰면 그 컴포넌트 `imports`에도 넣어야 한다. 빠져 있으면 컴파일 오류로 바로 알 수 있다.

### 3. 설치

```bash
cd project
npm install date-fns @ngrx/signals@19 @angular/cdk@19
```

`@ngrx/signals@19`는 Angular 19와 맞추기 위한 지정이다. 최신 메이저만 따라가면 20과 어긋날 수 있다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `no pipe found with name 'formatInstant'` | 그 컴포넌트 `imports`에 파이프가 없음 | 쓰는 컴포넌트에 추가 |
| 날짜가 하루 어긋남 | UTC 문자열을 로컬로 해석 | 보여 줄 시간대를 패턴과 입력에서 먼저 정한다 |
| `NG0203` 또는 SignalStore 버전 오류 | NgRx 메이저와 Angular 메이저가 다름 | `@ngrx/signals@19` |
| 목록 컴포넌트가 `date-fns`를 직접 import | 경계가 무너짐 | 파이프 밖으로 나가지 않게 되돌린다 |
| 로케일 때문에 테스트가 환경마다 다름 | `PPP` 같은 이름 패턴 | 테스트는 `yyyy-MM-dd`만 쓴다 |

---

## ☐ 체크리스트

- ☑ `date-fns`를 파이프 한 곳으로 감쌌다
- ☑ 빈 값과 잘못된 날짜가 빈 문자열이다
- ☑ `@ngrx/signals` 19는 실습실 카운터만 쓴다
- ☑ 게시판 목록 파일은 두 패키지를 import하지 않는다
- ☑ `@angular/cdk`의 `cdkTrapFocus`를 실습실에만 붙였다. 전역 styles는 3.73 kB로 그대로고, CDK 코드는 현재 실습실 지연 청크 40.34 kB에 들어간다
- ☑ NgRx SignalStore와 BehaviorSubject의 갱신 경로를 실습실에서 확인했다
- ☐ Redux Toolkit와도 대조(노션 원문) — 단일 프레임워크 범위에 따라 수행하지 않았다

SignalStore와 `BehaviorSubject`의 비교 자체는 study11 실습실에서 했다. 위 마지막 항목의 Redux Toolkit 대조는 하지 않았으므로 원문을 비워 둔다.

## ➡️ 다음 단계 연결

[study14](./study14.md)에서 TypeScript 엄격 옵션과 ESLint, Prettier가 이 코드를 어떻게 고정하는지 본다.
