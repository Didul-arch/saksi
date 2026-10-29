import { refineMessages, type ChatMessage, type PromptContext } from './prompts';
import { clean, isAbort, errorMessage } from './text';
import type { Finding, Revision, RevisionOutcome, Snapshot } from './types';
import { parseFinding } from './validate';

const OUTCOMES: Record<string, RevisionOutcome> = {
  keep: 'kept', narrow: 'narrowed', 'to-question': 'to-question', drop: 'dropped', adjust: 'adjusted',
};

export interface Applied {
  /** null when the finding was dropped. */
  finding: Finding | null;
  revision: Revision;
}

/**
 * Applies one refinement or clarification verdict (diagram 06, section 9.2).
 * Returns null when the verdict itself is unusable.
 */
export function applyVerdict(finding: Finding, verdict: unknown, snapshot: Snapshot, round: number): Applied | null {
  if (typeof verdict !== 'object' || verdict === null) return null;
  const value = verdict as Record<string, unknown>;
  const outcome = typeof value.outcome === 'string' ? OUTCOMES[value.outcome] : undefined;
  if (!outcome) return null;
  const reason = clean(value.reason, 600).trim() || 'tanpa alasan dari model';

  if (outcome === 'kept') {
    const revision: Revision = { round, outcome, reason };
    return { finding: { ...finding, unrefined: false, revisions: [...finding.revisions, revision] }, revision };
  }
  if (outcome === 'dropped') {
    if (finding.certainty === 'confirmed') {
      // The language-provider error is still there; the model alone cannot dismiss it.
      const revision: Revision = { round, outcome: 'kept', reason: `Model mengusulkan dibuang (${reason}), tetapi error dari ${finding.confirmation?.source ?? 'language provider'} masih ada.` };
      return { finding: { ...finding, unrefined: false, revisions: [...finding.revisions, revision] }, revision };
    }
    const revision: Revision = { round, outcome, reason };
    return { finding: null, revision };
  }

  const updated = parseFinding(value.finding, snapshot);
  if (!updated) {
    const revision: Revision = { round, outcome: 'kept', reason: 'Pembaruan dari model tidak lolos validasi rujukan; temuan dipertahankan apa adanya.' };
    return { finding: { ...finding, unrefined: true, revisions: [...finding.revisions, revision] }, revision };
  }
  const revision: Revision = { round, outcome, reason };
  return {
    finding: {
      ...updated,
      id: finding.id,
      certainty: outcome === 'to-question' ? 'question' : updated.certainty,
      revisions: [...finding.revisions, revision],
      unrefined: false,
      feedback: finding.feedback,
    },
    revision,
  };
}

export type StopReason = 'no-new-info' | 'max-rounds' | 'cancelled' | 'error' | 'not-run';

export interface RefineDeps {
  maxRounds: number;
  ctx: PromptContext;
  /** Sends messages and returns the parsed JSON reply. */
  ask: (messages: ChatMessage[]) => Promise<unknown>;
  /** Adds requested files as context if policy allows; returns how many were added. */
  addFiles: (paths: string[]) => Promise<number>;
  onRound?: (round: number) => void;
  signal?: AbortSignal;
}

export interface RefineResult {
  findings: Finding[];
  dropped: { finding: Finding; revision: Revision }[];
  rounds: number;
  stopReason: StopReason;
  error?: string;
  /** More rounds could still have changed the result. */
  limitHit: boolean;
}

export async function refine(initial: Finding[], snapshot: Snapshot, deps: RefineDeps): Promise<RefineResult> {
  let current = initial;
  const dropped: RefineResult['dropped'] = [];
  if (!current.length || deps.maxRounds < 1) return { findings: current, dropped, rounds: 0, stopReason: 'not-run', limitHit: false };

  for (let round = 1; round <= deps.maxRounds; round++) {
    deps.onRound?.(round);
    let raw: unknown;
    try {
      raw = await deps.ask(refineMessages(snapshot, current, deps.ctx, round));
    } catch (error) {
      if (isAbort(error, deps.signal)) return { findings: current, dropped, rounds: round - 1, stopReason: 'cancelled', limitHit: false };
      return { findings: current, dropped, rounds: round - 1, stopReason: 'error', error: errorMessage(error), limitHit: false };
    }
    const reply = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
    const verdicts = new Map<string, unknown>();
    for (const verdict of Array.isArray(reply.verdicts) ? reply.verdicts : []) {
      const id = (verdict as Record<string, unknown> | null)?.id;
      if (typeof id === 'string') verdicts.set(id, verdict);
    }

    let changes = 0;
    const next: Finding[] = [];
    for (const finding of current) {
      const applied = verdicts.has(finding.id) ? applyVerdict(finding, verdicts.get(finding.id), snapshot, round) : null;
      if (!applied) {
        // Not judged this round: stays visible, but is not presented as refined (UR-21).
        next.push({ ...finding, unrefined: true });
        continue;
      }
      if (applied.revision.outcome !== 'kept') changes++;
      if (applied.finding) next.push(applied.finding);
      else dropped.push({ finding, revision: applied.revision });
    }
    current = next;

    const requested = (Array.isArray(reply.requestFiles) ? reply.requestFiles : []).filter((p): p is string => typeof p === 'string').slice(0, 5);
    const added = requested.length && current.length ? await deps.addFiles(requested) : 0;

    if (!current.length || (changes === 0 && added === 0)) {
      return { findings: current, dropped, rounds: round, stopReason: 'no-new-info', limitHit: false };
    }
    if (round === deps.maxRounds) {
      return { findings: current, dropped, rounds: round, stopReason: 'max-rounds', limitHit: true };
    }
  }
  return { findings: current, dropped, rounds: deps.maxRounds, stopReason: 'max-rounds', limitHit: true };
}

export const ROUNDS_BY_DEPTH = { quick: 0, standard: 1, deep: 3 } as const;
