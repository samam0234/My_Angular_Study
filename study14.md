# study14 — TypeScript·린트·포매터

> 🎯 **목표**: 컴파일러가 막는 실수와, ESLint·Prettier가 막는 실수를 구분해서 실행한다.

- 위치: 후반 심화 (study11~18)
- 대응 코드: [`project/tsconfig.json`](./project/tsconfig.json), [`project/eslint.config.mjs`](./project/eslint.config.mjs), [`project/.prettierrc.json`](./project/.prettierrc.json)
- 이 문서는 Angular만 다룬다.

---

## 📖 이론

TypeScript는 이 앱의 기본 언어다. `Post`의 `title`을 숫자로 넘기면 `ng build`가 실패한다. 그건 타입 검사다.

ESLint는 타입과는 별도로, 쓰이지 않는 변수나 실수하기 쉬운 패턴을 본다. Prettier는 따옴표와 줄 길이처럼 동작과 상관없는 모양을 맞춘다. 셋을 한 도구로 생각하면 규칙이 서로 싸운다. 역할만 나눈다.

| 도구 | 명령 | 실패하면 |
|---|---|---|
| TypeScript + Angular 템플릿 | `npx ng build` | 타입, 템플릿 바인딩, 없는 파이프 |
| ESLint | `npm run lint` | `src`의 추천 규칙 위반 |
| Prettier | `npm run format:check` | 지정한 파일의 모양이 다름 |

`tsconfig.json`에서 이 저장소가 켜 둔 것은 `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`다. Angular 쪽은 `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`다.

`strictTemplates` 때문에 템플릿의 `post.title`도 검사된다. `strictInputAccessModifiers` 때문에 입력을 템플릿 밖에서 함부로 대입하기 어렵다.

`noImplicitReturns`는 함수의 어떤 분기가 값을 안 돌려주면 오류다. 가드처럼 `true` 또는 `UrlTree`를 반드시 반환하는 함수에 맞다.

---

## 🛠️ 실기

### 1. 엄격 옵션이 막아 주는 예

환경 파일을 읽을 때 인덱스 서명을 그대로 두지 않았다. `environment.apiBaseUrl`처럼 알려진 속성만 쓴다. `noPropertyAccessFromIndexSignature`는 인덱스 서명으로만 알려진 키에 점 접근을 금지하고 대괄호 접근을 요구한다. 명시적으로 선언한 environment.apiBaseUrl에는 점 접근이 가능하다.

가드의 `_route`처럼 일부러 안 쓰는 인자는 밑줄로 시작한다. ESLint 규칙은 `argsIgnorePattern: '^_'`라 이 이름을 허용한다.

```js
rules: {
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
}
```

1. 추천 규칙 중 미사용 변수만 조정한다.
2. `_route` 같은 자리는 남기고, `unused`처럼 진짜 안 쓰는 이름은 실패한다.

`eslint.config.mjs`는 `@eslint/js`의 recommended와 `typescript-eslint`의 recommended를 이어서 쓴다. `dist`, `.angular`, `node_modules`는 무시한다.

### 2. 실행

```bash
cd project
npm run lint
npx ng build --configuration=production
```

2026-11-18에 `npm run lint`는 오류 없이 끝났다. 빌드도 성공했다.

Prettier 설정은 작은따옴표, 줄 길이 100, trailing comma다. `format:check` 대상은 `src/app/core`, 실습실, 날짜 파이프다. 저장소 전체를 한 번에 다시 쓰지 않았다. 기존 파일의 줄바꿈까지 커밋에 섞이지 않게 범위를 좁혔다.

```bash
npm run format:check
```

모양이 다르면 Prettier가 그 파일을 알려 준다. 고칠 때는 그 파일만 `npx prettier --write <파일>` 한다.

### 3. 템플릿과 클래스의 타입이 만나는 곳

`FormBuilder.nonNullable.group`의 `getRawValue()`는 `{ email: string; password: string }`이다. `login(email, password)`에 두 문자열을 넘길 수 있다. 그룹을 nullable로 만들면 `string | null`이 되어 `login`에 바로 넘기지 못한다. 이게 포매터가 아니라 컴파일러가 잡는 차이다.

---

## ⚠️ 오류 노트

| 증상 | 원인 | 해결 |
|---|---|---|
| 템플릿은 괜찮은데 `Object is possibly null` | `strict`에서 DOM 조회나 라우트 파라미터가 `null` | `snapshot` 값을 검사하거나 기본값을 둔다 |
| ESLint가 `ng` 빌드와 다른 파일을 봄 | 린트는 `src` 전체, 빌드는 `tsconfig.app.json` | 스펙 파일 오류는 테스트 컴파일에서, 린트 오류는 `npm run lint`에서 고친다 |
| Prettier와 ESLint가 같은 줄을 서로 고침 | 둘 다 줄바꿈을 소유 | 이 설정에서 줄바꿈은 Prettier만 맡긴다 |
| `eslint.config.mjs`를 못 찾음 | 명령을 `demo/`에서 실행 | `project/`에서 실행한다. demo에도 별도 ESLint 설정이 있다. 수정할 프로젝트의 설정을 확인한다 |
| 경로 별칭 `@app`이 없음 | `tsconfig`에 `paths`를 안 넣음 | 상대 경로를 유지한다. 별칭은 폴더가 더 깊어지면 추가한다 |

---

## ☐ 체크리스트

- ☑ `strict`와 `strictTemplates`가 켜져 있다
- ☑ `npm run lint`가 `project/src`에서 통과했다
- ☑ 미사용 인자만 `_`로 허용한다
- ☑ Prettier 설정 파일이 있고 검사 범위를 새 코드로 한정했다
- ☑ 운영 빌드가 타입과 템플릿을 함께 검사한다
- ☑ `demo/`에도 같은 ESLint 설정을 붙였고 `npx eslint src`가 통과했다
- ☑ 저장 시 포맷을 `.vscode/settings.json`의 `editor.formatOnSave`로 연결했다

## ➡️ 다음 단계 연결

[study15](./study15.md)에서 이미 통과한 단위·HTTP 테스트를 CI 워크플로에 올리고, E2E는 어디가 비어 있는지 적는다.
