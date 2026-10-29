import { touches } from './git';
import { validPath } from './policy';
import { clean, hash, lines } from './text';
import type { Anchor, Certainty, Finding, Impact, Snapshot, SnapshotFile } from './types';

export const MAX_FINDINGS = 40;
const IMPACTS: readonly Impact[] = ['high', 'medium', 'low'];
const KINDS: Record<string, Certainty> = { issue: 'suspected', question: 'question', optional: 'optional' };

type Raw = Record<string, unknown>;
const isObject = (value: unknown): value is Raw => typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeQuote = (text: string): string => text.replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).join('\n').trim();

/** Checks that an anchor points at real lines of the snapshot and quotes them exactly (UR-17). */
export function anchor(value: unknown, files: ReadonlyMap<string, SnapshotFile>): Anchor | null {
  if (!isObject(value) || !validPath(value.path)) return null;
  const source = files.get(value.path);
  const { startLine, endLine, quote } = value;
  if (!source || !Number.isInteger(startLine) || !Number.isInteger(endLine)) return null;
  const start = startLine as number;
  const end = endLine as number;
  const all = lines(source.content);
  if (start < 1 || end < start || end > all.length || end - start > 24) return null;
  if (typeof quote !== 'string' || !quote.trim()) return null;
  const actual = all.slice(start - 1, end).join('\n');
  if (normalizeQuote(actual) !== normalizeQuote(quote)) return null;
  return { path: source.path, startLine: start, endLine: end, quote: actual, reason: clean(value.reason, 500) };
}

export const fingerprintOf = (location: Anchor): string => hash(`${location.path}\n${normalizeQuote(location.quote)}`).slice(0, 20);

/**
 * Turns one model-proposed finding into a validated Finding, or null when it has no checkable basis.
 * 'confirmed' is never taken from the model: it requires a language-provider error at the location (UR-19).
 */
export function parseFinding(value: unknown, snapshot: Snapshot): Finding | null {
  if (!isObject(value)) return null;
  const files = new Map(snapshot.files.map(f => [f.path, f]));
  const location = anchor(value.location, files);
  const file = location && files.get(location.path);
  if (!location || !file?.changed || !touches(file.hunks, location.startLine, location.endLine)) return null;
  const certainty = typeof value.kind === 'string' ? KINDS[value.kind] : undefined;
  const title = clean(value.title, 160).trim();
  const observation = clean(value.observation).trim();
  if (!certainty || !title || !observation) return null;
  const rawEvidence = Array.isArray(value.evidence) ? value.evidence : [];
  if (!rawEvidence.length || rawEvidence.length > 5) return null;
  const evidence = rawEvidence.map(item => anchor(item, files));
  if (evidence.some(item => !item)) return null;

  const finding: Finding = {
    id: '',
    fingerprint: fingerprintOf(location),
    title,
    certainty,
    impact: IMPACTS.includes(value.impact as Impact) ? value.impact as Impact : 'medium',
    impactReason: clean(value.impactReason, 500),
    observation,
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

export interface Validated {
  findings: Finding[];
  rejected: number;
}

/** Validates a full `{findings: [...]}` reply; duplicates are merged (UR-20). */
export function validateFindings(raw: unknown, snapshot: Snapshot): Validated {
  if (!isObject(raw) || !Array.isArray(raw.findings)) throw new Error('Respons model harus berisi array "findings".');
  if (raw.findings.length > MAX_FINDINGS) throw new Error(`Respons model berisi lebih dari ${MAX_FINDINGS} temuan.`);
  const findings: Finding[] = [];
  let rejected = 0;
  for (const value of raw.findings) {
    const finding = parseFinding(value, snapshot);
    if (!finding) {
      rejected++;
      continue;
    }
    if (!findings.some(f => f.id === finding.id)) findings.push(finding);
  }
  return { findings, rejected };
}
