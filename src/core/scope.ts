// Pure domain logic lives in src/core and must not import 'vscode',
// so it can be unit-tested with Vitest outside the Extension Host.

export type ReviewScope =
  | { kind: 'saved-since-commit' }
  | { kind: 'staged' }
  | { kind: 'files'; paths: string[] }
  | { kind: 'selection'; path: string; startLine: number; endLine: number };

/** Plain-language scope summary, without Git jargon (UR-11). */
export function describeScope(scope: ReviewScope): string {
  switch (scope.kind) {
    case 'saved-since-commit':
      return 'perubahan tersimpan sejak commit terakhir, termasuk file baru';
    case 'staged':
      return 'perubahan yang akan di-commit';
    case 'files':
      return `${scope.paths.length} file terpilih`;
    case 'selection':
      return `${scope.path} baris ${scope.startLine}–${scope.endLine}`;
  }
}
