// Markers near code, inline threads, Problems entries and quick actions
// (diagram 13, requirements/features/inline-review-ui.md).

import * as path from 'node:path';
import * as vscode from 'vscode';
import { FEEDBACK_LABEL } from './core/feedback';
import { CERTAINTY_LABEL, CERTAINTY_SYMBOL, IMPACT_LABEL } from './core/labels';
import { lines } from './core/text';
import type { Anchor, Certainty, Finding, Snapshot } from './core/types';
import type { ChatEntry } from './viewState';

export const DIAGNOSTIC_SOURCE = 'Saksi';
export const THREAD_CONTEXT = 'saksi-finding';

export interface RenderInput {
  findings: Finding[];
  snapshot?: Snapshot;
  hints: boolean;
  chats: ReadonlyMap<string, ChatEntry[]>;
  pending: ReadonlySet<string>;
  /** Thread to open once, when the user picks a finding (D1). */
  reveal?: string;
}

const SEVERITY: Record<Certainty, vscode.DiagnosticSeverity> = {
  confirmed: vscode.DiagnosticSeverity.Warning,
  suspected: vscode.DiagnosticSeverity.Warning,
  question: vscode.DiagnosticSeverity.Information,
  optional: vscode.DiagnosticSeverity.Hint,
};

export class EditorUi implements vscode.Disposable {
  private readonly diagnostics = vscode.languages.createDiagnosticCollection('saksi');
  private readonly decoration = vscode.window.createTextEditorDecorationType({
    after: { margin: '0 0 0 2.5em', fontStyle: 'italic', color: new vscode.ThemeColor('editorCodeLens.foreground') },
  });
  private readonly comments = vscode.comments.createCommentController('saksi', 'Saksi');
  private readonly threads = new Map<string, vscode.CommentThread>();
  private findings: Finding[] = [];
  private snapshot?: Snapshot;
  private hints = true;

  constructor(private readonly icon: vscode.Uri) {
    this.comments.options = { prompt: 'Tanya Saksi tentang temuan ini…', placeHolder: 'Kenapa ini masalah? Atau jelaskan kalau ini disengaja.' };
  }

  /** The finding id behind an inline thread. */
  idOf(thread: vscode.CommentThread): string | undefined {
    for (const [id, t] of this.threads) if (t === thread) return id;
    return undefined;
  }

  uri(file: string): vscode.Uri {
    return vscode.Uri.file(path.join(this.snapshot?.root ?? '', file));
  }

  range(anchor: Anchor): vscode.Range {
    const content = this.snapshot?.files.find(f => f.path === anchor.path)?.content ?? '';
    const end = lines(content)[anchor.endLine - 1]?.length ?? 1;
    return new vscode.Range(anchor.startLine - 1, 0, anchor.endLine - 1, end);
  }

  /** Shows only findings that are still valid for the current code (UR-33). */
  render({ findings, snapshot, hints, chats, pending, reveal }: RenderInput): void {
    this.snapshot = snapshot;
    this.findings = snapshot ? findings.filter(f => !f.stale) : [];
    this.hints = hints;
    this.renderThreads(chats, pending, reveal);
    this.diagnostics.clear();
    const byFile = new Map<string, vscode.Diagnostic[]>();
    for (const f of this.findings) {
      const d = new vscode.Diagnostic(this.range(f.location), `${CERTAINTY_LABEL[f.certainty]} · ${IMPACT_LABEL[f.impact]}: ${f.title}\n${f.observation}`, SEVERITY[f.certainty]);
      d.source = DIAGNOSTIC_SOURCE;
      d.code = f.id;
      d.relatedInformation = f.evidence.map(e => new vscode.DiagnosticRelatedInformation(new vscode.Location(this.uri(e.path), this.range(e)), e.reason || 'rujukan'));
      byFile.set(f.location.path, [...(byFile.get(f.location.path) ?? []), d]);
    }
    for (const [file, entries] of byFile) this.diagnostics.set(this.uri(file), entries);
    this.decorate();
  }

