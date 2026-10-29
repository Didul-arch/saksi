// Send confirmation and context preview, following requirements/diagrams/11-data-flow-privacy.md (gates 4 and 5).

import * as vscode from 'vscode';
import type { SendDecision, SendPreview } from './core/review';
import { describeScope } from './core/scope';
import { hash } from './core/text';

export class PreviewProvider implements vscode.TextDocumentContentProvider {
  static readonly scheme = 'saksi-preview';
  private readonly uri = vscode.Uri.parse(`${PreviewProvider.scheme}:/konteks-review.md`);
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  private content = '';
  readonly onDidChange = this.emitter.event;

  provideTextDocumentContent(): string {
    return this.content;
  }

  async show(content: string): Promise<void> {
    this.content = content;
    this.emitter.fire(this.uri);
    const doc = await vscode.workspace.openTextDocument(this.uri);
    await vscode.window.showTextDocument(doc, { preview: true, preserveFocus: false });
  }

  dispose(): void {
    this.emitter.dispose();
  }
}

export interface SendTarget {
  endpoint: string;
  host: string;
  model: string;
  intent: string;
  rules: string[];
  excludes: string[];
  confirm: 'always' | 'whenChanged';
}

export function previewText(preview: SendPreview, target: SendTarget): string {
  const { snapshot, sensitive } = preview;
  const out = [
    '# Konteks yang akan dikirim Saksi',
    '',
    `- Layanan: ${target.host}`,
    `- Model: ${target.model}`,
    `- Cakupan: ${describeScope(snapshot.scope)}`,
    `- Tujuan perubahan: ${target.intent ? JSON.stringify(target.intent) : '(kosong)'}`,
    `- Aturan proyek: ${target.rules.length}`,
    `- Pengecualian: ${target.excludes.length ? target.excludes.join(', ') : '(tidak ada)'}`,
    `- Perkiraan ukuran: ${snapshot.used.toLocaleString('id-ID')} karakter source + patch`,
    '',
    '## File yang dikirim',
    ...snapshot.files.map(f => `- ${f.path} — ${roleLabel(f.role)}${f.oldPath ? ` (dari ${f.oldPath})` : ''}, ${f.content.length.toLocaleString('id-ID')} karakter`),
    ...snapshot.deleted.map(d => `- ${d.path} — dihapus (baris yang dihapus ikut dikirim)`),
    '',
    '## File yang dilewati',
    ...(snapshot.skipped.length ? snapshot.skipped.map(s => `- ${s.path} — ${s.reason}`) : ['- (tidak ada)']),
  ];
  if (target.rules.length) out.push('', '## Aturan proyek', ...target.rules.map(rule => `- ${rule}`));
  if (snapshot.diagnostics.length) out.push('', `## Diagnostics editor (${snapshot.diagnostics.length})`, 'Pesan error/peringatan dari language provider untuk file di atas ikut dikirim.');
  if (sensitive.length) {
    out.push('', '## Kemungkinan informasi sensitif', ...sensitive.map(h => `- ${h.path}${h.line ? `:${h.line}` : ''} — ${h.kind}`),
      '', 'Deteksi ini heuristik dan tidak menjamin semua rahasia ditemukan.');
  }
  if (snapshot.notes.length) out.push('', '## Catatan cakupan', ...snapshot.notes.map(n => `- ${n}`));
  out.push('', 'API key dikirim hanya sebagai header akses, tidak sebagai bagian dari konteks.');
  return out.join('\n');
}

function roleLabel(role: string): string {
  return ({ added: 'file baru', modified: 'berubah', renamed: 'di-rename', selected: 'dipilih', context: 'konteks terkait' } as Record<string, string>)[role] ?? role;
}

function consentKey(preview: SendPreview, target: SendTarget): string {
  return hash(JSON.stringify([target.endpoint, target.model, preview.snapshot.root, preview.snapshot.scope.kind, target.excludes, target.rules]));
}

/**
 * Asks before sending when the destination, scope kind, exclusions or rules changed, when sensitive
 * data was spotted, or always if the user prefers. Otherwise the earlier decision stands (UR-39).
 */
export async function confirmSend(preview: SendPreview, target: SendTarget, state: vscode.Memento, previewer: PreviewProvider): Promise<SendDecision> {
  const key = consentKey(preview, target);
  if (!preview.sensitive.length && target.confirm === 'whenChanged' && state.get('saksi.consent') === key) return 'send';

  const { snapshot, sensitive } = preview;
  const changed = snapshot.files.filter(f => f.changed).length;
  const context = snapshot.files.length - changed;
  for (;;) {
    let choice: string | undefined;
    if (sensitive.length) {
      const listed = sensitive.slice(0, 6).map(h => `• ${h.path}${h.line ? `:${h.line}` : ''} — ${h.kind}`).join('\n');
      choice = await vscode.window.showWarningMessage('Kemungkinan informasi sensitif ada di konteks yang akan dikirim.', {
        modal: true,
        detail: `${listed}${sensitive.length > 6 ? `\n…dan ${sensitive.length - 6} lainnya` : ''}\n\nTujuan: ${target.host}. Deteksi ini tidak menjamin semua rahasia ditemukan.`,
      }, 'Kecualikan file tersebut & kirim', 'Kirim apa adanya', 'Lihat isi konteks');
    } else {
      choice = await vscode.window.showInformationMessage(`Kirim konteks review ke ${target.host}?`, {
        modal: true,
        detail: [
          `Model: ${target.model}`,
          `Cakupan: ${describeScope(snapshot.scope)}`,
          `Dikirim: ${changed} file berubah, ${context} file konteks${snapshot.deleted.length ? `, ${snapshot.deleted.length} file dihapus` : ''}.`,
          `Dilewati: ${snapshot.skipped.length} file.`,
          target.confirm === 'whenChanged' ? 'Pilihan ini diingat sampai layanan, model, jenis cakupan, aturan, atau pengecualian berubah.' : '',
        ].filter(Boolean).join('\n'),
      }, 'Kirim', 'Lihat isi konteks');
    }
    if (choice === 'Lihat isi konteks') {
      await previewer.show(previewText(preview, target));
      continue;
    }
    if (choice === 'Kecualikan file tersebut & kirim') return 'exclude-sensitive';
    if (choice === 'Kirim' || choice === 'Kirim apa adanya') {
      if (!sensitive.length) await state.update('saksi.consent', key);
      return 'send';
    }
    return 'cancel';
  }
}
