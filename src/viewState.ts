// Plain data sent to the companion webview. All meaning is carried in text (UR-49).

import { FEEDBACK_LABEL, isOpen } from './core/feedback';
import { CERTAINTY_LABEL, IMPACT_LABEL, REVISION_LABEL } from './core/labels';
import { LANGUAGE_SUPPORT } from './core/policy';
import type { ReviewResult } from './core/review';
import { describeScope } from './core/scope';
import { PHASE_LABEL, type Phase } from './core/status';
import type { Depth, Finding, Revision, Usage } from './core/types';
import { activeModelLabel, isConfigured, showCompanion, type ScopeKind } from './settings';

export interface ChatEntry {
  role: 'user' | 'assistant';
  text: string;
  mode?: 'question' | 'clarification';
  /** Status lines from Saksi itself (reassessment result, errors), not model prose. */
  system?: boolean;
}

export interface ViewFinding {
  id: string;
  group: 'open' | 'answered' | 'stale';
  title: string;
  certainty: string;
  certaintyLabel: string;
  impactLabel: string;
  impactReason: string;
  flags: string[];
  location: string;
  observation: string;
  inference: string;
  confirmation: string;
  missingContext: string;
  suggestion: string;
  consequences: string;
  evidence: { label: string; quote: string; reason: string }[];
  revisions: { label: string; reason: string }[];
  feedback: { kind: string; label: string; reason: string; remembered: boolean } | null;
  chat: ChatEntry[];
  pending: boolean;
}

export interface ViewState {
  phase: Phase;
  phaseLabel: string;
  note: string;
  running: boolean;
  configured: boolean;
  model: string;
  intent: string;
  scopeKind: ScopeKind;
  depth: Depth;
  showCompanion: boolean;
  support: string;
  coverage: null | {
    scope: string;
    changed: number;
    total: number;
    related: number;
    deleted: number;
    diagnostics: number;
    skipped: { path: string; reason: string }[];
    notes: string[];
    refinement: string;
    rejected: number;
  };
  findings: ViewFinding[];
  dropped: { title: string; reason: string }[];
  usage: string;
  selectedId: string | null;
}

export interface StateInput {
  phase: Phase;
  note: string;
  running: boolean;
  intent: string;
  scopeKind: ScopeKind;
  depth: Depth;
  result?: ReviewResult;
  findings: Finding[];
  dropped: { finding: Finding; revision: Revision }[];
  chats: ReadonlyMap<string, ChatEntry[]>;
  pending: ReadonlySet<string>;
  selectedId?: string;
  usage: Usage;
}

function refinementText(result: ReviewResult): string {
  const r = result.refinement;
  switch (r.stopReason) {
    case 'not-run': return result.findings.some(f => f.unrefined) ? 'Kedalaman cepat: temuan belum diperiksa ulang.' : 'Tidak ada temuan untuk diperiksa ulang.';
    case 'no-new-info': return `Diperiksa ulang ${r.rounds} putaran; berhenti karena tidak ada informasi baru.`;
    case 'max-rounds': return `Diperiksa ulang ${r.rounds} putaran; batas kedalaman tercapai.`;
    case 'cancelled': return 'Pemeriksaan ulang dihentikan.';
    case 'error': return `Pemeriksaan ulang tidak selesai: ${r.error ?? 'kesalahan tidak diketahui'}`;
  }
}

function usageText(usage: Usage): string {
  if (!usage.requests) return 'Belum ada permintaan ke layanan model di sesi ini.';
  const tokens = usage.promptTokens + usage.completionTokens;
  const base = `${usage.requests} permintaan · ${tokens.toLocaleString('id-ID')} token dilaporkan layanan`;
  return `${base}${usage.complete ? '' : ' (sebagian respons tidak melaporkan token)'}. Estimasi biaya tidak tersedia; periksa tarif layananmu.`;
}

function viewFinding(f: Finding, input: StateInput): ViewFinding {
  const flags: string[] = [];
  if (f.unrefined) flags.push('belum diperiksa ulang');
  if (f.stale) flags.push('kedaluwarsa');
  return {
    id: f.id,
    group: f.stale ? 'stale' : isOpen(f) ? 'open' : 'answered',
    title: f.title,
    certainty: f.certainty,
    certaintyLabel: CERTAINTY_LABEL[f.certainty],
    impactLabel: IMPACT_LABEL[f.impact],
    impactReason: f.impactReason,
    flags,
    location: `${f.location.path}:${f.location.startLine}${f.location.endLine > f.location.startLine ? `–${f.location.endLine}` : ''}`,
    observation: f.observation,
    inference: f.inference,
    confirmation: f.confirmation ? `${f.confirmation.source} melaporkan error di baris ${f.confirmation.line}: ${f.confirmation.message}` : '',
    missingContext: f.missingContext,
    suggestion: f.suggestion,
    consequences: f.consequences,
    evidence: f.evidence.map(e => ({ label: `${e.path}:${e.startLine}`, quote: e.quote, reason: e.reason })),
    revisions: f.revisions.map(r => ({ label: REVISION_LABEL[r.outcome], reason: r.reason })),
    feedback: f.feedback ? { kind: f.feedback.kind, label: FEEDBACK_LABEL[f.feedback.kind], reason: f.feedback.reason, remembered: f.feedback.remembered } : null,
    chat: input.chats.get(f.id) ?? [],
    pending: input.pending.has(f.id),
  };
}

export function buildViewState(input: StateInput): ViewState {
  const snapshot = input.result?.snapshot;
  return {
    phase: input.phase,
    phaseLabel: PHASE_LABEL[input.phase],
    note: input.note,
    running: input.running,
    configured: isConfigured(),
    model: activeModelLabel(),
    intent: input.intent,
    scopeKind: input.scopeKind,
    depth: input.depth,
    showCompanion: showCompanion(),
    support: `Konteks lintas file khusus: Go (${LANGUAGE_SUPPORT.full.join(', ')}). Review umum lewat language provider: ${LANGUAGE_SUPPORT.generic.join(' ')}. Tipe file lain dilewati dan ditampilkan di cakupan.`,
    coverage: snapshot && input.result ? {
      scope: describeScope(snapshot.scope),
      changed: snapshot.files.filter(f => f.changed).length,
      total: snapshot.totalChanged,
      related: snapshot.files.filter(f => !f.changed).length,
      deleted: snapshot.deleted.length,
      diagnostics: snapshot.diagnostics.length,
      skipped: snapshot.skipped.map(s => ({ path: s.path, reason: s.reason })),
      notes: snapshot.notes,
      refinement: refinementText(input.result),
      rejected: input.result.rejected,
    } : null,
    findings: input.findings.map(f => viewFinding(f, input)),
    dropped: input.dropped.map(d => ({ title: d.finding.title, reason: d.revision.reason })),
    usage: usageText(input.usage),
    selectedId: input.selectedId ?? null,
  };
}
