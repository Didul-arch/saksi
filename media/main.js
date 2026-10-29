// @ts-check
'use strict';
// Companion panel. Renders text only (textContent), never HTML from the model.

const vscode = acquireVsCodeApi();
const $ = id => /** @type {HTMLElement} */ (document.getElementById(id));
const post = message => vscode.postMessage(message);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, onClick, className = 'link', label) {
  const b = el('button', className, text);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  b.addEventListener('click', onClick);
  return b;
}

function field(label, text) {
  if (!text) return null;
  const p = el('p', 'field');
  p.append(el('strong', '', `${label}: `), document.createTextNode(text));
  return p;
}

// --- Form

const intent = /** @type {HTMLTextAreaElement} */ ($('intent'));
const scope = /** @type {HTMLSelectElement} */ ($('scope'));
const depth = /** @type {HTMLSelectElement} */ ($('depth'));
let intentTimer;
intent.addEventListener('input', () => {
  clearTimeout(intentTimer);
  intentTimer = setTimeout(() => post({ type: 'intent', intent: intent.value }), 400);
});
const options = () => post({ type: 'options', scopeKind: scope.value, depth: depth.value });
scope.addEventListener('change', options);
depth.addEventListener('change', options);
$('form').addEventListener('submit', event => {
  event.preventDefault();
  clearTimeout(intentTimer);
  post({ type: 'review', intent: intent.value, scopeKind: scope.value, depth: depth.value });
});
$('cancel').addEventListener('click', () => post({ type: 'cancel' }));
$('configure').addEventListener('click', () => post({ type: 'configure' }));
$('shortcut').addEventListener('click', () => post({ type: 'shortcut' }));
$('copy').addEventListener('click', () => post({ type: 'copy' }));
$('clear').addEventListener('click', () => post({ type: 'clear' }));

// --- Drafts survive re-rendering (chat text, feedback reasons).

function captureDrafts() {
  const drafts = {};
  document.querySelectorAll('details[data-fold]').forEach(node => { drafts[`fold:${node.getAttribute('data-fold')}`] = /** @type {HTMLDetailsElement} */ (node).open; });
  document.querySelectorAll('[data-draft]').forEach(node => {
    const input = /** @type {HTMLInputElement} */ (node);
    drafts[input.dataset.draft || ''] = input.type === 'checkbox' ? input.checked : input.value;
  });
  const active = /** @type {HTMLElement | null} */ (document.activeElement);
  return { drafts, focus: active?.dataset?.draft || active?.dataset?.focus || null };
}

function restoreDrafts({ drafts, focus }) {
  document.querySelectorAll('details[data-fold]').forEach(node => {
    const open = drafts[`fold:${node.getAttribute('data-fold')}`];
    if (open !== undefined) /** @type {HTMLDetailsElement} */ (node).open = !!open || node.hasAttribute('data-selected');
  });
  document.querySelectorAll('[data-draft]').forEach(node => {
    const input = /** @type {HTMLInputElement} */ (node);
    const value = drafts[input.dataset.draft || ''];
    if (value === undefined) return;
    if (input.type === 'checkbox') input.checked = !!value;
    else input.value = String(value);
  });
  if (focus) {
    const target = /** @type {HTMLElement | null} */ (document.querySelector(`[data-draft="${CSS.escape(focus)}"], [data-focus="${CSS.escape(focus)}"]`));
    target?.focus();
  }
}

// --- Findings

const FEEDBACK = [['relevant', 'Relevan'], ['wrong', 'Keliru'], ['intentional', 'Disengaja'], ['deferred', 'Ditunda']];

