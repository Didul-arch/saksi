import { lines } from './text';
import type { SensitiveHit, Snapshot } from './types';

// Heuristic only: the product must not claim to find every secret (UR-38).
const PATTERNS: [string, RegExp][] = [
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['API key (sk-…)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['nilai rahasia dalam kode', /\b(?:api[_-]?key|secret|passw(?:or)?d|token)\b\s*[:=]\s*["'][^"'\s]{8,}["']/i],
];

/** Lines that look like secrets. The matched value itself is never returned. */
export function scanText(file: string, text: string): SensitiveHit[] {
  const hits: SensitiveHit[] = [];
  lines(text).forEach((line, index) => {
    for (const [kind, pattern] of PATTERNS) {
      if (pattern.test(line)) {
        hits.push({ path: file, line: index + 1, kind });
        break;
      }
    }
  });
  return hits;
}

export function scanSnapshot(snapshot: Snapshot): SensitiveHit[] {
  return [
    ...snapshot.files.flatMap(file => scanText(file.path, file.content)),
    // Removed lines are sent too, as deletion context.
    ...snapshot.deleted.flatMap(file => scanText(file.path, file.patch).map(hit => ({ ...hit, line: 0 }))),
    ...(snapshot.project && !snapshot.files.some(f => f.path === snapshot.project?.path) ? scanText(snapshot.project.path, snapshot.project.text) : []),
  ];
}

/** Drops files with hits from the snapshot, recording them as skipped (diagram 04, "sesuaikan"). */
export function excludeHits(snapshot: Snapshot, hits: readonly SensitiveHit[]): void {
  const paths = new Set(hits.map(hit => hit.path));
  const reason = 'informasi sensitif terdeteksi; dikecualikan atas pilihanmu';
  for (const file of snapshot.files.filter(f => paths.has(f.path))) {
    snapshot.skipped.push({ path: file.path, reason, changed: file.changed });
    snapshot.used -= file.content.length + file.patch.length;
  }
  for (const file of snapshot.deleted.filter(f => paths.has(f.path))) {
    snapshot.skipped.push({ path: file.path, reason, changed: true });
    snapshot.used -= file.patch.length;
  }
  if (snapshot.project && paths.has(snapshot.project.path)) {
    snapshot.used -= snapshot.project.text.length;
    snapshot.project = undefined;
  }
  snapshot.files = snapshot.files.filter(f => !paths.has(f.path));
  snapshot.deleted = snapshot.deleted.filter(f => !paths.has(f.path));
}
