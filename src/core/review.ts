// One review run: diagram 04 (start), 05 (pipeline) and 06 (refinement), without any VS Code dependency.

import { applyRemembered, notesFor, type RememberedFeedback } from './feedback';
import { reviewMessages, type ChatMessage, type PromptContext } from './prompts';
import { parseJsonContent, type ModelReply } from './provider';
import { ROUNDS_BY_DEPTH, refine, type StopReason } from './refine';
import { goCandidates } from './related';
import { excludeHits, scanSnapshot } from './sensitive';
import { addRelated, collect, isPartial, unchanged, type CollectOptions } from './snapshot';
import { finalPhase, type Phase } from './status';
import { enforceLimits } from './style';
import { errorMessage, isAbort } from './text';
import type { Depth, DiagnosticInfo, Finding, Revision, SensitiveHit, Snapshot, Usage } from './types';
import { validateFindings } from './validate';

export type SendDecision = 'send' | 'cancel' | 'exclude-sensitive';

export interface SendPreview {
  snapshot: Snapshot;
  sensitive: SensitiveHit[];
}


export interface ReviewDeps {
  root: string;
  collect: CollectOptions;
  ctx: PromptContext;
  depth: Depth;
  remembered: readonly RememberedFeedback[];
  ask: (messages: ChatMessage[], signal: AbortSignal) => Promise<ModelReply>;
  /** Related-file candidates from the language provider (editor side). */
  enrich?: (snapshot: Snapshot, signal: AbortSignal) => Promise<string[]>;
  /** Diagnostics for the final set of snapshot files. */
  diagnostics?: (snapshot: Snapshot) => Omit<DiagnosticInfo, 'id'>[];
  /** Always called before anything is sent; may show a preview or a sensitive-data prompt (UR-36–39). */
  confirmSend: (preview: SendPreview) => Promise<SendDecision>;
  onPhase?: (phase: Phase, note: string) => void;
  signal: AbortSignal;
}

export interface ReviewResult {
  phase: Phase;
  note: string;
  snapshot?: Snapshot;
  findings: Finding[];
  dropped: { finding: Finding; revision: Revision }[];
  rejected: number;
  refinement: { rounds: number; stopReason: StopReason; limitHit: boolean; error?: string };
  usage: Usage;
}

export const STALE_REASON = 'stale';

export function emptyUsage(): Usage {
  return { requests: 0, promptTokens: 0, completionTokens: 0, complete: true };
}

export function addUsage(usage: Usage, reply: ModelReply): void {
  usage.requests++;
  if (reply.usage) {
    usage.promptTokens += reply.usage.promptTokens;
    usage.completionTokens += reply.usage.completionTokens;
  } else {
    usage.complete = false;
  }
}

const MAX_DIAGNOSTICS = 60;

