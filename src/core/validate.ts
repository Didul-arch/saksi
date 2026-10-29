import { touches } from './git';
import { validPath } from './policy';
import { groundingProblems, vocabulary } from './style';
import { clean, hash, lines } from './text';
import type { Anchor, Certainty, Finding, Impact, Snapshot, SnapshotFile } from './types';

export const MAX_FINDINGS = 40;
const IMPACTS: readonly Impact[] = ['high', 'medium', 'low'];
const KINDS: Record<string, Certainty> = { issue: 'suspected', question: 'question', optional: 'optional' };

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeQuote = (text: string): string => text.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).join('\n').trim();

/** Line numbers sometimes arrive as numeric strings; an omitted end means a single line. */
const lineNumber = (value: unknown): number | undefined => {
  const n = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value;
  return Number.isInteger(n) ? n as number : undefined;
};

/** Models sometimes copy the "N|" prefix of the numbered source into the quote. */
const stripNumbers = (quote: string): string => quote.replace(/^[ \t]*\d+\|/gm, '');

/**
 * Checks that an anchor points at real lines of the snapshot and quotes them exactly (UR-17).
 * Returns the anchor, or why it was rejected.
 */
export function anchor(value: unknown, files: ReadonlyMap<string, SnapshotFile>): Anchor | string {
  if (!isObject(value)) return 'rujukan tidak berbentuk objek';
  if (!validPath(value.path)) return `path tidak valid: ${clean(value.path, 120)}`;
  const source = files.get(value.path);
  if (!source) return `file ${value.path} tidak ada dalam review`;
  const start = lineNumber(value.startLine);
  const end = value.endLine === undefined ? start : lineNumber(value.endLine);
  if (start === undefined || end === undefined) return `${value.path}: nomor baris tidak valid`;
  const all = lines(source.content);
  if (start < 1 || end < start || end > all.length || end - start > 24) return `${value.path}: baris ${start}–${end} di luar file atau terlalu panjang`;
  if (typeof value.quote !== 'string' || !value.quote.trim()) return `${value.path}:${start}: kutipan kosong`;
  const actual = all.slice(start - 1, end).join('\n');
  if (normalizeQuote(actual) !== normalizeQuote(stripNumbers(value.quote))) {
    return `${value.path}:${start}: kutipan tidak cocok dengan kode di baris itu`;
  }
  return { path: source.path, startLine: start, endLine: end, quote: actual, reason: clean(value.reason, 500) };
}

export const fingerprintOf = (location: Anchor): string => hash(`${location.path}\n${normalizeQuote(location.quote)}`).slice(0, 20);

export function parseFinding(value: unknown, snapshot: Snapshot): Finding | null {
  const result = checkFinding(value, snapshot);
  return typeof result === 'string' ? null : result;
}

/**
 * Turns one model-proposed finding into a validated Finding, or says why it has no checkable basis.
 * 'confirmed' is never taken from the model: it requires a language-provider error at the location (UR-19).
 */
export function checkFinding(value: unknown, snapshot: Snapshot): Finding | string {
  if (!isObject(value)) return 'temuan tidak berbentuk objek';
  const files = new Map(snapshot.files.map(f => [f.path, f]));
  const location = anchor(value.location, files);
  if (typeof location === 'string') return `lokasi: ${location}`;
  const file = files.get(location.path);
  if (!file?.changed || !touches(file.hunks, location.startLine, location.endLine)) {
    return `lokasi ${location.path}:${location.startLine} tidak berada di baris yang berubah`;
  }
  const certainty = typeof value.kind === 'string' ? KINDS[value.kind] : undefined;
  const title = clean(value.title, 160).trim();
  const observation = clean(value.observation).trim();
  if (!certainty) return `jenis temuan tidak dikenal: ${clean(value.kind, 40) || '(kosong)'}`;
  if (!title || !observation) return 'judul atau pengamatan kosong';
  const rawEvidence = Array.isArray(value.evidence) ? value.evidence : [];
  if (!rawEvidence.length || rawEvidence.length > 5) return 'bukti harus berisi 1–5 rujukan';
  const evidence = rawEvidence.map(item => anchor(item, files));
  const badEvidence = evidence.find(item => typeof item === 'string');
  if (badEvidence) return `bukti: ${badEvidence}`;

  const finding: Finding = {
    id: '',
    fingerprint: fingerprintOf(location),
    title,
    certainty,
    impact: IMPACTS.includes(value.impact as Impact) ? value.impact as Impact : 'medium',
    impactReason: clean(value.impactReason, 500),
    observation,
    concept: clean(value.concept, 1000),
    inference: clean(value.inference),
    missingContext: clean(value.missingContext, 1000),
    suggestion: clean(value.suggestion, 1500),
    consequences: clean(value.consequences, 1000),
    location,
    evidence: evidence as Anchor[],
    revisions: [],
    unrefined: true,
    stale: false,
  };
  // Invented calls or files mean the finding is not grounded in the reviewed code (section 8.3).
  const problems = groundingProblems(finding, snapshot, wordsOf(snapshot));
  if (problems.length) return problems[0]!;
  finding.id = hash(JSON.stringify([location.path, location.startLine, location.endLine, title])).slice(0, 16);

  if (certainty === 'suspected' && Number.isInteger(value.diagnostic)) {
    const diagnostic = snapshot.diagnostics.find(d => d.id === value.diagnostic);
    if (diagnostic && diagnostic.severity === 'error' && diagnostic.path === location.path
      && diagnostic.line <= location.endLine && diagnostic.endLine >= location.startLine) {
      finding.certainty = 'confirmed';
      finding.confirmation = { source: diagnostic.source, message: diagnostic.message, line: diagnostic.line };
    }
  }
  return finding;
}

const vocabularyCache = new WeakMap<Snapshot, { size: number; words: Set<string> }>();

function wordsOf(snapshot: Snapshot): Set<string> {
  const size = snapshot.files.length + snapshot.deleted.length;
  const cached = vocabularyCache.get(snapshot);
  if (cached && cached.size === size) return cached.words;
  const words = vocabulary(snapshot);
  vocabularyCache.set(snapshot, { size, words });
  return words;
}

export interface Rejection {
  title: string;
  reason: string;
}

export interface Validated {
  findings: Finding[];
  rejected: number;
  /** Why each dropped finding was rejected, shown to the user (UR-31). */
  rejections: Rejection[];
}

/** Validates a full `{findings: [...]}` reply; duplicates are merged (UR-20). */
export function validateFindings(raw: unknown, snapshot: Snapshot): Validated {
  if (!isObject(raw) || !Array.isArray(raw.findings)) throw new Error('Respons model harus berisi array "findings".');
  if (raw.findings.length > MAX_FINDINGS) throw new Error(`Respons model berisi lebih dari ${MAX_FINDINGS} temuan.`);
  const findings: Finding[] = [];
  const rejections: Rejection[] = [];
  for (const value of raw.findings) {
    const finding = checkFinding(value, snapshot);
    if (typeof finding === 'string') {
      rejections.push({ title: clean(isObject(value) ? value.title : '', 160) || '(tanpa judul)', reason: finding });
      continue;
    }
    if (!findings.some(f => f.id === finding.id)) findings.push(finding);
  }
  return { findings, rejected: rejections.length, rejections };
}
