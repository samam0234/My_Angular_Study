import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const serverInfo = { name: 'angular-board', version: '0.1.0' };
const tools = [
  {
    name: 'list_study_routes',
    description: 'Angular 학습 게시판의 화면 경로를 반환한다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

function encode(message) {
  return `${JSON.stringify(message)}\n`;
}

function handle(message) {
  if (message.method === 'notifications/initialized') {
    return null;
  }
  if (message.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion: ['2024-11-05', '2025-03-26', '2025-06-18', '2025-11-25'].includes(message.params?.protocolVersion)
          ? message.params.protocolVersion : '2025-11-25',
        capabilities: { tools: {} },
        serverInfo,
      },
    };
  }
  if (message.method === 'ping') return { jsonrpc: '2.0', id: message.id, result: {} };
  if (message.method === 'tools/list') {
    return { jsonrpc: '2.0', id: message.id, result: { tools } };
  }
  if (message.method === 'tools/call' && message.params?.name === 'list_study_routes') {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        content: [
          {
            type: 'text',
            text: '/ 목록, /posts/:id 상세, /login 로그인, /mypage 보호된 마이페이지, /lab 실습실',
          },
        ],
      },
    };
  }
  if (message.id !== undefined) {
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32601, message: `Unknown method: ${message.method}` },
    };
  }
  return null;
}

function consume(buffer, output) {
  let rest = buffer;
  while (true) {
    const end = rest.indexOf('\n');
    if (end === -1) return rest;
    const body = rest.subarray(0, end).toString('utf8').trim();
    rest = rest.subarray(end + 1);
    if (!body) continue;
    try {
      const response = handle(JSON.parse(body));
      if (response) output.write(encode(response));
    } catch {
      output.write(encode({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
    }
  }
}

function listen(input, output) {
  let buffer = Buffer.alloc(0);
  input.on('data', (chunk) => {
    buffer = consume(Buffer.concat([buffer, chunk]), output);
  });
}

function selfTest() {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  let raw = Buffer.alloc(0);
  child.stdout.on('data', (chunk) => {
    raw = Buffer.concat([raw, chunk]);
  });
  // 두 청크로 쪼개도 한 메시지가 되고, 문자열 내부 개행은 JSON escape로 보존된다.
  const init = encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } });
  child.stdin.write(init.slice(0, 20));
  child.stdin.write(init.slice(20));
  child.stdin.write(encode({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  child.stdin.write(encode({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
  child.stdin.write(
    encode({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_study_routes' } }),
  );
  child.stdin.write('invalid-json\n');
  child.stdin.write(encode({ jsonrpc: '2.0', id: 4, method: 'ping' }));
  child.stdin.end();
  child.on('close', () => {
    const text = raw.toString('utf8');
    const messages = text.trim().split('\n').map((line) => JSON.parse(line));
    const ok = messages.length === 5 && messages[0].result?.protocolVersion === '2025-11-25'
      && messages[1].result?.tools?.[0]?.name === 'list_study_routes'
      && messages[2].result?.content?.[0]?.text?.includes('/lab')
      && messages[3].error?.code === -32700 && messages[4].id === 4;
    if (!ok) {
      console.error(text);
      process.exit(1);
    }
    console.log('board-mcp self-test ok');
  });
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  listen(process.stdin, process.stdout);
  process.stdin.on('end', () => process.exit(0));
}