export async function runReview(deps: ReviewDeps): Promise<ReviewResult> {
  const { signal } = deps;
  const usage = emptyUsage();
  const result: ReviewResult = {
    phase: 'reading-context', note: '', findings: [], dropped: [], rejected: 0,
    refinement: { rounds: 0, stopReason: 'not-run', limitHit: false }, usage,
  };
  const phase = (next: Phase, note: string) => {
    result.phase = next;
    result.note = note;
    deps.onPhase?.(next, note);
  };
  const ask = async (messages: ChatMessage[]) => {
    const reply = await deps.ask(messages, signal);
    addUsage(usage, reply);
    return parseJsonContent(reply.content);
  };

  try {
    phase('reading-context', 'Membaca perubahan dalam cakupan…');
    const snapshot = await collect(deps.root, deps.collect, signal);
    result.snapshot = snapshot;
    if (!snapshot.files.some(f => f.changed) && !snapshot.deleted.length) {
      const why = snapshot.skipped.length ? ' Semua perubahan dilewati; lihat cakupan review.' : '';
      phase('no-changes', `Tidak ada perubahan yang bisa direview dalam cakupan ini.${why} Ubah cakupan, simpan file, atau lanjut menulis kode.`);
      return result;
    }

    phase('reading-context', 'Mencari pemanggil, penggunaan terkait, dan diagnostics…');
    const candidates = deps.enrich ? await deps.enrich(snapshot, signal) : [];
    await addRelated(snapshot, [...candidates, ...await goCandidates(snapshot, signal)], deps.collect);
    const included = new Set(snapshot.files.map(f => f.path));
    snapshot.diagnostics = (deps.diagnostics?.(snapshot) ?? []).filter(d => included.has(d.path)).slice(0, MAX_DIAGNOSTICS).map((d, id) => ({ ...d, id }));

    const sensitive = scanSnapshot(snapshot);
    phase('awaiting-confirm', 'Menunggu konfirmasi pengiriman…');
    const decision = await deps.confirmSend({ snapshot, sensitive });
    if (decision === 'cancel') {
      phase('cancelled', 'Review dihentikan sebelum ada kode yang dikirim.');
      return result;
    }
    if (decision === 'exclude-sensitive') {
      excludeHits(snapshot, sensitive);
      if (!snapshot.files.some(f => f.changed) && !snapshot.deleted.length) {
        phase('cancelled', 'Semua perubahan berisi informasi sensitif dan dikecualikan; tidak ada yang dikirim.');
        return result;
      }
    }
    if (!(await unchanged(snapshot))) {
      phase('stale', 'Kode berubah sebelum review dikirim. Jalankan review lagi.');
      return result;
    }

    const ctx: PromptContext = { ...deps.ctx, remembered: notesFor(deps.remembered, snapshot) };
    const changedCount = snapshot.files.filter(f => f.changed).length;
    const contextCount = snapshot.files.length - changedCount;
    phase('initial-check', `Pemeriksaan awal: ${changedCount} file berubah + ${contextCount} file konteks…`);
    const validated = validateFindings(await ask(reviewMessages(snapshot, ctx)), snapshot);
    result.findings = validated.findings;
    result.rejected = validated.rejected;

    const maxRounds = ROUNDS_BY_DEPTH[deps.depth];
    if (result.findings.length && maxRounds > 0) {
      const refined = await refine(result.findings, snapshot, {
        maxRounds, ctx, signal,
        ask,
        addFiles: async paths => {
          const before = snapshot.files.length;
          await addRelated(snapshot, paths, { ...deps.collect, maxRelatedFiles: (deps.collect.maxRelatedFiles ?? 8) + 5 });
          return snapshot.files.length - before;
        },
        onRound: round => phase('refining', `Memeriksa ulang ${result.findings.length} temuan (putaran ${round}/${maxRounds})…`),
      });
      result.findings = refined.findings;
      result.dropped = refined.dropped;
      result.refinement = { rounds: refined.rounds, stopReason: refined.stopReason, limitHit: refined.limitHit, error: refined.error };
      if (refined.stopReason === 'cancelled') return cancelled(result, phase, signal);
    } else if (maxRounds === 0) {
      // Quick depth: findings are explicitly not refined.
      result.findings = result.findings.map(f => ({ ...f, unrefined: true }));
    }

    result.findings = result.findings.map(enforceLimits);

    if (!(await unchanged(snapshot))) {
      phase('stale', 'Kode berubah selama review. Hasil tidak ditampilkan sebagai pemeriksaan terbaru; jalankan review lagi.');
      result.findings = result.findings.map(f => ({ ...f, stale: true }));
      return result;
    }

    result.findings = applyRemembered(result.findings, deps.remembered);
    const partial = isPartial(snapshot) || result.refinement.stopReason === 'error' || result.findings.some(f => f.unrefined && maxRounds > 0);
    const final = finalPhase({ visibleFindings: result.findings.length, rejected: result.rejected, partial });
    phase(final, finalNote(final, result, snapshot));
    return result;
  } catch (error) {
    if (isAbort(error, signal)) return cancelled(result, phase, signal);
    phase('failed', `${errorMessage(error)} Ini bukan hasil review bersih.`);
    return result;
  }
}

function cancelled(result: ReviewResult, phase: (p: Phase, n: string) => void, signal: AbortSignal): ReviewResult {
  if (signal.reason === STALE_REASON) {
    result.findings = result.findings.map(f => ({ ...f, stale: true }));
    phase('stale', 'Kode berubah selama review. Jalankan review lagi untuk kondisi terbaru.');
  } else {
    result.findings = result.findings.map(f => ({ ...f, unrefined: true }));
    phase('cancelled', result.findings.length
      ? `Review dihentikan. ${result.findings.length} temuan sementara belum selesai diperiksa ulang.`
      : 'Review dihentikan. Kode dan tujuanmu tidak berubah.');
  }
  return result;
}

function finalNote(phase: Phase, result: ReviewResult, snapshot: Snapshot): string {
  const parts: string[] = [];
  const count = result.findings.length;
  if (phase === 'unvalidated') parts.push(`${result.rejected} temuan dari model tidak punya rujukan yang cocok dengan kode, jadi tidak ditampilkan. Review ini belum memberi kesimpulan yang dapat diandalkan.`);
  else if (phase === 'done-clean') parts.push('Tidak ada temuan dalam cakupan yang berhasil diperiksa. Ini bukan jaminan kode bebas bug.');
  else if (count) parts.push(`${count} hal untuk diperiksa. Buka bukti sebelum memutuskan.`);
  else parts.push('Tidak ada temuan dalam bagian yang berhasil diperiksa.');
  if (phase === 'done-partial') {
    const skipped = snapshot.skipped.filter(s => s.changed).length;
    if (skipped) parts.push(`${skipped} perubahan dilewati.`);
    if (snapshot.limitReached) parts.push('Batas ukuran/jumlah tercapai.');
    if (result.refinement.stopReason === 'error') parts.push(`Pemeriksaan ulang tidak selesai: ${result.refinement.error}`);
    else if (result.findings.some(f => f.unrefined)) parts.push('Sebagian temuan belum selesai diperiksa ulang.');
  }
  if (result.refinement.limitHit) parts.push('Batas kedalaman pemeriksaan ulang tercapai.');
  if (result.dropped.length) parts.push(`${result.dropped.length} dugaan awal dibatalkan setelah diperiksa ulang.`);
  if (result.rejected && phase !== 'unvalidated') parts.push(`${result.rejected} keluaran model dibuang karena rujukannya tidak valid.`);
  return parts.join(' ');
}
