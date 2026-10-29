import { randomBytes } from 'node:crypto';
import * as vscode from 'vscode';
import type { Controller, View } from './controller';
import type { ViewState } from './viewState';

type Message = Record<string, unknown> & { type: string };
const str = (value: unknown): string => (typeof value === 'string' ? value : '');

export class Companion implements vscode.WebviewViewProvider, View {
  static readonly id = 'saksi.companion';
  private view?: vscode.WebviewView;
  private state?: ViewState;

  constructor(private readonly extensionUri: vscode.Uri, private readonly controller: Controller) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    const asset = (name: string) => view.webview.asWebviewUri(vscode.Uri.joinPath(media, name));
    const nonce = randomBytes(18).toString('base64');
    view.webview.html = `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${view.webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${asset('main.css')}">
<title>Saksi</title>
</head>
<body>
<header>
  <svg id="pet" class="pet" aria-hidden="true" width="36" height="36" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" d="M4 8V3l5 3h6l5-3v5c1 2 1 5 0 8-1 3-4 5-8 5s-7-2-8-5c-1-3-1-6 0-8Z"/><circle cx="8" cy="11" r="2" fill="currentColor"/><circle cx="16" cy="11" r="2" fill="currentColor"/><path fill="currentColor" d="m10 15 2 3 2-3z"/></svg>
  <div>
    <div class="brand">saksi</div>
    <button id="configure" class="link" type="button" title="Atur layanan & model"></button>
  </div>
</header>
<section class="status" aria-live="polite">
  <p id="phase" class="phase"></p>
  <p id="note" class="note"></p>
</section>
<form id="form">
  <label for="intent">Tujuan perubahan <span class="muted">opsional · berlaku untuk tombol & shortcut</span></label>
  <textarea id="intent" rows="2" maxlength="2000" placeholder="Contoh: fungsi ini akan dipakai oleh package billing."></textarea>
  <div class="row">
    <label class="inline">Cakupan
      <select id="scope">
        <option value="saved-since-commit">Perubahan tersimpan sejak commit terakhir</option>
        <option value="staged">Perubahan yang akan di-commit</option>
        <option value="files">File aktif</option>
        <option value="selection">Bagian kode terpilih</option>
      </select>
    </label>
    <label class="inline">Kedalaman
      <select id="depth">
        <option value="quick">Cepat · tanpa pemeriksaan ulang</option>
        <option value="standard">Standar · 1 putaran pemeriksaan ulang</option>
        <option value="deep">Mendalam · sampai 3 putaran</option>
      </select>
    </label>
  </div>
  <div class="row">
    <button id="run" class="primary" type="submit">Review</button>
    <button id="cancel" type="button" hidden>Hentikan</button>
    <button id="shortcut" class="link" type="button">Atur shortcut</button>
  </div>
</form>
<section id="results" aria-label="Temuan review"></section>
<details id="dropped" hidden><summary></summary><ul id="droppedList"></ul></details>
<details id="coverage" hidden><summary>Cakupan review</summary><div id="coverageBody"></div></details>
<details><summary>Apa yang bisa diperiksa Saksi?</summary><p id="support" class="muted"></p></details>
<footer>
  <p id="usage" class="muted"></p>
  <p class="muted">Kutipan dicek terhadap kode yang direview. Kesimpulan AI tetap perlu kamu nilai; Saksi tidak mengubah kodemu.</p>
  <div class="row">
    <button id="copy" class="link" type="button">Salin ringkasan</button>
    <button id="clear" class="link" type="button">Bersihkan hasil</button>
  </div>
</footer>
<script nonce="${nonce}" src="${asset('main.js')}"></script>
</body>
</html>`;
    view.webview.onDidReceiveMessage((message: unknown) => {
      if (typeof message === 'object' && message !== null && typeof (message as Message).type === 'string') {
        void this.handle(message as Message).catch(() => undefined);
      }
    });
  }

  private async handle(m: Message): Promise<void> {
    const c = this.controller;
    switch (m.type) {
      case 'ready': if (this.state) void this.view?.webview.postMessage(this.state); return;
      case 'review': await c.setIntent(str(m.intent)); await c.setOptions(m.scopeKind, m.depth); await c.review(); return;
      case 'intent': await c.setIntent(str(m.intent)); return;
      case 'options': await c.setOptions(m.scopeKind, m.depth); return;
      case 'cancel': c.cancel(); return;
      case 'clear': c.clear(); return;
      case 'configure': await vscode.commands.executeCommand('saksi.configure'); return;
      case 'shortcut': await vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'saksi.review'); return;
      case 'copy': await c.copySummary(); return;
      case 'open': await c.open(str(m.id), typeof m.index === 'number' ? m.index : -1); return;
      case 'feedback': {
        const kind = str(m.kind);
        await c.setFeedback(str(m.id), ['relevant', 'wrong', 'intentional', 'deferred'].includes(kind) ? kind as never : null, str(m.reason), m.remember === true);
        return;
      }
      case 'ask': await c.ask(str(m.id), str(m.text), m.mode === 'clarification' ? 'clarification' : 'question'); return;
    }
  }

  update(state: ViewState): void {
    this.state = state;
    void this.view?.webview.postMessage(state);
  }

  async show(): Promise<void> {
    await vscode.commands.executeCommand(`${Companion.id}.focus`);
  }
}
