# study18 — AI 연동·MCP

> 🎯 **목표**: 모델 키를 서버에서만 사용하고, 키 없는 요약과 표준 stdio MCP 경로 안내를 구분해 실행한다.

- 대응 코드: [AI 클라이언트](./project/src/app/core/ai/ai-client.service.ts), [ASP.NET Core](./board-api-dotnet/Program.cs), [MCP](./board-mcp/server.mjs)

## 📖 이론

Angular는 로그인한 사용자의 `/api/summarize` 요청만 보낸다. 모델 키는 브라우저 환경 파일·번들에 넣지 않는다. compose는 `project/.env`의 OPENAI_API_KEY를 API 런타임에 전달한다. .NET 직접 실행은 환경 변수나 User Secrets를 사용하며 .env 파일을 자동으로 읽지 않는다. 기존 Node 서버의 `.env` 로더와 혼동하지 않는다.

키가 비면 `{ data: { summary, mode: 'mock' } }`를 반환하고 모델 네트워크를 열지 않는다. 키가 있으면 서버가 모델 API를 호출한다. 인증·길이·빈도 제한을 적용하고 30초 타임아웃을 둔다. 실제 키를 넣은 호출은 아직 검증하지 않았다.

MCP는 브라우저 HTTP API와 별개다. 에디터가 Node 자식 프로세스를 시작하고 UTF-8 JSON-RPC 메시지를 줄바꿈으로 구분해 주고받는다. stdout에는 프로토콜 메시지만 쓴다. 예전 Content-Length 프레이밍은 표준 stdio와 달라 이번에 교정했다. [공식 전송 규격](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)을 기준으로 한다.

## 🛠️ 실기 — 코드·줄별 설명

### 1. 브라우저 요청

```ts
const response = await firstValueFrom(
  this.http.post<{ data: { summary: string } }>(
    `${environment.apiBaseUrl}/summarize`, { text }, { withCredentials: true },
  ),
);
return response.data.summary;
```

1. 완료되는 HTTP Observable을 await 가능한 Promise로 바꾼다.
2. 서버의 공통 data 응답 형식을 선언한다.
3. 모델 주소·키가 아닌 같은 출처 API만 호출한다. 인터셉터가 변경 요청 헤더를 붙인다.
4. 요약 문장을 꺼낸다. 실습실은 성공·실패를 signal에 표시한다.

`/login`에서 로그인한 뒤 `/lab`의 “AI 목 요약”을 누른다. 키가 비어 있으면 목 응답이어야 한다. 키를 설정한 경우에는 과금 요청이 될 수 있으므로 실제 호출 기록과 목 응답을 구분한다.

### 2. 서버 키 설정

로컬 compose의 project/.env에 OPENAI_API_KEY를 설정하면 API 컨테이너를 다시 생성해야 반영된다. 이 학습 환경의 값은 비워 두었다. 비밀은 Git과 두 Docker 빌드 문맥에서 제외한다. 모델 이름은 서버 OPENAI_MODEL로 지정할 수 있고 기본은 기존 예제의 gpt-4o-mini다.

### 3. MCP 경로 도구

```js
function encode(message) {
  return `${JSON.stringify(message)}\n`;
}
```

1. JSON-RPC 객체를 받는다.
2. JSON 문자열 뒤에 실제 개행 하나를 붙여 메시지를 구분한다. 내용의 개행은 JSON escape로 보존된다.

서버는 initialize·notifications/initialized·ping·tools/list·tools/call을 처리한다. 도구 `list_study_routes`는 화면 경로만 돌려주며 DB나 AI를 호출하지 않는다. 알려진 프로토콜 버전을 협상하고 잘못된 JSON에는 -32700을 반환한 뒤 다음 메시지를 처리한다.

```bash
node board-mcp/server.mjs --self-test
```

자가 검사는 initialize를 두 청크로 나눠 전송하고 도구 목록·호출·잘못된 JSON·ping의 응답을 줄 단위로 파싱한다. 성공 출력은 `board-mcp self-test ok`다. `.cursor/mcp.json`에는 이 서버 명령이 있다. 실제 에디터가 도구를 호출한 결과까지 자동 확인한 것은 아니다.

## ⚠️ 오류 노트

| 증상 | 확인·해결 |
|---|---|
| 요약 401 | 서버 로그인 후 호출한다 |
| 계속 목 응답 | 키가 비었거나 컨테이너 재생성이 안 됨. 키 자체를 화면에 출력하지 않는다 |
| dotnet 실행이 예전 .env를 무시 | .NET은 기본적으로 .env를 읽지 않는다. 환경 변수·User Secrets 사용 |
| MCP가 응답을 기다리며 멈춤 | Content-Length 대신 줄 구분 JSON인지 확인 |
| MCP 상대 경로 오류 | 에디터 작업 경로가 루트인지 확인하거나 해당 환경의 절대 경로로 설정 |

## ☐ 체크리스트

- ☑ 키 없는 요약이 목 응답이고 모델 호출을 생략한다
- ☑ Angular 번들에는 키가 없고 API 환경 변수로만 주입한다
- ☑ 인증·입력 길이·요약 빈도·타임아웃 제한을 적용했다
- ☑ 표준 stdio 줄 구분 JSON, 초기화·도구 호출·오류 복구 자가 테스트
- ☑ `.cursor/mcp.json`에 경로 안내 도구 서버가 등록되어 있다
- ☐ 실제 모델 키로 요약 성공·실패·사용량을 검증한다
- ☐ 실제 MCP 에디터 클라이언트에서 도구 호출을 확인한다

## ➡️ 다음 단계 연결

[studyFinal](./studyFinal.md)에서 midpoint와 study11~18의 구현·측정·미완료 운영 항목을 모은다.
