# study5 — 폼·입력·검증

> 🎯 **목표**: Reactive Forms로 입력을 받고, 검증이 실패하면 필드 아래에 이유를 보여 준다.

- 위치: 기초 구간 (study0~10)
- 대응 코드: [`demo/src/app/components/login-form-practice`](./demo/src/app/components/login-form-practice), [`project/src/app/features/auth/login-page`](./project/src/app/features/auth/login-page)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

Angular 폼은 두 가지다.

- 템플릿 주도 폼은 `ngModel`로 입력과 필드를 묶는다. 작은 입력에 빠르다.
- 반응형 폼은 클래스 안에 `FormGroup`을 만들고, 템플릿은 그 그룹을 바인딩만 한다. 검증, 테스트, 값 읽기가 클래스에 모인다.

이 저장소의 로그인과 글 등록은 반응형 폼이다. `FormBuilder.nonNullable.group`은 컨트롤의 값이 `null`로 리셋되지 않게 한다. `reset()` 뒤에도 빈 문자열이다.

자주 쓰는 검증은 `Validators.required`, `Validators.email`, `Validators.minLength`다. 실패하면 컨트롤의 `invalid`가 참이고, `errors`에 `{ required: true }` 같은 이유가 담긴다.

오류를 언제 보여 줄지가 사용성에 영향을 준다.

- 연습 폼은 `touched`일 때 보여 준다. 사용자가 입력을 떠났는데 비어 있으면 알려 준다.
- 게시판 로그인은 `submitted` 플래그를 둔다. 제출 버튼을 누르기 전에는 빨간 문장을 숨긴다.

화면 검증은 빠른 오류 안내이고 서버 검증은 신뢰 경계다. 현재 ASP.NET Core는 SQL Server의 비밀번호 해시를 검사한다. 이메일 형식과 길이가 맞아도 비밀번호가 틀리면 401이다. 가입·글쓰기 입력도 서버가 다시 검증한다.

---

## 🛠️ 실기

### 1. 연습 폼

`demo/src/app/components/login-form-practice/login-form-practice.component.ts`

```ts
form = this.fb.nonNullable.group({
  username: ['', [Validators.required, Validators.minLength(2)]],
  password: ['', [Validators.required, Validators.minLength(4)]],
});

get username() {
  return this.form.controls.username;
}

onSubmit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }
  this.loginAttempt.emit({ username: this.form.getRawValue().username });
  this.form.reset();
}
```

1. 아이디는 필수이고 2자 이상이다. 초기값은 빈 문자열이다.
2. 비밀번호는 필수이고 4자 이상이다.
3. 템플릿에서 `username.invalid`라고 짧게 쓰려고 컨트롤을 꺼낸다.
4. 제출 시 그룹 전체가 틀리면 모든 컨트롤을 touched로 만들어 오류를 드러내고 중단한다.
5. 통과하면 아이디만 부모에게 보내고 폼을 비운다.

템플릿은 `[formGroup]="form"`과 `formControlName="username"`으로 입력을 연결한다.

```html
@if (username.invalid && username.touched) {
  <p class="error-text">아이디는 2자 이상 입력해야 합니다.</p>
}
```

`invalid`만 보면 페이지를 열자마자 오류가 뜬다. `touched`와 같이 본다.

### 2. 게시판 로그인

`project/src/app/features/auth/login-page/login-page.component.ts`

```ts
submitted = false;
form = this.fb.nonNullable.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});

onSubmit() {
  this.submitted = true;
  if (this.form.invalid) return;
  const { email, password } = this.form.getRawValue();
  this.authService.login(email, password).subscribe({
    next: () => { void this.router.navigateByUrl('/'); },
    error: () => this.loginError.set('이메일 또는 비밀번호가 올바르지 않습니다.'),
  });
}
```

이 코드는 흐름을 줄인 발췌다. 실제 파일은 pending signal, 안전한 returnUrl 복귀, 회원가입 폼도 처리한다.

1. 아직 제출하지 않았다.
2. 이메일은 형식 검증, 비밀번호는 8자 이상이다.
3. 제출 플래그를 먼저 켠다. 템플릿의 `@if (submitted && email.invalid)`가 이때부터 문장을 보여 준다.
4. 틀리면 서비스에 들어가지 않는다.
5. 형식이 맞으면 이메일과 비밀번호를 서버로 보내고 성공 응답을 기다린다. 비동기 오류 문장은 signal로 둔다.
6. 실제 컴포넌트는 성공 응답 뒤 가드의 returnUrl이 안전한 내부 경로이면 복귀하고 아니면 목록으로 간다.

"테스트 계정 채우기"는 `setValue({ email: 'test@example.com', password: 'password123' })`로 두 칸을 한 번에 채운다.

목록의 글 등록 폼도 같은 패턴이다. 제목과 내용이 비어 있으면 `draftError`에 "제목과 내용을 모두 입력하세요."를 넣고 POST를 하지 않는다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| `formGroup expects a FormGroup` | 바인딩 값이 FormGroup 인스턴스가 아님 | 클래스 폼 초기화와 바인딩을 확인한다. 지시자 자체를 못 찾으면 ReactiveFormsModule imports도 확인 |
| `Cannot find control with name: 'email'` | `formControlName`과 그룹 키가 다름 | 철자를 맞춘다 |
| 제출해도 항상 invalid | 검증기 조건이 너무 셈 | `form.controls.email.errors`를 잠시 출력해 이유를 본다 |
| 오류 문장이 처음부터 보임 | `invalid`만 조건에 있음 | `touched` 또는 `submitted`를 같이 본다 |
| `getRawValue()`가 타입 오류 | nullable 그룹 | `nonNullable.group`을 쓴다 |
| 비밀번호가 맞는데 서버가 거절 | 화면 검증과 서버 검증은 별개 | 공통 error.message를 오류 문장으로 보여 준다. 로그인 실패 문장은 신원 정보를 감춘다 |

---

## ☐ 체크리스트

- ☑ 반응형 폼 (Reactive Forms)
- ☑ `FormBuilder`로 이메일·비밀번호 그룹을 만들었다
- ☑ 제출 전에 빈 값이면 요청을 보내지 않는다
- ☑ 오류 문장이 필드 아래에 조건부로 보인다
- ☑ `returnUrl`이 없을 때 목록으로 가는 기본값을 안다
- ☑ 화면 검증이 서버 검증을 대신하지 않는다는 점을 말할 수 있다

## ➡️ 다음 단계 연결

[study6](./study6.md)에서 `HttpClient`로 목록·상세·등록·수정·삭제를 호출한다.
