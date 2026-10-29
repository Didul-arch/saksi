import type { RememberedNote } from './prompts';
import type { FeedbackKind, Finding, Snapshot } from './types';

export const FEEDBACK_LABEL: Record<FeedbackKind, string> = {
  relevant: 'Relevan',
  wrong: 'Keliru',
  intentional: 'Disengaja',
  deferred: 'Ditunda',
};

/** Feedback remembered per project for the same code condition (UR-42). Not consent for training (UR-40). */
export interface RememberedFeedback {
  fingerprint: string;
  path: string;
  quote: string;
  kind: FeedbackKind;
  reason: string;
  savedAt: string;
}

export function remember(list: readonly RememberedFeedback[], finding: Finding, kind: FeedbackKind, reason: string, now = new Date()): RememberedFeedback[] {
  const entry: RememberedFeedback = {
    fingerprint: finding.fingerprint, path: finding.location.path, quote: finding.location.quote, kind, reason: reason.slice(0, 1000), savedAt: now.toISOString(),
  };
  return [...list.filter(item => item.fingerprint !== finding.fingerprint), entry].slice(-500);
}

export const forget = (list: readonly RememberedFeedback[], fingerprint: string): RememberedFeedback[] =>
  list.filter(item => item.fingerprint !== fingerprint);

/** Remembered reasons for files in this snapshot, passed to the model as user context. */
export function notesFor(list: readonly RememberedFeedback[], snapshot: Snapshot): RememberedNote[] {
  const paths = new Set(snapshot.files.map(f => f.path));
  return list.filter(item => paths.has(item.path) && item.kind !== 'relevant')
    .map(({ path, quote, kind, reason }) => ({ path, quote, kind, reason }));
}

/** Marks findings whose located code matches remembered feedback. Nothing is hidden silently. */
export function applyRemembered(findings: Finding[], list: readonly RememberedFeedback[]): Finding[] {
  const byFingerprint = new Map(list.map(item => [item.fingerprint, item]));
  return findings.map(finding => {
    const saved = byFingerprint.get(finding.fingerprint);
    return saved ? { ...finding, feedback: { kind: saved.kind, reason: saved.reason, remembered: true } } : finding;
  });
}

/** Findings the user already answered as wrong/intentional for the same code are collapsed, not counted as open. */
export const isOpen = (finding: Finding): boolean =>
  !finding.stale && !(finding.feedback && (finding.feedback.kind === 'wrong' || finding.feedback.kind === 'intentional'));
