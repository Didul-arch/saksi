// Orchestrates reviews and follow-ups in the editor (diagrams 04, 05, 07, 08).

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { FEEDBACK_LABEL, forget, notesFor, remember, type RememberedFeedback } from './core/feedback';
import { git } from './core/git';
import { REVISION_LABEL } from './core/labels';
import { inside, reviewable, toPosix } from './core/policy';
import { chatMessages, type ChatTurn, type PromptContext } from './core/prompts';
import { chat, parseJsonContent } from './core/provider';
import { applyVerdict } from './core/refine';
import { addUsage, emptyUsage, runReview, type ReviewResult } from './core/review';
import type { ReviewScope } from './core/scope';
import { markStale } from './core/staleness';
import { enforceLimits } from './core/style';
import { isRunning, PHASE_LABEL, type Phase } from './core/status';
import { toMarkdown } from './core/summary';
import { clean, errorMessage, hash, isAbort } from './core/text';
import type { Depth, FeedbackKind, Finding, Revision } from './core/types';
import { EditorUi } from './editorUi';
import { collectDiagnostics, enrich } from './enrich';
import { confirmSend, type PreviewProvider } from './preview';
import { activeModelLabel, defaultDepth, hostOf, inlineHints, isConfigured, modelConfig, preferences, reviewSettings, type ScopeKind } from './settings';
import { configure } from './setup';
import { buildViewState, type ChatEntry, type ViewState } from './viewState';

export interface View {
  update(state: ViewState): void;
  show(): Promise<void>;
}

