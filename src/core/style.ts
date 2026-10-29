// Writing rules for findings: terse, core problem first, and grounded in the reviewed code.
// Grounding problems reject a finding; style problems trigger one rewrite, then a hard trim.

import type { Finding, Snapshot } from './types';

export type Style = 'terse' | 'concise' | 'educational';

export const TEXT_FIELDS = ['title', 'observation', 'inference', 'missingContext', 'impactReason', 'suggestion', 'consequences'] as const;
export type TextField = typeof TEXT_FIELDS[number];

const TERSE_LIMITS: Record<TextField, number> = {
  title: 70, observation: 200, inference: 220, missingContext: 180, impactReason: 120, suggestion: 220, consequences: 180,
};

export function limitsFor(style: Style): Record<TextField, number> {
  const factor = style === 'terse' ? 1 : style === 'concise' ? 1.5 : 2.5;
  return Object.fromEntries(TEXT_FIELDS.map(f => [f, f === 'title' ? TERSE_LIMITS.title + (style === 'terse' ? 0 : 20) : Math.round(TERSE_LIMITS[f] * factor)])) as Record<TextField, number>;
}

/** Filler that adds words but no information. */
const FILLER = [
  /\bperlu (?:diperhatikan|dicatat|diingat)\b/i, /\bpenting untuk (?:dicatat|diperhatikan)\b/i, /\bsebagai catatan\b/i,
  /\bdapat dikatakan\b/i, /\bsecara umum\b/i, /\bdalam hal ini\b/i, /\bhal ini\b/i, /\bperlu diketahui\b/i,
  /\bit(?:'s| is) (?:important|worth) (?:to note|noting)\b/i, /\bplease note\b/i, /\bin this case\b/i, /\bgenerally speaking\b/i,
];

/** Overstatement that turns a guess into a fact. */
const ABSOLUTE = [/\bpasti\b/i, /\bsudah jelas\b/i, /\bselalu (?:gagal|crash|error)\b/i, /\bdefinitely\b/i, /\bcertainly\b/i, /\bwill always (?:fail|crash)\b/i];

/** Claims of test/build results that Saksi never ran. */
const RAN_CLAIM = /\b(?:tes|test|tests|build|kompilasi|compile|compilation)\b[^.\n]{0,25}\b(?:gagal|failed|fails|error(?:ed)?|berhasil|passed|passes)\b/i;

export interface StyleIssue {
  field: TextField;
  problem: string;
}

export function styleIssues(finding: Finding, style: Style): StyleIssue[] {
  const limits = limitsFor(style);
  const issues: StyleIssue[] = [];
  for (const field of TEXT_FIELDS) {
    const text = finding[field];
    if (!text) continue;
    if (text.length > limits[field]) issues.push({ field, problem: `lebih dari ${limits[field]} karakter` });
    if (FILLER.some(p => p.test(text))) issues.push({ field, problem: 'berisi frasa pengisi' });
    if (finding.certainty !== 'confirmed' && ABSOLUTE.some(p => p.test(text))) issues.push({ field, problem: 'terlalu yakin untuk temuan yang belum terkonfirmasi' });
    if (!finding.confirmation && RAN_CLAIM.test(text)) issues.push({ field, problem: 'mengklaim hasil tes/build yang tidak pernah dijalankan' });
  }
  if (style === 'terse' && finding.title.split(/\s+/).length > 9) issues.push({ field: 'title', problem: 'judul lebih dari 9 kata' });
  return issues;
}

const PATH = /(?:[\w.-]+\/)*[\w.-]+\.(?:go|mod|ts|tsx|js|jsx|mjs|cjs|py|rs|java|kt|cs|c|h|cpp|hpp|sql|rb|php|swift|vue|svelte|proto|sh|json|ya?ml|toml|md)\b/g;

/** Every identifier-like word in the reviewed code, used to catch invented names. */
export function vocabulary(snapshot: Snapshot): Set<string> {
  const words = new Set<string>();
  const add = (text: string) => { for (const m of text.matchAll(/[A-Za-z_][\w]*/g)) words.add(m[0]); };
  for (const f of snapshot.files) { add(f.content); add(f.patch); add(f.path); }
  for (const d of snapshot.deleted) { add(d.patch); add(d.path); }
  return words;
}

/**
 * Reasons a finding is not grounded in the snapshot (section 8.3):
 * the observation names code that does not exist, or any field cites a file outside the review.
 * The suggestion may name new identifiers or files, since it proposes a change.
 */
export function groundingProblems(finding: Finding, snapshot: Snapshot, words = vocabulary(snapshot)): string[] {
  const problems: string[] = [];
  for (const m of finding.observation.matchAll(/`([^`\n]{1,120})`/g)) {
    const unknown = (m[1]!.match(/[A-Za-z_]\w*/g) ?? []).filter(w => w.length > 1 && !words.has(w));
    if (unknown.length) problems.push(`pengamatan menyebut \`${unknown.join(', ')}\` yang tidak ada di kode yang direview`);
  }
  const known = new Set([...snapshot.files.map(f => f.path), ...snapshot.deleted.map(d => d.path), ...snapshot.skipped.map(s => s.path)]);
  const basenames = new Set([...known].map(p => p.split('/').pop()));
  for (const field of TEXT_FIELDS) {
    if (field === 'suggestion' || field === 'consequences') continue;
    for (const m of finding[field].matchAll(PATH)) {
      if (!known.has(m[0]) && !basenames.has(m[0])) problems.push(`menyebut file ${m[0]} yang tidak ada dalam review`);
    }
  }
  return problems;
}

/** Last-resort trim at a sentence or word boundary so limits always hold. */
export function trim(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'));
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(' ');
  return (word > max * 0.5 ? cut.slice(0, word) : cut) + '…';
}

export function enforceLimits(finding: Finding, style: Style): Finding {
  const limits = limitsFor(style);
  const out = { ...finding };
  for (const field of TEXT_FIELDS) out[field] = trim(out[field], limits[field]);
  return out;
}

/**
 * Applies a model rewrite of text fields only. Location, evidence and certainty stay locked;
 * the rewrite must stay grounded, keep stated uncertainty, and actually reduce style issues.
 */
export function applyRewrite(finding: Finding, rewrite: unknown, snapshot: Snapshot, style: Style, words?: Set<string>): Finding {
  if (typeof rewrite !== 'object' || rewrite === null) return finding;
  const value = rewrite as Record<string, unknown>;
  const candidate = { ...finding };
  for (const field of TEXT_FIELDS) {
    if (typeof value[field] === 'string') candidate[field] = (value[field] as string).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  }
  if (!candidate.title || !candidate.observation) return finding;
  if (finding.missingContext && !candidate.missingContext) return finding;
  if (groundingProblems(candidate, snapshot, words).length) return finding;
  return styleIssues(candidate, style).length < styleIssues(finding, style).length ? candidate : finding;
}
