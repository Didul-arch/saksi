// End-to-end wiring of activate() against a mocked 'vscode' module (see vitest.config.mts)
// and a fake chat-completions server.

import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../src/extension';
import type { ViewState } from '../../src/viewState';
import { mock, Uri } from '../mock/vscode';
import { GO_CALLER, GO_FILE, rawFinding, tempRepo, write } from './helpers';

type Handler = (body: { messages: { role: string; content: string }[] }) => unknown;

let server: http.Server;
let replies: Handler[];
let requests = 0;

beforeEach(async () => {
  mock.reset();
  replies = [];
  requests = 0;
  server = http.createServer((req, res) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      requests++;
      const next = replies.shift();
      const content = next ? JSON.stringify(next(JSON.parse(data))) : '{"findings":[]}';
      res.end(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 100, completion_tokens: 20 } }));
    });
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  mock.settings['saksi.endpoint'] = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/chat/completions`;
  mock.settings['saksi.model'] = 'test-model';
});

afterEach(() => new Promise<void>(resolve => server.close(() => resolve())));

function start(root: string) {
  mock.workspaceFolders = [{ uri: Uri.file(root), name: 'repo', index: 0 }];
  const state = new Map<string, unknown>();
  const secrets = new Map<string, string>();
  const context = {
    subscriptions: [] as unknown[],
    extensionUri: Uri.file('/ext'),
    workspaceState: { get: (k: string, d?: unknown) => state.get(k) ?? d, update: async (k: string, v: unknown) => { state.set(k, v); }, keys: () => [...state.keys()] },
    secrets: { get: async (k: string) => secrets.get(k), store: async (k: string, v: string) => { secrets.set(k, v); }, delete: async (k: string) => { secrets.delete(k); } },
  };
  activate(context as unknown as vscode.ExtensionContext);
  const posted: ViewState[] = [];
  let receive: (m: unknown) => Promise<void> | void = () => undefined;
  const webview = {
    options: {}, html: '', cspSource: 'csp',
    asWebviewUri: (u: Uri) => u,
    postMessage: async (m: ViewState) => { posted.push(m); return true; },
    onDidReceiveMessage: (fn: typeof receive) => { receive = fn; return { dispose: () => undefined }; },
  };
  mock.webviewProviders.get('saksi.companion')!.resolveWebviewView({ webview });
  return {
    last: () => posted[posted.length - 1]!,
    send: async (m: unknown) => { await receive(m); await settle(); },
  };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 50));

function repoWithChange() {
  const root = tempRepo({ 'payment.go': GO_FILE.replace('func setPaymentNumber', 'func old'), 'caller.go': GO_CALLER });
  write(root, { 'payment.go': GO_FILE });
  return root;
}

describe('extension (mocked VS Code)', () => {
  it('runs a review from the command, asks before sending once, and shows findings everywhere', async () => {
    const root = repoWithChange();
    const ui = start(root);
    replies.push(
      () => ({ findings: [rawFinding()] }),
      body => ({ verdicts: [{ id: JSON.parse(body.messages[1]!.content).candidates[0].id, outcome: 'keep', reason: 'didukung deklarasi' }] }),
    );
    mock.answers.push({ match: 'Kirim konteks review', answer: 'Kirim' });

    await vscode.commands.executeCommand('saksi.review');
    const state = ui.last();
    expect(state.phase).toBe('done-findings');
    expect(state.findings).toHaveLength(1);
    expect(state.findings[0]).toMatchObject({ certaintyLabel: 'Dugaan masalah', impactLabel: 'Dampak besar', flags: [], location: 'payment.go:3' });
    expect(state.coverage).toMatchObject({ changed: 1, related: 1 });
    expect(state.usage).toMatch(/2 permintaan · 240 token/);
    const diagnostics = mock.diagnostics.get(path.join(root, 'payment.go'));
    expect(diagnostics?.[0]?.message).toMatch(/^Dugaan masalah · Dampak besar: Fungsi perlu diekspor\?/);

    // Same destination and scope: no second prompt (UR-39).
    mock.prompts = [];
    replies.push(() => ({ findings: [] }));
    await vscode.commands.executeCommand('saksi.review');
    expect(mock.prompts).toEqual([]);
    expect(ui.last().phase).toBe('done-clean');
    expect(ui.last().note).toMatch(/bukan jaminan/);
  });

  it('sends nothing when the user declines the send prompt (UR-36)', async () => {
    const ui = start(repoWithChange());
    await vscode.commands.executeCommand('saksi.review');
    expect(requests).toBe(0);
    expect(ui.last().phase).toBe('cancelled');
  });

  it('reassesses a finding after a clarification and withdraws it (UA-12)', async () => {
    const root = repoWithChange();
    const ui = start(root);
    mock.answers.push({ match: 'Kirim konteks review', answer: 'Kirim' });
    mock.settings['saksi.reviewDepth'] = 'quick';
    replies.push(() => ({ findings: [rawFinding()] }));
    await vscode.commands.executeCommand('saksi.review');
    const id = ui.last().findings[0]!.id;
    expect(ui.last().findings[0]!.flags).toContain('belum diperiksa ulang');

    replies.push(body => {
      expect(JSON.parse(body.messages[body.messages.length - 1]!.content)).toEqual({ mode: 'clarification', message: 'Sengaja internal.' });
      return { answer: 'Kalau memang internal, lowercase sudah tepat.', verdict: { outcome: 'drop', reason: 'Fungsi sengaja internal.' } };
    });
    await ui.send({ type: 'ask', id, text: 'Sengaja internal.', mode: 'clarification' });
    const state = ui.last();
    expect(state.findings).toEqual([]);
    expect(state.dropped).toEqual([{ title: 'Fungsi perlu diekspor?', reason: 'Setelah klarifikasimu: Fungsi sengaja internal.' }]);
    expect(mock.diagnostics.size).toBe(0);
  });

  it('marks findings stale when their code changes, and records feedback (UR-33, UR-41)', async () => {
    const root = repoWithChange();
    const ui = start(root);
    mock.answers.push({ match: 'Kirim konteks review', answer: 'Kirim' });
    mock.settings['saksi.reviewDepth'] = 'quick';
    replies.push(() => ({ findings: [rawFinding()] }));
    await vscode.commands.executeCommand('saksi.review');
    const id = ui.last().findings[0]!.id;

    await ui.send({ type: 'feedback', id, kind: 'intentional', reason: 'internal', remember: true });
    expect(ui.last().findings[0]).toMatchObject({ group: 'answered', feedback: { label: 'Disengaja', remembered: true } });

    await ui.send({ type: 'open', id, index: 0 });
    expect(mock.shown).toEqual([path.join(root, 'payment.go')]);

    write(root, { 'payment.go': GO_FILE + '// edit\n' });
    mock.watchers[0]!.change.fire(Uri.file(path.join(root, 'payment.go')));
    await settle();
    expect(ui.last().phase).toBe('stale');
    expect(ui.last().findings[0]!.group).toBe('stale');
    expect(mock.diagnostics.size).toBe(0);
  });

  it('copies a summary without sending it anywhere (UR-45)', async () => {
    const ui = start(repoWithChange());
    mock.answers.push({ match: 'Kirim konteks review', answer: 'Kirim' });
    mock.settings['saksi.reviewDepth'] = 'quick';
    replies.push(() => ({ findings: [rawFinding()] }));
    await vscode.commands.executeCommand('saksi.review');
    const before = requests;
    await ui.send({ type: 'copy' });
    expect(mock.clipboard).toContain('Fungsi perlu diekspor?');
    expect(requests).toBe(before);
  });

  it('shows each finding as an inline thread and chats inside it (UR-57, UA-32, UA-33, UA-34)', async () => {
    const root = repoWithChange();
    const ui = start(root);
    mock.answers.push({ match: 'Kirim konteks review', answer: 'Kirim' });
    mock.settings['saksi.reviewDepth'] = 'quick';
    replies.push(() => ({ findings: [rawFinding({ concept: 'Huruf kecil = unexported.', inference: 'Lihat [klik](command:workbench.action.terminal.new).' })] }));
    await vscode.commands.executeCommand('saksi.review');
    const live = () => mock.threads.filter(t => !t.disposed);
    expect(live()).toHaveLength(1);
    const thread = live()[0]!;
    expect(thread.uri.fsPath).toBe(path.join(root, 'payment.go'));
    expect(thread.range.start.line).toBe(2);
    expect(thread.label).toBe('Saksi · Dugaan masalah');
    const body = thread.comments[0]!.body;
    expect(body.value).toContain('**Konsep:** Huruf kecil = unexported\\.');
    expect(body.value).toContain('command:saksi.openEvidence?');
    expect(body.value).not.toContain('](command:workbench');
    expect(body.isTrusted).toEqual({ enabledCommands: ['saksi.openEvidence'] });

    // Quick fix "Lihat detail" expands the thread.
    await vscode.commands.executeCommand('saksi.showFinding', ui.last().findings[0]!.id);
    expect(thread.collapsibleState).toBe(1);

    // Inline reply goes to the same finding and appears in the same thread.
    replies.push(() => ({ answer: 'Karena package lain tidak bisa memanggilnya.' }));
    await vscode.commands.executeCommand('saksi.inlineAsk', { thread, text: 'Kenapa?' });
    expect(thread.comments.map(c => c.author.name)).toEqual(['Saksi', 'Kamu', 'Saksi']);
    expect(thread.comments[2]!.body.value).toContain('Karena package lain tidak bisa memanggilnya');

    // Editing the code removes the inline thread.
    write(root, { 'payment.go': GO_FILE + '// edit\n' });
    mock.watchers[0]!.change.fire(Uri.file(path.join(root, 'payment.go')));
    await settle();
    expect(live()).toHaveLength(0);
  });

  it('lists models with the key just entered during first-time setup', async () => {
    let auth = '';
    const models = http.createServer((req, res) => {
      auth = req.headers.authorization ?? '';
      if (auth !== 'Bearer sk-test') { res.statusCode = 401; res.end('{}'); return; }
      res.end(JSON.stringify({ data: [{ id: 'deepseek-chat' }] }));
    });
    await new Promise<void>(resolve => models.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${(models.address() as AddressInfo).port}/v1/chat/completions`;
    try {
      start(repoWithChange());
      delete mock.settings['saksi.endpoint'];
      delete mock.settings['saksi.model'];
      mock.inputs.push(url, 'sk-test');
      mock.picks.push('Pilih dari daftar model layanan', 'deepseek-chat');
      await vscode.commands.executeCommand('saksi.configure');
      expect(auth).toBe('Bearer sk-test');
      expect(mock.settings['saksi.model']).toBe('deepseek-chat');
      expect(mock.settings['saksi.endpoint']).toBe(url);
    } finally {
      await new Promise<void>(resolve => models.close(() => resolve()));
    }
  });
});
