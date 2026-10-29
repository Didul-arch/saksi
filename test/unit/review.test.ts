import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../src/core/prompts';
import type { ModelReply } from '../../src/core/provider';
import { runReview, STALE_REASON, type ReviewDeps, type SendDecision } from '../../src/core/review';
import { canTransition, type Phase } from '../../src/core/status';
import { GO_CALLER, GO_FILE, rawFinding, tempRepo, write } from './helpers';

const reply = (value: unknown, usage = true): ModelReply => ({ content: JSON.stringify(value), usage: usage ? { promptTokens: 10, completionTokens: 5 } : undefined });

function setup() {
  const root = tempRepo({ 'payment.go': GO_FILE.replace('func setPaymentNumber', 'func old'), 'caller.go': GO_CALLER });
  write(root, { 'payment.go': GO_FILE });
  return root;
}

function deps(root: string, answers: ((m: ChatMessage[]) => ModelReply)[], overrides: Partial<ReviewDeps> = {}) {
  const phases: Phase[] = [];
  const sent: ChatMessage[][] = [];
  const d: ReviewDeps = {
    root,
    collect: { scope: { kind: 'saved-since-commit' } },
    ctx: { intent: 'dipakai package billing', rules: [], remembered: [], preferences: { language: 'id', showOptional: true } },
    depth: 'standard',
    remembered: [],
    ask: async messages => {
      sent.push(messages);
      const next = answers.shift();
      if (!next) throw new Error('unexpected model call');
      return next(messages);
    },
    confirmSend: async () => 'send',
    onPhase: phase => phases.push(phase),
    signal: new AbortController().signal,
    ...overrides,
  };
  return { d, phases, sent };
}

function assertPath(phases: Phase[]) {
  let previous: Phase = 'idle';
  for (const phase of phases) {
    expect(canTransition(previous, phase), `${previous} -> ${phase}`).toBe(true);
    previous = phase;
  }
}

describe('runReview', () => {
  it('runs initial check + refinement and reports final findings with usage', async () => {
    const root = setup();
    const { d, phases, sent } = deps(root, [
      () => reply({ findings: [rawFinding()] }),
      m => {
        const id = JSON.parse(m[1]!.content).candidates[0].id;
        return reply({ verdicts: [{ id, outcome: 'to-question', reason: 'Belum ada pemanggil lintas package.', finding: rawFinding({ kind: 'question' }) }] }, false);
      },
    ]);
    const result = await runReview(d);
    assertPath(phases);
    expect(result.phase).toBe('done-findings');
    expect(result.findings[0]).toMatchObject({ certainty: 'question', unrefined: false });
    expect(result.findings[0]?.revisions[0]?.outcome).toBe('to-question');
    expect(result.usage).toEqual({ requests: 2, promptTokens: 10, completionTokens: 5, complete: false });
    const payload = JSON.parse(sent[0]![1]!.content);
    expect(payload.intent).toBe('dipakai package billing');
    expect(payload.snapshot.files.map((f: { path: string }) => f.path)).toContain('caller.go');
  });

  it('never calls the model when the user cancels at the send prompt (UR-36)', async () => {
    const { d } = deps(setup(), [], { confirmSend: async () => 'cancel' });
    const result = await runReview(d);
    expect(result.phase).toBe('cancelled');
  });

  it('excludes files with sensitive data when asked (UR-38, UA-23)', async () => {
    const root = setup();
    write(root, { 'config.go': 'package payment\n\nconst apiKey = "abcd1234efgh5678"\n' });
    let seen: SendDecision | undefined;
    const { d, sent } = deps(root, [() => reply({ findings: [] })], {
      depth: 'quick',
      confirmSend: async preview => {
        expect(preview.sensitive).toEqual([{ path: 'config.go', line: 3, kind: 'nilai rahasia dalam kode' }]);
        seen = 'exclude-sensitive';
        return seen;
      },
    });
    const result = await runReview(d);
    expect(seen).toBe('exclude-sensitive');
    expect(sent[0]![1]!.content).not.toContain('abcd1234efgh5678');
    expect(result.phase).toBe('done-partial');
  });

  it('distinguishes no changes, clean, unvalidated and failed results (UR-31, UR-32)', async () => {
    const clean = tempRepo({ 'a.go': 'package a\n' });
    expect((await runReview(deps(clean, []).d)).phase).toBe('no-changes');

    const empty = await runReview(deps(setup(), [() => reply({ findings: [] })]).d);
    expect(empty.phase).toBe('done-clean');
    expect(empty.note).toMatch(/bukan jaminan/);

    const invalid = await runReview(deps(setup(), [() => reply({ findings: [rawFinding({ evidence: [] })] })]).d);
    expect(invalid.phase).toBe('unvalidated');

    const failed = await runReview(deps(setup(), [() => { throw new Error('HTTP 429'); }]).d);
    expect(failed.phase).toBe('failed');
    expect(failed.note).toMatch(/bukan hasil review bersih/);
  });

  it('marks the result stale when the code changes during the review (UR-33)', async () => {
    const root = setup();
    const { d } = deps(root, [() => {
      write(root, { 'payment.go': GO_FILE + '// edit\n' });
      return reply({ findings: [rawFinding()] });
    }], { depth: 'quick' });
    const result = await runReview(d);
    expect(result.phase).toBe('stale');
    expect(result.findings.every(f => f.stale)).toBe(true);
  });

  it('separates user cancellation from stale cancellation', async () => {
    const controller = new AbortController();
    const abortWith = (reason?: string) => () => {
      controller.abort(reason);
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    };
    const cancelled = await runReview(deps(setup(), [abortWith()], { signal: controller.signal }).d);
    expect(cancelled.phase).toBe('cancelled');
    const other = new AbortController();
    const stale = await runReview(deps(setup(), [() => { other.abort(STALE_REASON); throw Object.assign(new Error('x'), { name: 'AbortError' }); }], { signal: other.signal }).d);
    expect(stale.phase).toBe('stale');
  });

  it('applies remembered feedback for the same code (UR-42, UA-19)', async () => {
    const root = setup();
    const { d, sent } = deps(root, [() => reply({ findings: [rawFinding()] })], { depth: 'quick' });
    d.remembered = [{ fingerprint: '', path: 'payment.go', quote: 'func setPaymentNumber() {', kind: 'intentional', reason: 'internal', savedAt: '' }];
    const first = await runReview({ ...d, remembered: [] });
    const fingerprint = first.findings[0]!.fingerprint;
    const second = await runReview({ ...deps(root, [() => reply({ findings: [rawFinding()] })], { depth: 'quick' }).d, remembered: [{ ...d.remembered[0]!, fingerprint }] });
    expect(second.findings[0]?.feedback).toEqual({ kind: 'intentional', reason: 'internal', remembered: true });
    expect(sent).toHaveLength(1);
  });
});
