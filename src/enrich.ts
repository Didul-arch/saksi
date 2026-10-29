import * as path from 'node:path';
import * as vscode from 'vscode';
import { touches } from './core/git';
import { inside, toPosix } from './core/policy';
import { hash } from './core/text';
import type { DiagnosticInfo, Snapshot } from './core/types';

const SYMBOL_LIMIT = 10;
const TIME_LIMIT_MS = 6500;

async function limited<T>(promise: Thenable<T>, ms = 1200): Promise<T | undefined> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([Promise.resolve(promise), new Promise<undefined>(resolve => { timer = setTimeout(() => resolve(undefined), ms); })]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

type AnySymbol = vscode.DocumentSymbol | vscode.SymbolInformation;
const flatten = (items: AnySymbol[] | undefined): AnySymbol[] =>
  (items ?? []).flatMap(item => [item, ...('children' in item ? flatten(item.children) : [])]);

const SEVERITY: Record<number, DiagnosticInfo['severity']> = {
  [vscode.DiagnosticSeverity.Error]: 'error',
  [vscode.DiagnosticSeverity.Warning]: 'warning',
};

/**
 * Reuses the user's installed language provider (e.g. gopls) for references and diagnostics.
 * Results can be incomplete; that is recorded as a coverage note, never hidden (UR-14, UR-15).
 */
export async function enrich(snapshot: Snapshot, signal: AbortSignal): Promise<string[]> {
  const candidates: string[] = [];
  const deadline = Date.now() + TIME_LIMIT_MS;
  let symbols = 0;
  for (const file of snapshot.files.filter(f => f.changed)) {
    if (signal.aborted || Date.now() >= deadline) break;
    const uri = vscode.Uri.file(path.join(snapshot.root, file.path));
    const found = await limited(vscode.commands.executeCommand<AnySymbol[]>('vscode.executeDocumentSymbolProvider', uri));
    for (const symbol of flatten(found)) {
      if (symbols >= SYMBOL_LIMIT || Date.now() >= deadline || signal.aborted) break;
      const whole = 'range' in symbol ? symbol.range : symbol.location.range;
      const name = 'selectionRange' in symbol ? symbol.selectionRange : whole;
      if (!touches(file.hunks, whole.start.line + 1, whole.end.line + 1)) continue;
      symbols++;
      const refs = await limited(vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', uri, name.start));
      for (const ref of refs ?? []) {
        if (ref.uri.scheme === 'file' && inside(snapshot.root, ref.uri.fsPath)) candidates.push(toPosix(path.relative(snapshot.root, ref.uri.fsPath)));
      }
    }
  }
  snapshot.notes.push(symbols
    ? 'Referensi dari language provider dipakai; hasilnya bisa tidak lengkap.'
    : 'Language provider tidak memberi simbol yang bisa dipakai; konteks lintas file hanya dari pencarian teks (Go) dan mungkin tidak lengkap.');
  if (Date.now() >= deadline) snapshot.notes.push('Batas waktu pencarian konteks language provider tercapai.');
  return candidates;
}

/** Diagnostics for files whose open editor content matches the snapshot, collected after related files are added. */
export function collectDiagnostics(snapshot: Snapshot): Omit<DiagnosticInfo, 'id'>[] {
  const out: Omit<DiagnosticInfo, 'id'>[] = [];
  for (const file of snapshot.files) {
    const uri = vscode.Uri.file(path.join(snapshot.root, file.path));
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
    if (doc && (doc.isDirty || hash(doc.getText()) !== file.hash)) continue;
    for (const d of vscode.languages.getDiagnostics(uri)) {
      if (d.source?.startsWith('Saksi')) continue;
      out.push({
        path: file.path, line: d.range.start.line + 1, endLine: d.range.end.line + 1,
        severity: SEVERITY[d.severity] ?? 'info', source: (d.source ?? 'language provider').slice(0, 100), message: d.message.slice(0, 1200),
      });
    }
  }
  return out;
}
