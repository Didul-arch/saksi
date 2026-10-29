// Domain types, following requirements/diagrams/10-erd-conceptual.md.

import type { ReviewScope } from './scope';

/** Certainty label (section 8.2). Independent from impact (UR-19). */
export type Certainty = 'confirmed' | 'suspected' | 'question' | 'optional';
export type Impact = 'high' | 'medium' | 'low';
export type Depth = 'quick' | 'standard' | 'deep';
export type FeedbackKind = 'relevant' | 'wrong' | 'intentional' | 'deferred';
export type RevisionOutcome = 'kept' | 'narrowed' | 'to-question' | 'dropped' | 'adjusted';

export interface Hunk {
  start: number;
  end: number;
}

export interface Anchor {
  path: string;
  startLine: number;
  endLine: number;
  quote: string;
  reason: string;
}

export type FileRole = 'added' | 'modified' | 'renamed' | 'selected' | 'context';

export interface SnapshotFile {
  path: string;
  content: string;
  hash: string;
  role: FileRole;
  /** True when findings may be located in this file. */
  changed: boolean;
  oldPath?: string;
  hunks: Hunk[];
  patch: string;
}

export interface DeletedFile {
  path: string;
  patch: string;
}

export interface SkippedItem {
  path: string;
  reason: string;
  /** Changed files that were skipped make coverage partial; skipped related files do not. */
  changed: boolean;
}

export interface DiagnosticInfo {
  id: number;
  path: string;
  line: number;
  endLine: number;
  severity: 'error' | 'warning' | 'info';
  source: string;
  message: string;
}

export interface Snapshot {
  root: string;
  base: string | null;
  scope: ReviewScope;
  files: SnapshotFile[];
  deleted: DeletedFile[];
  skipped: SkippedItem[];
  totalChanged: number;
  used: number;
  notes: string[];
  diagnostics: DiagnosticInfo[];
  /** True once a size/count limit stopped more changed content from being included. */
  limitReached: boolean;
}

export interface Revision {
  round: number;
  outcome: RevisionOutcome;
  reason: string;
}

export interface Finding {
  id: string;
  /** Stable across reviews while the located code is unchanged; used for remembered feedback (UR-42). */
  fingerprint: string;
  title: string;
  certainty: Certainty;
  impact: Impact;
  impactReason: string;
  observation: string;
  inference: string;
  missingContext: string;
  suggestion: string;
  consequences: string;
  location: Anchor;
  evidence: Anchor[];
  /** Basis for 'confirmed': a language-provider error at the location. */
  confirmation?: { source: string; message: string; line: number };
  revisions: Revision[];
  /** True while the finding has not passed refinement, or refinement could not judge it (UR-21). */
  unrefined: boolean;
  stale: boolean;
  feedback?: { kind: FeedbackKind; reason: string; remembered: boolean };
}

export interface Usage {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  /** False when at least one response did not report token usage. */
  complete: boolean;
}

export interface SensitiveHit {
  path: string;
  line: number;
  kind: string;
}
