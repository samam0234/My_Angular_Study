# Angular 학습 기록

Vue.js, React 학습을 마친 뒤 Angular(Angular CLI 19, standalone 컴포넌트 기반)로 넘어오며 정리한 학습 저장소입니다. 이론 문서 → 개별 실습(`demo/`) → 종합 프로젝트(`project/`) 순서로 진행합니다.

## 학습 문서

| 문서 | 내용 |
|---|---|
| [study0.md](./study0.md) | Angular 기초 이론 (변경 감지, 템플릿, DI, RxJS를 React와 비교) |
| [study1.md](./study1.md) | Angular CLI 명령어, 프로젝트 생성, 컴포넌트 / 템플릿 / 스타일 실습 |
| [study2.md](./study2.md) | 이벤트 바인딩, `[(ngModel)]` 양방향 바인딩, 리스트 상태 추가/삭제 |
| [study3.md](./study3.md) | 라이프사이클 훅, ViewChild, 첫 DI 서비스 |
| [study4.md](./study4.md) | `@Output`(자식→부모 통신), Reactive Forms |
| [study5.md](./study5.md) | Angular Router 기본 라우팅 (목록 → 상세) |
| [study6.md](./study6.md) | 고급 1: 중첩 라우팅, Route Guard |
| [study7.md](./study7.md) | 고급 2: HttpClient, RxJS(map / switchMap / catchError) |
| [study8.md](./study8.md) | 고급 3: DI 심화, BehaviorSubject 전역 로그인 상태 |
| [study9.md](./study9.md) | 고급 4: RxJS 심화(Subject 비교, combineLatest), 즐겨찾기 |
| [study10.md](./study10.md) | 고급 5: JWT 인터셉터, environment, core/shared 폴더 구조, CORS |
| [studyFinal.md](./studyFinal.md) | 종합: React 게시판+로그인을 Angular로 재구현 |

## 프로젝트

- [`demo/`](./demo): study1~10 실습이 누적된 연습 프로젝트
- [`project/`](./project): studyFinal 종합 프로젝트 (미니 게시판, `core/shared/features` 구조)

## 실행 방법

Node.js 20 이상이 필요합니다. (Angular CLI 19 기준)

```bash
cd demo        # 또는 cd project
npm install
npm start      # 개발 서버 (기본 http://localhost:4200)
npm run build
```

`demo`와 `project`를 동시에 실행하려면 한쪽 포트를 바꿔주세요. (`npm start -- --port 4300`)

## 기술 스택

Angular 19, TypeScript, RxJS, Angular Router, HttpClient, Reactive Forms

## 에이전트 / 커밋 규칙

- 공통 규칙: [.agent/AGENTS.md](./.agent/AGENTS.md)
- 커밋 가이드: [.agent/COMMIT_GUIDE.md](./.agent/COMMIT_GUIDE.md)
