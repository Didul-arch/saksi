import type { Certainty, Impact, RevisionOutcome } from './types';

export const CERTAINTY_LABEL: Record<Certainty, string> = {
  confirmed: 'Masalah terkonfirmasi',
  suspected: 'Dugaan masalah',
  question: 'Pertanyaan',
  optional: 'Saran opsional',
};

export const CERTAINTY_SYMBOL: Record<Certainty, string> = {
  confirmed: '■',
  suspected: '◇',
  question: '?',
  optional: '·',
};

export const IMPACT_LABEL: Record<Impact, string> = {
  high: 'Dampak besar',
  medium: 'Dampak sedang',
  low: 'Dampak kecil',
};

export const REVISION_LABEL: Record<RevisionOutcome, string> = {
  kept: 'Dipertahankan',
  narrowed: 'Dipersempit',
  'to-question': 'Diubah menjadi pertanyaan',
  dropped: 'Dibuang',
  adjusted: 'Disesuaikan dengan tujuanmu',
};
