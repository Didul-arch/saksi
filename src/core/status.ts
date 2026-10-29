// Review status machine, following requirements/diagrams/08-state-review-status.md.

export type Phase =
  | 'idle'
  | 'no-changes'
  | 'awaiting-dirty'
  | 'awaiting-confirm'
  | 'reading-context'
  | 'initial-check'
  | 'refining'
  | 'done-findings'
  | 'done-clean'
  | 'done-partial'
  | 'unvalidated'
  | 'failed'
  | 'cancelled'
  | 'stale';

/** Status text; meaning never depends on colour or animation alone (UR-49). */
export const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Siap',
  'no-changes': 'Belum ada perubahan',
  'awaiting-dirty': 'Menunggu keputusan file belum disimpan',
  'awaiting-confirm': 'Menunggu konfirmasi pengiriman',
  'reading-context': 'Sedang berjalan · membaca konteks',
  'initial-check': 'Sedang berjalan · pemeriksaan awal',
  refining: 'Sedang berjalan · memeriksa ulang temuan',
  'done-findings': 'Selesai dengan temuan',
  'done-clean': 'Selesai tanpa temuan',
  'done-partial': 'Selesai sebagian / terbatas',
  unvalidated: 'Temuan tidak dapat divalidasi',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
  stale: 'Kedaluwarsa',
};

const RUN: Phase[] = ['reading-context', 'initial-check', 'refining'];
export const RUNNING: ReadonlySet<Phase> = new Set(['awaiting-dirty', 'awaiting-confirm', ...RUN]);
export const FINAL: ReadonlySet<Phase> = new Set(['no-changes', 'done-findings', 'done-clean', 'done-partial', 'unvalidated', 'failed', 'cancelled', 'stale']);

const ENDINGS: Phase[] = ['done-findings', 'done-clean', 'done-partial', 'unvalidated', 'failed', 'cancelled', 'stale'];

const EDGES: Record<Phase, Phase[]> = {
  idle: ['awaiting-dirty', 'reading-context', 'failed'],
  'awaiting-dirty': ['reading-context', 'cancelled', 'failed'],
  'reading-context': ['reading-context', 'no-changes', 'awaiting-confirm', 'initial-check', ...ENDINGS],
  'awaiting-confirm': ['initial-check', ...ENDINGS],
  'initial-check': ['refining', ...ENDINGS],
  refining: ['refining', ...ENDINGS],
  'no-changes': ['idle'],
  'done-findings': ['idle', 'stale'],
  'done-clean': ['idle', 'stale'],
  'done-partial': ['idle', 'stale'],
  unvalidated: ['idle'],
  failed: ['idle'],
  cancelled: ['idle'],
  stale: ['idle'],
};

export const canTransition = (from: Phase, to: Phase): boolean => EDGES[from].includes(to);
export const isRunning = (phase: Phase): boolean => RUNNING.has(phase);

export interface Outcome {
  visibleFindings: number;
  rejected: number;
  partial: boolean;
}

/** Final status of a completed run; failed/partial runs are never shown as a clean result (UR-31, UR-32). */
export function finalPhase(outcome: Outcome): Phase {
  if (outcome.visibleFindings === 0 && outcome.rejected > 0) return 'unvalidated';
  if (outcome.partial) return 'done-partial';
  return outcome.visibleFindings ? 'done-findings' : 'done-clean';
}
