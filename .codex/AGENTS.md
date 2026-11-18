# Codex 전용 인수인계 문서

공통 규칙은 [../.agent/AGENTS.md](../.agent/AGENTS.md) 및 [../.agent/COMMIT_GUIDE.md](../.agent/COMMIT_GUIDE.md)를 먼저 확인하고 따릅니다.
이 문서에는 Codex를 사용할 때만 해당하는 특이사항을 기록합니다.

## Codex 관련 참고 사항

- 별도의 도구 제약이나 특이사항은 아직 없습니다. 작업 중 Codex 특유의 이슈(툴 제한, 동작 차이 등)를 발견하면 이 섹션에 기록합니다.

## 사용자 제시문 유지 (2026-11-19)

- Angular 노션 전체와 연결된 공통 API 스펙을 먼저 읽고 코드·문서를 대조한다. [원본 페이지](https://app.notion.com/p/Angular-3d6d7dec5e2e81768111cf546347639b).
- 루트 학습 문서는 study0~study10, studyMidpoint, study11~study18, studyFinal의 21개를 유지하고 기존 파일에 반영한다. midpoint·final도 study 접두어를 유지한다.
- 각 문서는 목표 한 줄 → 이론 → 실기(코드·줄별 설명) → 오류 노트 → 체크리스트 → 다음 단계다. midpoint는 목표·기능·폴더·구현 순서·완성 체크·회고, final은 목표·기능 확장·성능/보안·Docker/외부 배포·테스트·회고 순서를 함께 지킨다.
- 노션의 추가 항목을 해당 번호 체크리스트에 남기고, 다른 프론트엔드 프레임워크 비교·통합을 추가하지 않는다. 직접 Bearer 인터셉터와 Redux Toolkit 대조는 완료 처리하지 않는다. 현재 인증은 쿠키 방식이며 Redux 대조는 사용자 범위에서 제외했다.
- 이번 요청은 ASP.NET Core 백엔드 적용과 문서·노션 갱신을 승인했다. 이전 Cursor 제시문의 수정 금지 문장을 이번 작업을 막는 지시로 되돌려 해석하지 않는다. 후속 사용자가 새로 범위를 제한하면 그 지시를 따른다.
- 코드·문서 작업과 실제 검증 후 노션을 갱신한다. 외부 배포·모델 호출·원격 CI는 실제 증거 없이 완료로 표시하지 않는다. README를 유지한다.

## 현재 인수인계

- 기본 API는 board-api-dotnet(ASP.NET Core 10 + EF Core + SQL Server), 실행은 project/docker-compose.yml이다. 예전 Node board-api는 보존만 한다.
- project/.env는 생성해 두었으며 Git·이미지에서 제외한다. 비밀 값을 읽거나 출력하지 말고 실제 값은 실행 환경으로 주입한다. 모델 키는 비어 있다.
- 현재 실행 주소는 http://127.0.0.1:8080, API 5080, SQL loopback 14333이다. 개발 서버 4200은 별도 npm start가 필요하다.
- 검증 결과와 미완료 항목은 studyFinal.md가 기준이다. Angular 의존성 경고·운영 설정 보강·공개 배포·원격 CI·실제 모델/에디터 MCP 호출은 미완료다.
- 사용자 기존 미커밋 변경과 이번 변경을 함께 보존했다. 커밋·push는 하지 않았다.