// Cards fold to a one-line summary; details and chat also live inline in the editor.
function findingCard(f, index, selectedId, total) {
  const article = el('article', `finding ${f.certainty} ${f.group}`);
  article.id = `finding-${f.id}`;
  const card = /** @type {HTMLDetailsElement} */ (el('details', 'fold'));
  card.dataset.fold = f.id;
  card.open = selectedId === f.id || total === 1;
  if (selectedId === f.id) card.dataset.selected = '';
  const summary = el('summary');
  card.append(summary);
  article.append(card);
  const tags = el('p', 'tags');
  tags.append(el('span', 'badge', f.certaintyLabel), el('span', 'badge subtle', f.impactLabel));
  for (const flag of f.flags) tags.append(el('span', 'badge warn', flag));
  if (f.feedback) tags.append(el('span', 'badge subtle', `Ditandai: ${f.feedback.label}${f.feedback.remembered ? ' · diingat' : ''}`));
  summary.append(tags, el('h3', '', `${index + 1}. ${f.title}`));

  const loc = button(f.location, () => post({ type: 'open', id: f.id, index: -1 }), 'location', `Buka lokasi ${f.location}`);
  loc.dataset.focus = `open-${f.id}`;
  card.append(loc);
  for (const node of [
    field('Pengamatan', f.observation),
    field('Konsep', f.concept),
    field('Alasan & dampak', f.inference),
    field('Tingkat dampak', f.impactReason),
    field('Dasar konfirmasi', f.confirmation),
    field('Yang belum diketahui', f.missingContext),
    field('Saran', f.suggestion),
    field('Konsekuensi / alternatif', f.consequences),
  ]) if (node) card.append(node);

  const evidence = el('details', 'evidence');
  evidence.open = selectedId === f.id;
  evidence.append(el('summary', '', `Bukti (${f.evidence.length} rujukan kode)`));
  f.evidence.forEach((e, i) => {
    const item = el('div', 'evidence-item');
    item.append(button(e.label, () => post({ type: 'open', id: f.id, index: i }), 'location', `Buka bukti ${e.label}`));
    const pre = el('pre');
    pre.append(el('code', '', e.quote));
    item.append(pre);
    if (e.reason) item.append(el('p', 'muted', e.reason));
    evidence.append(item);
  });
  card.append(evidence);

  if (f.revisions.length) {
    const history = el('details', 'revisions');
    history.append(el('summary', '', `Riwayat penilaian (${f.revisions.length})`));
    const list = el('ul');
    for (const r of f.revisions) list.append(el('li', '', `${r.label}: ${r.reason}`));
    history.append(list);
    card.append(history);
  }

  // Feedback (UR-41, UR-42)
  const fb = el('fieldset', 'feedback');
  fb.append(el('legend', '', 'Tanggapanmu'));
  const reason = /** @type {HTMLInputElement} */ (el('input'));
  reason.type = 'text';
  reason.placeholder = 'Alasan (opsional)';
  reason.dataset.draft = `reason-${f.id}`;
  reason.value = f.feedback?.reason || '';
  reason.setAttribute('aria-label', 'Alasan tanggapan');
  const keep = /** @type {HTMLInputElement} */ (el('input'));
  keep.type = 'checkbox';
  keep.id = `remember-${f.id}`;
  keep.dataset.draft = `remember-${f.id}`;
  keep.checked = !!f.feedback?.remembered;
  const keepLabel = el('label', 'inline muted', ' Ingat untuk kode yang sama');
  keepLabel.prepend(keep);
  const row = el('div', 'row');
  for (const [kind, label] of FEEDBACK) {
    const b = button(label, () => post({ type: 'feedback', id: f.id, kind, reason: reason.value, remember: keep.checked }), 'chip');
    b.setAttribute('aria-pressed', String(f.feedback?.kind === kind));
    b.dataset.focus = `fb-${kind}-${f.id}`;
    row.append(b);
  }
  if (f.feedback) row.append(button('Hapus tanggapan', () => post({ type: 'feedback', id: f.id, kind: null }), 'link'));
  fb.append(row, reason, keepLabel);
  if (f.group !== 'stale') card.append(fb);

  // Conversation (UR-24, UR-26)
  const chat = el('div', 'chat');
  for (const turn of f.chat) {
    const who = turn.role === 'user' ? (turn.mode === 'clarification' ? 'Klarifikasimu' : 'Kamu') : turn.system ? 'Saksi · status' : 'Saksi';
    const msg = el('div', `msg ${turn.role}${turn.system ? ' system' : ''}`);
    msg.append(el('strong', '', `${who}: `), document.createTextNode(turn.text));
    chat.append(msg);
  }
  if (f.pending) chat.append(el('p', 'muted', 'Menunggu jawaban…'));
  if (f.group !== 'stale') {
    const box = /** @type {HTMLTextAreaElement} */ (el('textarea'));
    box.rows = 2;
    box.placeholder = 'Tanya “kenapa?”, “dampaknya apa?”, atau jelaskan jika ini disengaja.';
    box.dataset.draft = `chat-${f.id}`;
    box.setAttribute('aria-label', `Pesan tentang temuan ${index + 1}`);
    const send = mode => () => {
      if (!box.value.trim()) return;
      post({ type: 'ask', id: f.id, text: box.value, mode });
      box.value = '';
    };
    const actions = el('div', 'row');
    const ask = button('Tanya', send('question'), 'secondary');
    const clarify = button('Klarifikasi & nilai ulang', send('clarification'), 'secondary');
    ask.disabled = clarify.disabled = f.pending;
    actions.append(ask, clarify);
    chat.append(box, actions);
  }
  card.append(chat);
  return article;
}

