// Writing rules for findings (requirements/features/terse-style.md): one educational, concise voice,
// grounded in the reviewed code. Grounding problems reject a finding; length is only cut when far over.

import { existsSync } from 'node:fs';
import * as path from 'node:path';
import type { Finding, Snapshot } from './types';

export const TEXT_FIELDS = ['title', 'observation', 'concept', 'inference', 'missingContext', 'impactReason', 'suggestion', 'consequences'] as const;
export type TextField = typeof TEXT_FIELDS[number];

/** Per-field character limits asked of the model (UR-51, UR-56). */
export const LIMITS: Record<TextField, number> = {
  title: 70, observation: 200, concept: 240, inference: 220, missingContext: 180, impactReason: 120, suggestion: 220, consequences: 180,
};

/**
 * Claims of test/build results that Saksi never ran (UR-53), e.g. "tes gagal", "build passed".
 * Predictions ("akan gagal dikompilasi", "would fail") are allowed: they are reasoning, not reported results.
 */
const RAN_CLAIM = /\b(?:tes|test|tests|build)\b[^.\n]{0,25}?\b(?:gagal|failed|fails|berhasil|passed|passes|lulus)\b/gi;
const MODAL = /\b(?:akan|bisa|dapat|mungkin|kemungkinan|jika|kalau|would|will|could|may|might|if)\b/i;

const claimsRun = (text: string): boolean => [...text.matchAll(RAN_CLAIM)].some(m => !MODAL.test(m[0]));

/** Go builtins may be named without appearing in the reviewed code. */
const BUILTINS = new Set(['append', 'cap', 'clear', 'close', 'complex', 'copy', 'delete', 'imag', 'len', 'make', 'max', 'min', 'new', 'panic', 'print', 'println', 'real', 'recover']);

const PATH = /(?:[\w.-]+\/)*[\w.-]+\.(?:go|mod|ts|tsx|js|jsx|mjs|cjs|py|rs|java|kt|cs|c|h|cpp|hpp|sql|rb|php|swift|vue|svelte|proto|sh|json|ya?ml|toml|md)\b/g;

/** Every identifier-like word in the reviewed code, used to catch invented names. */
export function vocabulary(snapshot: Snapshot): Set<string> {
  const words = new Set<string>();
  const add = (text: string) => { for (const m of text.matchAll(/[A-Za-z_]\w*/g)) words.add(m[0]); };
  for (const f of snapshot.files) { add(f.content); add(f.patch); add(f.path); }
  for (const d of snapshot.deleted) { add(d.patch); add(d.path); }
  return words;
}

/**
 * Reasons a finding is not grounded (UR-53, section 8.3). Narrow on purpose, to catch invention without
 * rejecting honest explanations:
 * - the observation calls an unqualified function that exists nowhere in the reviewed code
 *   (`validateCard()`); library names like `io.Writer` or types like `string` are fine;
 * - a field names a file that does not exist in the repository;
 * - a field reports test/build results that were never run.
 * The suggestion may name new functions or files, since it proposes a change.
 */
export function groundingProblems(finding: Finding, snapshot: Snapshot, words = vocabulary(snapshot)): string[] {
  const problems: string[] = [];
  for (const m of finding.observation.matchAll(/`([^`\n]{1,120})`/g)) {
    const unknown = [...m[1]!.matchAll(/(?<![\w.])([A-Za-z_]\w*)\s*\(/g)].map(c => c[1]!).filter(name => !words.has(name) && !BUILTINS.has(name));
    if (unknown.length) problems.push(`pengamatan menyebut \`${unknown.join(', ')}()\` yang tidak ada di kode yang direview`);
  }
  const known = new Set([...snapshot.files.map(f => f.path), ...snapshot.deleted.map(d => d.path), ...snapshot.skipped.map(s => s.path)]);
  if (snapshot.project) known.add(snapshot.project.path);
  const basenames = new Set([...known].map(p => p.split('/').pop()));
  const exists = (file: string) => known.has(file) || basenames.has(file) || existsSync(path.join(snapshot.root, file));
  for (const field of TEXT_FIELDS) {
    if (field === 'suggestion' || field === 'consequences') continue;
    for (const m of finding[field].matchAll(PATH)) {
      if (!exists(m[0])) problems.push(`menyebut file ${m[0]} yang tidak ada di repository`);
    }
    if (!finding.confirmation && claimsRun(finding[field])) problems.push('mengklaim hasil tes/build yang tidak pernah dijalankan');
  }
  return problems;
}

/** Cuts only text far over its limit (K4), at a sentence or word boundary. */
export function trim(text: string, max: number): string {
  if (text.length <= max * 2) return text;
  const cut = text.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(' ');
  return (word > max * 0.5 ? cut.slice(0, word) : cut) + '…';
}

export function enforceLimits(finding: Finding): Finding {
  const out = { ...finding };
  for (const field of TEXT_FIELDS) out[field] = trim(out[field], LIMITS[field]);
  return out;
}
