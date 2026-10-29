import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { chat, endpoint, listModels, modelsUrl, parseJsonContent } from '../../src/core/provider';

let server: http.Server | undefined;
afterEach(() => new Promise<void>(resolve => (server ? server.close(() => resolve()) : resolve())));

function serve(handler: http.RequestListener): Promise<string> {
  server = http.createServer(handler);
  return new Promise(resolve => server!.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${(server!.address() as AddressInfo).port}/v1/chat/completions`)));
}

describe('endpoint', () => {
  it('requires HTTPS except on localhost, and no credentials in the URL', () => {
    expect(endpoint('http://localhost:1234/v1/chat/completions')).toBe('http://localhost:1234/v1/chat/completions');
    expect(() => endpoint('http://example.com/v1/chat/completions')).toThrow(/HTTPS/);
    expect(() => endpoint('https://user:pw@example.com/x')).toThrow(/credential/);
    expect(modelsUrl('https://api.example.com/v1/chat/completions')).toBe('https://api.example.com/v1/models');
  });
});

describe('chat', () => {
  it('sends the model, messages and key, and returns content with usage', async () => {
    let body: Record<string, unknown> = {};
    let auth = '';
    const url = await serve((req, res) => {
      let data = '';
      req.on('data', chunk => (data += chunk));
      req.on('end', () => {
        body = JSON.parse(data);
        auth = req.headers.authorization ?? '';
        res.end(JSON.stringify({ choices: [{ message: { content: '```json\n{"findings":[]}\n```' } }], usage: { prompt_tokens: 7, completion_tokens: 3 } }));
      });
    });
    const out = await chat({ endpoint: url, model: 'm', apiKey: 'secret', jsonMode: true }, [{ role: 'user', content: 'x' }]);
    expect(body).toMatchObject({ model: 'm', stream: false, response_format: { type: 'json_object' } });
    expect(auth).toBe('Bearer secret');
    expect(parseJsonContent(out.content)).toEqual({ findings: [] });
    expect(out.usage).toEqual({ promptTokens: 7, completionTokens: 3 });
  });

  it('explains HTTP failures with a next step (UR-35)', async () => {
    const url = await serve((_req, res) => { res.statusCode = 429; res.end('{}'); });
    await expect(chat({ endpoint: url, model: 'm' }, [])).rejects.toThrow(/Batas penggunaan/);
  });

  it('does not follow redirects', async () => {
    const url = await serve((_req, res) => { res.statusCode = 302; res.setHeader('Location', 'http://127.0.0.1:1/'); res.end(); });
    await expect(chat({ endpoint: url, model: 'm' }, [])).rejects.toThrow(/redirect|HTTP 302/);
  });

  it('times out and can be cancelled', async () => {
    const url = await serve(() => undefined);
    await expect(chat({ endpoint: url, model: 'm', timeoutSeconds: 0.2 }, [])).rejects.toThrow(/timeout/);
    const controller = new AbortController();
    const pending = chat({ endpoint: url, model: 'm' }, [], controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects truncated output', async () => {
    const url = await serve((_req, res) => res.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: '{' } }] })));
    await expect(chat({ endpoint: url, model: 'm' }, [])).rejects.toThrow(/terpotong/);
  });

  it('lists models from an OpenAI-compatible server', async () => {
    const url = await serve((req, res) => res.end(req.url === '/v1/models' ? JSON.stringify({ data: [{ id: 'a' }, { id: 'b' }] }) : '{}'));
    expect(await listModels({ endpoint: url, model: '' })).toEqual(['a', 'b']);
  });
});