function group(title, items, selectedId, offset, total) {
  const section = el('section', 'group');
  section.append(el('h2', '', title));
  items.forEach((f, i) => section.append(findingCard(f, offset + i, selectedId, total)));
  return section;
}

// --- Render

// Pet expression per status (UR-58); the text status says the same thing.
const MOOD = {
  'awaiting-dirty': 'thinking', 'awaiting-confirm': 'thinking', 'reading-context': 'thinking', 'initial-check': 'thinking', refining: 'thinking',
  'done-findings': 'alert', 'done-partial': 'alert', 'done-clean': 'happy',
  failed: 'worried', unvalidated: 'worried', cancelled: 'worried', stale: 'worried',
};

window.addEventListener('message', ({ data: s }) => {
  const saved = captureDrafts();
  document.body.classList.toggle('busy', s.running);
  document.body.classList.toggle('with-pet', s.showCompanion);
  document.body.dataset.mood = MOOD[s.phase] || 'idle';
  $('configure').textContent = s.configured ? s.model : 'Atur layanan & model';
  $('phase').textContent = s.phaseLabel;
  $('note').textContent = s.note;
  $('phase').className = `phase ${s.phase}`;
  if (document.activeElement !== intent) intent.value = s.intent;
  scope.value = s.scopeKind;
  depth.value = s.depth;
  /** @type {HTMLButtonElement} */ ($('run')).disabled = s.running;
  $('cancel').hidden = !s.running;
  $('support').textContent = s.support;
  $('usage').textContent = s.usage;

  const results = $('results');
  results.replaceChildren();
  const open = s.findings.filter(f => f.group === 'open');
  const answered = s.findings.filter(f => f.group === 'answered');
  const stale = s.findings.filter(f => f.group === 'stale');
  if (open.length) results.append(group('Perlu diperiksa', open, s.selectedId, 0, s.findings.length));
  if (answered.length) results.append(group('Sudah kamu tanggapi', answered, s.selectedId, open.length, s.findings.length));
  if (stale.length) results.append(group('Kedaluwarsa · kode sudah berubah', stale, s.selectedId, open.length + answered.length, s.findings.length));

  const dropped = /** @type {HTMLDetailsElement} */ ($('dropped'));
  dropped.hidden = !s.dropped.length;
  dropped.querySelector('summary').textContent = `Dugaan yang dibatalkan setelah diperiksa ulang (${s.dropped.length})`;
  $('droppedList').replaceChildren(...s.dropped.map(d => el('li', '', `${d.title} — ${d.reason}`)));

  const coverage = /** @type {HTMLDetailsElement} */ ($('coverage'));
  coverage.hidden = !s.coverage;
  const body = $('coverageBody');
  body.replaceChildren();
  if (s.coverage) {
    const c = s.coverage;
    body.append(
      el('p', '', `Cakupan: ${c.scope}`),
      el('p', '', `${c.changed}/${c.total} perubahan diperiksa · ${c.related} file konteks · ${c.deleted} file dihapus · ${c.diagnostics} diagnostics editor`),
      el('p', '', c.refinement),
    );
    if (c.rejected) {
      body.append(el('p', 'warn', `${c.rejected} temuan dari model dibuang karena tidak lolos pemeriksaan:`));
      const list = el('ul', 'warn');
      for (const r of c.rejections) list.append(el('li', '', `${r.title} — ${r.reason}`));
      body.append(list);
    }
    if (c.skipped.length) {
      body.append(el('p', '', 'Dilewati:'));
      const list = el('ul');
      for (const item of c.skipped) list.append(el('li', '', `${item.path} — ${item.reason}`));
      body.append(list);
    }
    if (c.notes.length) {
      const list = el('ul', 'muted');
      for (const note of c.notes) list.append(el('li', '', note));
      body.append(list);
    }
    if (s.phase === 'done-partial' || s.phase === 'unvalidated') coverage.open = true;
  }

  restoreDrafts(saved);
  if (s.selectedId) document.getElementById(`finding-${s.selectedId}`)?.scrollIntoView({ block: 'nearest' });
});

post({ type: 'ready' });