  decorate(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      const own = this.hints ? this.findings.filter(f => this.uri(f.location.path).toString() === editor.document.uri.toString()) : [];
      editor.setDecorations(this.decoration, own.map(f => ({
        range: this.range(f.location),
        hoverMessage: hover(f),
        renderOptions: { after: { contentText: `${CERTAINTY_SYMBOL[f.certainty]} ${CERTAINTY_LABEL[f.certainty]}: ${f.title.slice(0, 80)}` } },
      })));
    }
  }

  /** One inline thread per live finding, updated in place so open threads and drafts survive (UR-57). */
  private renderThreads(chats: ReadonlyMap<string, ChatEntry[]>, pending: ReadonlySet<string>, reveal?: string): void {
    const live = new Set(this.findings.map(f => f.id));
    for (const [id, thread] of this.threads) {
      if (!live.has(id) || thread.uri.toString() !== this.uri(this.findings.find(f => f.id === id)?.location.path ?? '').toString()) {
        thread.dispose();
        this.threads.delete(id);
      }
    }
    for (const f of this.findings) {
      let thread = this.threads.get(f.id);
      if (!thread) {
        thread = this.comments.createCommentThread(this.uri(f.location.path), this.range(f.location), []);
        thread.collapsibleState = vscode.CommentThreadCollapsibleState.Collapsed;
        this.threads.set(f.id, thread);
      }
      thread.range = this.range(f.location);
      thread.label = `Saksi · ${CERTAINTY_LABEL[f.certainty]}`;
      thread.contextValue = THREAD_CONTEXT;
      thread.canReply = !pending.has(f.id);
      thread.comments = [this.findingComment(f), ...(chats.get(f.id) ?? []).map(entry => this.chatComment(entry)),
        ...(pending.has(f.id) ? [this.comment(textMd('Sedang menjawab…'))] : [])];
      if (reveal === f.id) thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    }
  }

  private comment(body: vscode.MarkdownString, user = false): vscode.Comment {
    return { body, mode: vscode.CommentMode.Preview, author: user ? { name: 'Kamu' } : { name: 'Saksi', iconPath: this.icon } };
  }

  private chatComment(entry: ChatEntry): vscode.Comment {
    const md = new vscode.MarkdownString();
    if (entry.role === 'user' && entry.mode === 'clarification') md.appendMarkdown('*Klarifikasi:* ');
    md.appendText(entry.text);
    return this.comment(md, entry.role === 'user');
  }

  /** Model text goes through appendText only; the only active links are Saksi's own evidence links (D4, UA-35). */
  private findingComment(f: Finding): vscode.Comment {
    const md = new vscode.MarkdownString();
    md.isTrusted = { enabledCommands: ['saksi.openEvidence'] };
    md.supportHtml = false;
    const tags = [CERTAINTY_LABEL[f.certainty], IMPACT_LABEL[f.impact]];
    if (f.unrefined) tags.push('belum diperiksa ulang');
    if (f.feedback) tags.push(`ditandai ${FEEDBACK_LABEL[f.feedback.kind].toLowerCase()}`);
    md.appendMarkdown('*'); md.appendText(tags.join(' · ')); md.appendMarkdown('*\n\n**'); md.appendText(f.title); md.appendMarkdown('**\n\n');
    const field = (label: string, text: string) => {
      if (!text) return;
      md.appendMarkdown(`**${label}:** `);
      md.appendText(text);
      md.appendMarkdown('\n\n');
    };
    field('Pengamatan', f.observation);
    field('Konsep', f.concept);
    field('Alasan & dampak', f.inference);
    if (f.confirmation) field('Dasar konfirmasi', `${f.confirmation.source} baris ${f.confirmation.line}: ${f.confirmation.message}`);
    field('Yang belum diketahui', f.missingContext);
    field('Saran', f.suggestion);
    field('Konsekuensi', f.consequences);
    md.appendMarkdown('**Bukti:** ');
    f.evidence.forEach((e, i) => {
      const args = encodeURIComponent(JSON.stringify([f.id, i]));
      md.appendMarkdown(`${i ? ' · ' : ''}[${`${e.path}:${e.startLine}`.replace(/[[\]()\\]/g, '')}](command:saksi.openEvidence?${args})`);
    });
    return this.comment(md);
  }

  dispose(): void {
    for (const thread of this.threads.values()) thread.dispose();
    this.comments.dispose();
    this.diagnostics.dispose();
    this.decoration.dispose();
  }
}

function textMd(text: string): vscode.MarkdownString {
  return new vscode.MarkdownString().appendText(text);
}

function hover(f: Finding): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.isTrusted = false;
  md.supportHtml = false;
  md.appendText(`${CERTAINTY_LABEL[f.certainty]} · ${IMPACT_LABEL[f.impact]}${f.unrefined ? ' · belum diperiksa ulang' : ''}\n${f.title}\n\n`);
  md.appendText(`Pengamatan: ${f.observation}\n\n`);
  if (f.concept) md.appendText(`Konsep: ${f.concept}\n\n`);
  if (f.inference) md.appendText(`Alasan & dampak: ${f.inference}\n\n`);
  if (f.missingContext) md.appendText(`Yang belum diketahui: ${f.missingContext}\n\n`);
  md.appendText('Buka thread Saksi di baris ini untuk bukti, pertanyaan, dan tanggapan.');
  return md;
}

export function codeActions(): vscode.CodeActionProvider {
  return {
    provideCodeActions(_document, _range, context) {
      return context.diagnostics.filter(d => d.source === DIAGNOSTIC_SOURCE).flatMap(d => {
        const id = String(typeof d.code === 'object' ? d.code.value : d.code);
        const action = (title: string, command: string, ...args: unknown[]) => {
          const a = new vscode.CodeAction(`Saksi: ${title}`, vscode.CodeActionKind.QuickFix);
          a.command = { command, title, arguments: [id, ...args] };
          a.diagnostics = [d];
          return a;
        };
        return [
          action('Lihat detail, bukti & tanya', 'saksi.showFinding'),
          action('Tandai disengaja', 'saksi.markFinding', 'intentional'),
          action('Tandai keliru', 'saksi.markFinding', 'wrong'),
        ];
      });
    },
  };
}
