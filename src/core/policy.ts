import * as path from 'node:path';

/** Languages with dedicated context support vs. generic review (UR-05). */
export const LANGUAGE_SUPPORT = {
  full: ['.go'],
  generic: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.rs', '.java', '.kt', '.cs', '.c', '.h', '.cpp', '.hpp', '.sql', '.rb', '.php', '.swift', '.vue', '.svelte', '.proto', '.sh'],
  config: ['.json', '.yaml', '.yml', '.toml', '.md', '.mod'],
} as const;

const SUPPORTED = new Set<string>([...LANGUAGE_SUPPORT.full, ...LANGUAGE_SUPPORT.generic, ...LANGUAGE_SUPPORT.config]);
const DEPENDENCY_DIRS = new Set(['.git', 'node_modules', 'vendor', 'dist', 'build', '.next', '.venv', 'coverage']);

export const MAX_FILE_BYTES = 90_000;

export function validPath(file: unknown): file is string {
  return typeof file === 'string' && !!file && !/[\x00-\x1f\\]/.test(file) && !path.posix.isAbsolute(file)
    && !/^[A-Za-z]:/.test(file) && !file.split('/').some(part => !part || part === '.' || part === '..');
}

export function isUserExcluded(file: string, excludes: readonly string[]): boolean {
  return excludes.some(entry => {
    const prefix = typeof entry === 'string' ? entry.replace(/\/+$/, '') : '';
    return !!prefix && (file === prefix || file.startsWith(prefix + '/'));
  });
}

/** Returns why a repository-relative path may not be read for review, or null when it may. */
export function skipReason(file: string, excludes: readonly string[] = []): string | null {
  if (!validPath(file)) return 'path tidak valid';
  if (isUserExcluded(file, excludes)) return 'dikecualikan olehmu (saksi.excludePaths)';
  const parts = file.toLowerCase().split('/');
  const base = parts[parts.length - 1] ?? '';
  if (parts.some(part => DEPENDENCY_DIRS.has(part))) return 'folder dependensi/build';
  if (/^\.env(?:\.|$)|^(?:credentials?|secrets?|tokens?)(?:\.|$)|^id_(?:rsa|ed25519)/.test(base)
    || /\.(?:pem|key|p12|pfx|crt)$/.test(base)) return 'nama file tampak sensitif';
  if (/(?:^|[.-])lock(?:\.|$)|\.lock$|\.min\.js$|\.map$/.test(base)) return 'file hasil generate / lock';
  if (!SUPPORTED.has(path.posix.extname(base))) return 'tipe file belum didukung';
  return null;
}

export const reviewable = (file: string, excludes: readonly string[] = []): boolean => skipReason(file, excludes) === null;

export function inside(root: string, file: string): boolean {
  const rel = path.relative(root, file);
  return !!rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}

export const toPosix = (value: string): string => value.split(path.sep).join('/');
