import { createHash } from 'node:crypto';

export const hash = (text: string): string => createHash('sha256').update(text).digest('hex');

export const lines = (text: string): string[] => text.replace(/\r\n/g, '\n').split('\n');

/** Strips control characters and truncates untrusted text before it reaches the UI or a prompt. */
export function clean(value: unknown, max = 2000): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max)
    : '';
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isAbort(error: unknown, signal?: AbortSignal): boolean {
  return !!signal?.aborted || (error instanceof Error && error.name === 'AbortError');
}