export class Controller implements vscode.Disposable {
  private phase: Phase = 'idle';
  private note = '';
  private result?: ReviewResult;
  private findings: Finding[] = [];
  private dropped: { finding: Finding; revision: Revision }[] = [];
  private readonly chats = new Map<string, ChatEntry[]>();
  private readonly pending = new Set<string>();
  private running?: AbortController;
  private selectedId?: string;
  private revealId?: string;
  private readonly usage = emptyUsage();
  private view?: View;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly editorUi: EditorUi,
    private readonly status: vscode.StatusBarItem,
    private readonly previewer: PreviewProvider,
  ) {}

  attach(view: View): void {
    this.view = view;
    this.publish();
  }

  // --- Preferences kept per workspace, shared by every way of starting a review (UR-08, UA-02).

  get intent(): string {
    return this.context.workspaceState.get<string>('saksi.intent', '');
  }

  async setIntent(value: string): Promise<void> {
    await this.context.workspaceState.update('saksi.intent', clean(value, 2000));
    this.publish();
  }

  get scopeKind(): ScopeKind {
    return this.context.workspaceState.get<ScopeKind>('saksi.scopeKind', 'saved-since-commit');
  }

  get depth(): Depth {
    return this.context.workspaceState.get<Depth>('saksi.depth') ?? defaultDepth();
  }

  async setOptions(scopeKind: unknown, depth: unknown): Promise<void> {
    if (['saved-since-commit', 'staged', 'files', 'selection'].includes(scopeKind as string)) await this.context.workspaceState.update('saksi.scopeKind', scopeKind);
    if (['quick', 'standard', 'deep'].includes(depth as string)) await this.context.workspaceState.update('saksi.depth', depth);
    this.publish();
  }

  // --- Review run.

  async review(override?: { scopeKind?: ScopeKind }): Promise<void> {
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage('Saksi hanya berjalan di workspace yang dipercaya.');
      return;
    }
    if (this.running) {
      await this.view?.show();
      return;
    }
    if (!isConfigured() && !(await configure(this.context.secrets))) return;

    const controller = new AbortController();
    this.running = controller;
    this.resetResult();
    this.setPhase('idle', '');
    try {
      await this.view?.show();
      const root = await chooseRoot(controller.signal);
      if (!root) return this.setPhase('idle', '');
      const scope = this.buildScope(override?.scopeKind ?? this.scopeKind, root);
      if (!scope) return this.setPhase('idle', '');
      const dirty = await this.handleDirty(root, scope);
      if (!dirty) return this.setPhase('cancelled', 'Review tidak dimulai. Kode dan tujuanmu tidak berubah.');

      const settings = reviewSettings(vscode.Uri.file(root));
      const config = await modelConfig(this.context.secrets);
      const prefs = preferences();
      const remembered = this.remembered(root);
      const result = await runReview({
        root,
        collect: { scope, dirty, excludes: settings.excludes, maxContextChars: settings.maxContextChars, maxChangedFiles: settings.maxChangedFiles, maxRelatedFiles: settings.maxRelatedFiles },
        ctx: { intent: this.intent, rules: settings.rules, remembered: [], preferences: prefs },
        depth: this.depth,
        remembered,
        ask: async (messages, signal) => {
          const reply = await chat(config, messages, signal);
          addUsage(this.usage, reply);
          return reply;
        },
        enrich,
        diagnostics: collectDiagnostics,
        confirmSend: preview => confirmSend(preview, {
          endpoint: config.endpoint, host: hostOf(config.endpoint), model: config.model, intent: this.intent,
          rules: settings.rules, excludes: settings.excludes, confirm: settings.confirmBeforeSend,
        }, this.context.workspaceState, this.previewer),
        onPhase: (phase, note) => this.setPhase(phase, note),
        signal: controller.signal,
      });
      this.result = result;
      this.findings = result.findings;
      this.dropped = result.dropped;
      this.phase = result.phase;
      this.note = result.note;
      await this.refreshStaleness();
    } catch (error) {
      this.setPhase(isAbort(error, controller.signal) ? 'cancelled' : 'failed', isAbort(error, controller.signal) ? 'Review dihentikan.' : `${errorMessage(error)} Ini bukan hasil review bersih.`);
    } finally {
      this.running = undefined;
      this.publish();
    }
  }

  cancel(): void {
    this.running?.abort();
  }

  clear(): void {
    this.running?.abort();
    this.resetResult();
    this.setPhase('idle', '');
  }

  private resetResult(): void {
    this.result = undefined;
    this.findings = [];
    this.dropped = [];
    this.chats.clear();
    this.selectedId = undefined;
  }

  private buildScope(kind: ScopeKind, root: string): ReviewScope | undefined {
    if (kind === 'saved-since-commit' || kind === 'staged') return { kind };
    const editor = vscode.window.activeTextEditor;
    const file = editor && editor.document.uri.scheme === 'file' && inside(root, editor.document.uri.fsPath)
      ? toPosix(path.relative(root, editor.document.uri.fsPath)) : undefined;
    if (!editor || !file) {
      void vscode.window.showInformationMessage('Buka file dalam repository ini untuk memakai cakupan file aktif atau bagian terpilih.');
      return undefined;
    }
    if (kind === 'files') return { kind, paths: [file] };
    if (editor.selection.isEmpty) {
      void vscode.window.showInformationMessage('Pilih bagian kode terlebih dulu, atau ganti cakupan review.');
      return undefined;
    }
    return { kind: 'selection', path: file, startLine: editor.selection.start.line + 1, endLine: editor.selection.end.line + (editor.selection.end.character === 0 && editor.selection.end.line > editor.selection.start.line ? 0 : 1) };
  }

  /** Never saves silently: the user chooses (UR-12). Returns the paths still unsaved, or undefined to stop. */
  private async handleDirty(root: string, scope: ReviewScope): Promise<Set<string> | undefined> {
    const inScope = (file: string) => scope.kind === 'files' ? scope.paths.includes(file) : scope.kind === 'selection' ? scope.path === file : reviewable(file);
    const docs = vscode.workspace.textDocuments.filter(d => d.isDirty && d.uri.scheme === 'file' && inside(root, d.uri.fsPath));
    const relevant = docs.filter(d => inScope(toPosix(path.relative(root, d.uri.fsPath))));
    if (!relevant.length) return new Set(docs.map(d => toPosix(path.relative(root, d.uri.fsPath))));
    this.setPhase('awaiting-dirty', `${relevant.length} file belum disimpan.`);
    const names = relevant.slice(0, 5).map(d => toPosix(path.relative(root, d.uri.fsPath)));
    const choice = await vscode.window.showWarningMessage(`${relevant.length} file dalam cakupan belum disimpan.`, {
      modal: true,
      detail: `${names.join('\n')}${relevant.length > 5 ? '\n…' : ''}\n\nIsi editor berbeda dengan yang akan diperiksa. Saksi tidak menyimpan file tanpa pilihanmu.`,
    }, 'Simpan lalu review', 'Review tanpa perubahan yang belum disimpan');
    if (!choice) return undefined;
    if (choice === 'Simpan lalu review') {
      for (const doc of relevant) {
        if (!(await doc.save())) return undefined;
      }
    }
    return new Set(vscode.workspace.textDocuments.filter(d => d.isDirty && d.uri.scheme === 'file' && inside(root, d.uri.fsPath)).map(d => toPosix(path.relative(root, d.uri.fsPath))));
  }

  // --- Staleness (UR-33, UR-34).

  private async currentHash(file: string): Promise<string | null> {
    const root = this.result?.snapshot?.root;
    if (!root) return null;
    const uri = vscode.Uri.file(path.join(root, file));
    const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
    if (doc) return hash(doc.getText());
    try {
      return hash(await fs.readFile(uri.fsPath, 'utf8'));
    } catch {
      return null;
    }
  }

  private async refreshStaleness(only?: string): Promise<boolean> {
    const snapshot = this.result?.snapshot;
    if (!snapshot || this.phase === 'stale' || isRunning(this.phase)) return false;
    let changedReviewedCode = false;
    for (const file of snapshot.files.filter(f => !only || f.path === only)) {
      const current = await this.currentHash(file.path);
      if (current === file.hash) continue;
      if (file.changed) changedReviewedCode = true;
      this.findings = markStale(this.findings, snapshot, file.path, current).findings;
    }
    const done = this.phase === 'done-findings' || this.phase === 'done-clean' || this.phase === 'done-partial';
    if (!done) return false;
    const live = this.findings.filter(f => !f.stale).length;
    if ((this.findings.length && !live) || (!this.findings.length && changedReviewedCode)) {
      this.phase = 'stale';
      this.note = 'Kode berubah setelah review; hasil ini mungkin tidak berlaku lagi. Jalankan review untuk kondisi terbaru.';
    } else if (live < this.findings.length) {
      this.note = `${this.findings.length - live} temuan kedaluwarsa karena kodenya berubah; ${live} temuan lain masih sesuai kode saat ini.`;
    }
    return true;
  }

  async onChanged(uri: vscode.Uri): Promise<void> {
    const root = this.result?.snapshot?.root;
    if (!root || uri.scheme !== 'file' || !inside(root, uri.fsPath)) return;
    const file = toPosix(path.relative(root, uri.fsPath));
    if (!this.result?.snapshot?.files.some(f => f.path === file)) return;
    const before = this.findings.filter(f => f.stale).length;
    const beforePhase = this.phase;
    await this.refreshStaleness(file);
    if (this.findings.filter(f => f.stale).length !== before || this.phase !== beforePhase) this.publish();
  }

  invalidate(reason: string): void {
    if (!this.result?.snapshot || isRunning(this.phase)) return;
    this.findings = this.findings.map(f => ({ ...f, stale: true }));
    this.phase = 'stale';
    this.note = reason;
    this.publish();
  }

  // --- Findings: evidence, feedback, follow-up (diagram 07).

  async open(id: string, index = -1): Promise<void> {
    const finding = this.findings.find(f => f.id === id);
    const snapshot = this.result?.snapshot;
    if (!finding || !snapshot) return;
    this.selectedId = id;
    if (finding.stale) {
      void vscode.window.showWarningMessage('Temuan ini kedaluwarsa: kodenya sudah berubah sejak direview. Jalankan review lagi.');
      this.publish();
      return;
    }
    const anchor = index >= 0 ? finding.evidence[index] : finding.location;
    if (!anchor) return;
    const doc = await vscode.workspace.openTextDocument(this.editorUi.uri(anchor.path));
    if (hash(doc.getText()) !== snapshot.files.find(f => f.path === anchor.path)?.hash) {
      await this.onChanged(doc.uri);
      void vscode.window.showWarningMessage('Kode ini sudah berubah sejak direview, jadi rujukannya mungkin tidak berlaku lagi.');
      return;
    }
    const range = this.editorUi.range(anchor);
    if (index < 0) this.revealId = id;
    const editor = await vscode.window.showTextDocument(doc, { preview: true });
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    this.publish();
  }


  private feedbackKey(root: string): string {
    return `saksi.feedback:${root}`;
  }

  private remembered(root: string): RememberedFeedback[] {
    return this.context.workspaceState.get<RememberedFeedback[]>(this.feedbackKey(root), []);
  }

  /** Feedback is a label with an optional reason, changeable later (UR-41); remembering is opt-in per answer (UR-42). */
  async setFeedback(id: string, kind: FeedbackKind | null, reason = '', rememberIt = false): Promise<void> {
    const finding = this.findings.find(f => f.id === id);
    const root = this.result?.snapshot?.root;
    if (!finding || !root) return;
    let list = forget(this.remembered(root), finding.fingerprint);
    if (kind && rememberIt) list = remember(list, finding, kind, clean(reason, 1000));
    await this.context.workspaceState.update(this.feedbackKey(root), list);
    this.findings = this.findings.map(f => f.id !== id ? f : { ...f, feedback: kind ? { kind, reason: clean(reason, 1000), remembered: rememberIt } : undefined });
    this.publish();
  }

  async forgetAllFeedback(): Promise<void> {
    const keys = this.context.workspaceState.keys().filter(key => key.startsWith('saksi.feedback:'));
    const ok = await vscode.window.showWarningMessage('Hapus semua tanggapan yang diingat Saksi untuk workspace ini?', { modal: true }, 'Hapus');
    if (ok !== 'Hapus') return;
    for (const key of keys) await this.context.workspaceState.update(key, undefined);
    this.findings = this.findings.map(f => f.feedback?.remembered ? { ...f, feedback: { ...f.feedback, remembered: false } } : f);
    void vscode.window.showInformationMessage('Tanggapan yang diingat sudah dihapus dari Saksi. Data yang pernah dikirim ke layanan model tidak ikut terhapus.');
    this.publish();
  }

  /** Feedback from an inline thread: label, optional reason, and whether to remember it (D3). */
  async feedbackFromThread(id: string): Promise<void> {
    const finding = this.findings.find(f => f.id === id);
    if (!finding) return;
    const kinds: { label: string; value: FeedbackKind | null }[] = (Object.keys(FEEDBACK_LABEL) as FeedbackKind[])
      .map(value => ({ label: FEEDBACK_LABEL[value], value, picked: finding.feedback?.kind === value }));
    if (finding.feedback) kinds.push({ label: 'Hapus tanggapan', value: null });
    const picked = await vscode.window.showQuickPick(kinds, { title: `Saksi · Tanggapi: ${finding.title}` });
    if (!picked) return;
    if (!picked.value) return this.setFeedback(id, null);
    const reason = await vscode.window.showInputBox({ title: `Saksi · ${picked.label}`, prompt: 'Alasan (opsional). Enter untuk lanjut.', value: finding.feedback?.reason ?? '' });
    if (reason === undefined) return;
    const keep = await vscode.window.showQuickPick([{ label: 'Ingat untuk kode yang sama', keep: true }, { label: 'Hanya untuk review ini', keep: false }], { title: 'Saksi · Ingat tanggapan ini?' });
    if (keep) await this.setFeedback(id, picked.value, reason, keep.keep);
  }

  /** Follow-up question or clarification about one finding; never changes code (UR-24, UR-26, UR-28). */
  async ask(id: string, text: string, mode: 'question' | 'clarification'): Promise<void> {
    const finding = this.findings.find(f => f.id === id);
    const snapshot = this.result?.snapshot;
    const message = clean(text, 4000).trim();
    if (!finding || !snapshot || !message || this.pending.has(id)) return;
    for (const file of new Set([finding.location.path, ...finding.evidence.map(e => e.path)])) await this.refreshStaleness(file);
    const current = this.findings.find(f => f.id === id);
    if (!current || current.stale) {
      void vscode.window.showWarningMessage('Temuan ini kedaluwarsa; jalankan review lagi sebelum bertanya.');
      this.publish();
      return;
    }
    const history = this.chats.get(id) ?? [];
    history.push({ role: 'user', text: message, mode });
    this.chats.set(id, history);
    this.pending.add(id);
    this.selectedId = id;
    this.publish();
    try {
      const config = await modelConfig(this.context.secrets);
      const settings = reviewSettings(vscode.Uri.file(snapshot.root));
      const ctx: PromptContext = { intent: this.intent, rules: settings.rules, remembered: notesFor(this.remembered(snapshot.root), snapshot), preferences: preferences() };
      const turns: ChatTurn[] = history.slice(0, -1).map(entry => ({ role: entry.role, text: entry.text }));
      const reply = await chat(config, chatMessages(snapshot, current, turns, message, mode, ctx));
      addUsage(this.usage, reply);
      let answer = reply.content;
      let verdict: unknown;
      try {
        const parsed = parseJsonContent(reply.content) as Record<string, unknown>;
        answer = clean(parsed.answer, 4000) || answer;
        verdict = parsed.verdict;
      } catch {
        // Plain-text answers are fine for questions; a clarification without a verdict is reported below.
      }
      history.push({ role: 'assistant', text: clean(answer, 4000) });
      if (mode === 'clarification') history.push({ role: 'assistant', text: this.reassess(current, verdict), system: true });
    } catch (error) {
      history.push({ role: 'assistant', text: `Gagal menghubungi layanan model: ${errorMessage(error)}`, system: true });
    } finally {
      this.pending.delete(id);
      this.publish();
    }
  }

  private reassess(finding: Finding, verdict: unknown): string {
    const snapshot = this.result?.snapshot;
    const applied = snapshot && verdict ? applyVerdict(finding, verdict, snapshot, finding.revisions.length + 1) : null;
    if (!applied) return 'Penilaian ulang tidak dapat dibaca dari jawaban model; temuan tidak diubah.';
    const revision = { ...applied.revision, reason: `Setelah klarifikasimu: ${applied.revision.reason}` };
    if (!applied.finding) {
      this.findings = this.findings.filter(f => f.id !== finding.id);
      this.dropped = [...this.dropped, { finding, revision }];
      return `Penilaian: ${REVISION_LABEL.dropped}. ${revision.reason}`;
    }
    const updated = enforceLimits({ ...applied.finding, revisions: [...finding.revisions, revision] });
    this.findings = this.findings.map(f => f.id === finding.id ? updated : f);
    return `Penilaian: ${REVISION_LABEL[revision.outcome]}. ${revision.reason}`;
  }

  async copySummary(): Promise<void> {
    await vscode.env.clipboard.writeText(toMarkdown(this.phase, this.findings, this.result?.snapshot));
    void vscode.window.showInformationMessage('Ringkasan review disalin ke clipboard. Tidak ada yang dikirim ke siapa pun.');
  }

  // --- Rendering.

  publish(): void {
    const running = !!this.running && isRunning(this.phase);
    const open = this.findings.filter(f => !f.stale).length;
    this.status.text = running ? '$(sync~spin) Saksi' : `$(eye) Saksi${open ? ` · ${open}` : ''}`;
    this.status.tooltip = `Saksi: ${PHASE_LABEL[this.phase]}\n${activeModelLabel()}`;
    this.editorUi.render({ findings: this.findings, snapshot: this.result?.snapshot, hints: inlineHints(), chats: this.chats, pending: this.pending, reveal: this.revealId });
    this.revealId = undefined;
    this.view?.update(buildViewState({
      phase: this.phase, note: this.note, running, intent: this.intent, scopeKind: this.scopeKind, depth: this.depth,
      result: this.result, findings: this.findings, dropped: this.dropped, chats: this.chats, pending: this.pending,
      selectedId: this.selectedId, usage: this.usage,
    }));
  }

  private setPhase(phase: Phase, note: string): void {
    this.phase = phase;
    this.note = note;
    this.publish();
  }

  dispose(): void {
    this.running?.abort();
  }
}

async function chooseRoot(signal: AbortSignal): Promise<string | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (!folders.length) throw new Error('Buka folder repository Git terlebih dulu.');
  const active = vscode.window.activeTextEditor?.document.uri;
  let folder = active ? vscode.workspace.getWorkspaceFolder(active) : undefined;
  if (!folder) {
    folder = folders.length === 1
      ? folders[0]
      : (await vscode.window.showQuickPick(folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })), { title: 'Saksi · Proyek yang direview' }))?.folder;
  }
  if (!folder) return undefined;
  if (folder.uri.scheme !== 'file') throw new Error('Saksi memerlukan filesystem lokal atau extension host Remote SSH/WSL.');
  const cwd = active?.scheme === 'file' && vscode.workspace.getWorkspaceFolder(active)?.uri.toString() === folder.uri.toString() ? path.dirname(active.fsPath) : folder.uri.fsPath;
  try {
    return (await git(cwd, ['rev-parse', '--show-toplevel'], signal)).replace(/\r?\n$/, '');
  } catch (error) {
    if (isAbort(error, signal)) throw error;
    throw new Error('Folder ini bukan repository Git, atau Git belum tersedia.');
  }
}
