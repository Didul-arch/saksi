// Markers near code, Problems entries and quick actions (diagram 13).

import * as path from 'node:path';
import * as vscode from 'vscode';
import { CERTAINTY_LABEL, CERTAINTY_SYMBOL, IMPACT_LABEL } from './core/labels';
import { lines } from './core/text';
import type { Anchor, Certainty, Finding, Snapshot } from './core/types';

export const DIAGNOSTIC_SOURCE = 'Saksi';

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
  private findings: Finding[] = [];
  private snapshot?: Snapshot;
  private hints = true;

  uri(file: string): vscode.Uri {
    return vscode.Uri.file(path.join(this.snapshot?.root ?? '', file));
  }

  range(anchor: Anchor): vscode.Range {
    const content = this.snapshot?.files.find(f => f.path === anchor.path)?.content ?? '';
    const end = lines(content)[anchor.endLine - 1]?.length ?? 1;
    return new vscode.Range(anchor.startLine - 1, 0, anchor.endLine - 1, end);
  }

  /** Shows only findings that are still valid for the current code (UR-33). */
  render(findings: Finding[], snapshot: Snapshot | undefined, hints: boolean): void {
    this.snapshot = snapshot;
    this.findings = snapshot ? findings.filter(f => !f.stale) : [];
    this.hints = hints;
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

  dispose(): void {
    this.diagnostics.dispose();
    this.decoration.dispose();
  }
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
  md.appendText('Buka panel Saksi untuk bukti, pertanyaan, dan tanggapan.');
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
          action('Lihat detail & bukti', 'saksi.showFinding'),
          action('Tanya tentang temuan ini', 'saksi.askFinding'),
          action('Tandai disengaja', 'saksi.markFinding', 'intentional'),
          action('Tandai keliru', 'saksi.markFinding', 'wrong'),
        ];
      });
    },
  };
}
