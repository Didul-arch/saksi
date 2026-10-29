import { GitError, git } from './git';
import type { Snapshot } from './types';

/** Function names declared in changed Go files, plus their exported spelling. */
export function goNames(snapshot: Snapshot): string[] {
  const names = new Set<string>();
  for (const file of snapshot.files.filter(f => f.changed && f.path.endsWith('.go'))) {
    for (const match of file.content.matchAll(/^func\s+(?:\([^\n)]*\)\s*)?([A-Za-z_]\w*)\s*(?:\[|\()/gm)) {
      const name = match[1];
      if (!name || names.size >= 24) break;
      names.add(name);
      names.add(name[0]!.toUpperCase() + name.slice(1));
    }
  }
  return [...names];
}

/**
 * Tracked Go files mentioning a changed function name. A lexical match is a hint for context,
 * not proof that two names resolve to the same symbol (section 8.3).
 */
export async function goCandidates(snapshot: Snapshot, signal?: AbortSignal): Promise<string[]> {
  const names = goNames(snapshot);
  if (!names.length) return [];
  try {
    const result = await git(snapshot.root, ['grep', '-l', '-z', '-I', '-F', ...names.flatMap(name => ['-e', name]), '--'], signal);
    return result.split('\0').filter(file => file.endsWith('.go'));
  } catch (error) {
    if (!(error instanceof GitError)) throw error;
    if (error.code !== 1) snapshot.notes.push('Pencarian teks untuk file terkait gagal; cakupan konteks mungkin terbatas.');
    return [];
  }
}
