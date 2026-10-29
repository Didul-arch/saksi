import { FEEDBACK_LABEL } from './feedback';
import { CERTAINTY_LABEL, IMPACT_LABEL } from './labels';
import { describeScope } from './scope';
import { PHASE_LABEL, type Phase } from './status';
import type { Finding, Snapshot } from './types';

/** Markdown summary the user can copy into a discussion; keeps certainty and evidence (UR-45). */
export function toMarkdown(phase: Phase, findings: Finding[], snapshot?: Snapshot): string {
  const out: string[] = ['## Ringkasan review Saksi', '', `Status: ${PHASE_LABEL[phase]}`];
  if (snapshot) out.push(`Cakupan: ${describeScope(snapshot.scope)}`);
  out.push('', '> Temuan AI. Label kepastian dan bukti perlu dinilai sendiri; hasil kosong bukan jaminan bebas bug.', '');
  if (!findings.length) out.push('_Tidak ada temuan dalam cakupan yang berhasil diperiksa._');
  findings.forEach((f, i) => {
    out.push(`### ${i + 1}. ${f.title}`);
    const tags = [CERTAINTY_LABEL[f.certainty], IMPACT_LABEL[f.impact]];
    if (f.unrefined) tags.push('belum diperiksa ulang');
    if (f.stale) tags.push('kedaluwarsa');
    if (f.feedback) tags.push(`ditandai ${FEEDBACK_LABEL[f.feedback.kind].toLowerCase()}`);
    out.push(`*${tags.join(' · ')}* — \`${f.location.path}:${f.location.startLine}\``, '');
    out.push(`- **Pengamatan:** ${f.observation}`);
    if (f.inference) out.push(`- **Alasan & dampak:** ${f.inference}`);
    if (f.confirmation) out.push(`- **Dasar konfirmasi:** ${f.confirmation.source} baris ${f.confirmation.line}: ${f.confirmation.message}`);
    if (f.missingContext) out.push(`- **Yang belum diketahui:** ${f.missingContext}`);
    if (f.suggestion) out.push(`- **Saran:** ${f.suggestion}`);
    out.push('- **Bukti:**');
    for (const e of f.evidence) out.push(`  - \`${e.path}:${e.startLine}\` ${e.reason}`);
    out.push('');
  });
  return out.join('\n');
}
