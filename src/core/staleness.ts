import type { Finding, Snapshot } from './types';

export function snapshotHash(snapshot: Snapshot, path: string): string | undefined {
  return snapshot.files.find(f => f.path === path)?.hash;
}

/**
 * Marks only the findings that rely on `path` as stale when its content no longer matches the snapshot.
 * Unrelated findings stay valid (UR-33, UR-34). `currentHash` is null when the file is gone.
 */
export function markStale(findings: Finding[], snapshot: Snapshot, path: string, currentHash: string | null): { findings: Finding[]; newlyStale: number } {
  const reviewed = snapshotHash(snapshot, path);
  if (reviewed === undefined || reviewed === currentHash) return { findings, newlyStale: 0 };
  let newlyStale = 0;
  const updated = findings.map(finding => {
    if (finding.stale) return finding;
    const relies = finding.location.path === path || finding.evidence.some(e => e.path === path);
    if (!relies) return finding;
    newlyStale++;
    return { ...finding, stale: true };
  });
  return { findings: updated, newlyStale };
}
