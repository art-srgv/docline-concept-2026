/* Akte — Kürzel composer: one 44 px line until focused (or N). Kürzel + Space switches type; dia → ICD suggestions (never auto-commit);
   action Kürzel rez/ueb/au stage a Tier-3 card (staged.js); date chip → Nachtrag with reason; Diktieren simulates live dictation. */
(function () {
  const { D, esc, I } = AK;
  const ACTIONS = ['rez', 'ueb', 'au'];
  const BAUSTEINE = ['Pat. aufgeklärt, einverstanden.', 'Befund mit Pat. besprochen.', 'Kontrolle bei Bedarf.'];
  let root = null, ta = null, sugg = [], suggI = 0, dictGen = 0;

  const allowed = (k) => AK.kuerzel().some((x) => x.k === k);
  const placeholder = () => {
    const k = AK.S.composer.k;
    if (k === 'rez') return AK.isArzt() ? 'Medikament … z. B. panto' : 'Medikament für die Rezeptanfrage …';
    if (k === 'ueb') return 'Fachrichtung … z. B. gastro';
    if (k === 'au') return 'Krankenstand bis … z. B. bis 06.10.';
    if (k === 'dia') return 'Diagnose in eigenen Worten … z. B. hexenschuss';
    return 'Eintrag schreiben … · Kürzel + Leertaste · / Textbausteine';
  };

  function build() {
    const host = document.getElementById('ak-comp-host'); if (!host) return false;
    if (host.firstChild && root && host.contains(root)) return true;
    host.innerHTML = `<div class="ak-comp" id="ak-comp">
      <div class="ak-comp-l">
        <button class="ak-kchip" type="button" data-c="k" aria-haspopup="listbox" title="Eintragsart (Kürzel)"></button>
        <textarea data-ci rows="1" spellcheck="false" aria-label="Kartei-Eintrag"></textarea>
        <div class="ak-comp-r">
          <button class="ak-cbtn" type="button" data-c="dict" title="Diktieren">${I('mic', 15)}<span>Diktieren</span></button>
          <button class="ak-cbtn ak-date" type="button" data-c="date" title="Datum · Nachtrag"></button>
          <button class="ak-cbtn ak-save" type="button" data-c="save" title="Speichern · ⌘↵"><span class="kbd">⌘↵</span></button>
        </div>
      </div>
      <div class="ak-sugg" data-sugg hidden></div>
      <div class="ak-comp-f"><span class="ak-note" data-cnote></span><span class="grow"></span><button class="btn btn-ghost btn-sm" type="button" data-c="cancel">Abbrechen</button><button class="btn btn-primary btn-sm" type="button" data-c="save">Speichern <span class="ak-kbd-in">⌘↵</span></button></div>
    </div><div id="ak-staged"></div>`;
    root = host.querySelector('#ak-comp'); ta = root.querySelector('[data-ci]');
    bind(); return true;
  }

  function sync() {
    if (!build()) return;
    const C = AK.S.composer, k = C.k;
    const kc = root.querySelector('.ak-kchip');
    kc.innerHTML = `<span class="k mono">${esc(k)}</span><span class="l">${esc(AK.kLabel(k))}</span>${I('chevron-down', 12)}`;
    kc.classList.toggle('is-act', ACTIONS.includes(k));
    ta.placeholder = placeholder();
    if (ta.value !== C.text) ta.value = C.text;
    const dt = root.querySelector('.ak-date');
    dt.innerHTML = C.nachtrag ? `${I('clock', 14)}<span>Nachtrag <span class="tnum">${esc(C.nachtrag.for.slice(0, 6))}</span></span>` : `${I('calendar', 14)}<span>Heute</span>`;
    dt.classList.toggle('is-on', !!C.nachtrag);
    root.classList.toggle('is-open', !!C.open || !!C.text);
    root.classList.toggle('is-action', ACTIONS.includes(k) || k === 'rez');
    /* dictation writes clinical text under the signer's name — absent in the Assistenz UI (§ 9 MABG), not greyed */
    root.querySelector('[data-c="dict"]').hidden = !AK.isArzt();
    note(); grow();
  }
  AK.on('composer', sync);

  function note() {
    const C = AK.S.composer, n = root.querySelector('[data-cnote]'); if (!n) return;
    let t = '';
    if (C.nachtrag) t = `${I('clock', 12)}Nachtrag für ${esc(C.nachtrag.for)} · Grund: ${esc(C.nachtrag.reason)} · beide Daten bleiben sichtbar`;
    else if (ACTIONS.includes(C.k) && AK.isArzt()) t = `${I('signature', 12)}Aktions-Kürzel · wird vorbereitet, erst Ihre Signatur übermittelt`;
    else if (C.k === 'rez') t = `${I('send', 12)}Anfrage an ${esc(D.practice.doctor.short)} — kein Rezept`;
    else if (C.k === 'dia') t = C.icd ? `${I('check', 12)}${esc(C.icd.code)} bestätigt · Kontaktgrund für heute` : `${I('info', 12)}Vorschlag mit ↵ bestätigen — wird nie automatisch übernommen`;
    else t = AK.lbl(I('pen', 12), `${esc(AK.kLabel(C.k))} · ${AK.nb(esc(AK.me()))} · <span class="tnum">${esc(AK.clock())}</span>`);
    n.innerHTML = t;
  }
  function grow() { if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(220, Math.max(24, ta.scrollHeight)) + 'px'; }

  AK.setKuerzel = (k) => {
    const C = AK.S.composer; if (!allowed(k)) return; C.k = k; C.icd = null; sync(); AK.stage && AK.stage(k, C.text);
    if (!ACTIONS.includes(k)) AK.unstage && AK.unstage();
  };
  AK.focusComposer = (o = {}) => {
    if (AK.S.view !== 'kartei') AK.setView('kartei');
    const C = AK.S.composer; C.open = true; sync();
    ta.focus({ preventScroll: true }); ta.setSelectionRange(ta.value.length, ta.value.length);
    if (o.scroll !== false) document.getElementById('ak-main').scrollTo({ top: 0, behavior: 'auto' });
  };
  AK.prefill = (k, text) => { const C = AK.S.composer; C.k = allowed(k) ? k : C.k; C.text = text; C.open = true; sync(); AK.focusComposer(); AK.stage && AK.stage(C.k, text); };
  function reset(kind) { const C = AK.S.composer; C.text = ''; C.icd = null; C.nachtrag = null; if (kind) C.k = AK.isArzt() ? 'dek' : 'not'; C.open = document.activeElement === ta; hideSugg(); sync(); }
  AK.resetComposer = reset;

  /* ── ICD suggestions (Codierservice style) ── */
  function icdFind(q) {
    const n = Shell.norm(q); if (n.length < 3) return [];
    return D.icd.filter((x) => Shell.norm(x.term).startsWith(n) || Shell.norm(x.label).includes(n) || x.code.toLowerCase().startsWith(n) || n.split(' ').some((w) => w.length >= 4 && Shell.norm(x.term).startsWith(w))).slice(0, 4);
  }
  function showSugg(list) {
    const box = root.querySelector('[data-sugg]'); sugg = list; suggI = 0;
    if (!list.length) { hideSugg(); return; }
    box.hidden = false;
    box.innerHTML = `<div class="ak-sugg-h"><span class="eyebrow">ICD-10-Vorschlag</span><span class="ak-note">Codierservice · ↵ bestätigen</span></div>` + list.map((x, i) => `<button type="button" class="ak-sugg-i ${i === 0 ? 'is-on' : ''}" data-si="${i}"><span class="l">${esc(x.label)}</span><span class="c tnum">${esc(x.code)}</span><span class="t">„${esc(x.term)}“</span></button>`).join('');
  }
  function hideSugg() { const box = root && root.querySelector('[data-sugg]'); if (box) { box.hidden = true; box.innerHTML = ''; } sugg = []; }
  function pickSugg(i) {
    const x = sugg[i]; if (!x) return; const C = AK.S.composer;
    C.icd = { code: x.code, label: x.label }; C.text = `${x.code} ${x.label}`; hideSugg(); sync(); ta.focus();
  }

  /* a signed document (signiert / wird übermittelt / gestoppt) can't be dropped from the composer — only Stopp or Verwerfen in the card */
  function lockedStage(quiet) {
    const st = AK.S.staged; if (!st || !['signed', 'sending', 'stopped'].includes(st.phase)) return false;
    if (!quiet) Shell.notice({ text: `${st.type} ist signiert`, detail: st.phase === 'sending' ? 'Stopp im Dokument hält die Übermittlung an' : 'Übermitteln oder Verwerfen im Dokument', tone: 'warn', ms: 2400 });
    return true;
  }

  /* ── save ── */
  function save() {
    const S = AK.S, C = S.composer; const text = (ta.value || '').trim();
    if (ACTIONS.includes(C.k) || (C.k === 'rez')) { const h = document.querySelector('#ak-staged .hold:not([disabled]), #ak-staged [data-s="send-req"]'); if (h) h.focus(); else Shell.notice({ text: 'Erst Angaben im vorbereiteten Dokument prüfen', tone: 'warn', ms: 2200 }); return; }
    if (!text) return;
    /* a Diagnose row is never committed without a confirmed ICD-10 code */
    if (C.k === 'dia' && !C.icd) {
      const s = icdFind(text);
      if (s.length) { showSugg(s); Shell.notice({ text: 'Bitte Diagnose-Code bestätigen', detail: 'ICD-10 je Kontakttag · ↵ übernimmt den Vorschlag', tone: 'info', ms: 2600 }); }
      else Shell.notice({ text: 'Diagnose ohne ICD-10-Code', detail: 'Vorschlag wählen oder als Notiz (not) speichern', tone: 'warn', ms: 2800 });
      ta.focus(); return;
    }
    const row = { id: 'n-' + Date.now(), day: C.nachtrag ? C.nachtrag.dayId : 'today', k: C.k, text, by: AK.me(), time: AK.clock(), fresh: true };
    if (C.icd) row.code = C.icd.code;
    if (C.nachtrag) row.nachtrag = { for: C.nachtrag.for, reason: C.nachtrag.reason };
    S.added.push(row);
    AK.log(`${AK.kLabel(C.k)}${C.nachtrag ? ' (Nachtrag ' + C.nachtrag.for.slice(0, 6) + ')' : ''} eingetragen`);
    const target = row.day;
    reset(true); ta.blur(); AK.S.composer.open = false; sync();
    AK.render(['timeline', 'toolbar', 'rail']);
    if (target !== 'today') AK.after(() => { const el = AK.$(`[data-row="${row.id}"]`); AK.scrollTo(el, { offset: 120 }); });
  }

  /* ── Nachtrag ── */
  function nachtragPop(anchor) {
    const days = D.record.flatMap((q) => q.days).filter((d) => d.kind !== 'labor').slice(0, 5);
    const C = AK.S.composer;
    const pop = Shell.popover(anchor, `<div class="ak-pop" style="width:340px"><div class="pop-lbl">Nachtrag für …</div>
      <div class="ak-radios">${days.map((d, i) => `<label class="ak-radio"><input type="radio" name="nt" value="${d.id}" data-for="${esc(d.date.replace(/^[A-Za-z]{2} /, ''))}" ${(C.nachtrag ? C.nachtrag.dayId === d.id : i === 0) ? 'checked' : ''}><span class="tnum">${esc(d.date)}</span><span class="m">${esc(d.title)} · ${esc(d.by || '')}</span></label>`).join('')}</div>
      <label class="ak-fl"><span>Grund des Nachtrags (Pflicht)</span><input class="ak-in" data-r value="${esc(C.nachtrag ? C.nachtrag.reason : '')}" placeholder="z. B. Telefonat nachgetragen" autocomplete="off"></label>
      <div class="ak-pop-f">${C.nachtrag ? '<button class="btn btn-ghost btn-sm" type="button" data-clear>Heute</button>' : ''}<span class="grow"></span><button class="btn btn-primary btn-sm" type="button" data-ok disabled>Übernehmen</button></div></div>`, { align: 'right' });
    const r = pop.el.querySelector('[data-r]'), ok = pop.el.querySelector('[data-ok]');
    const upd = () => (ok.disabled = r.value.trim().length < 3); r.oninput = upd; upd(); setTimeout(() => r.focus(), 30);
    const done = () => { if (ok.disabled) return; const sel = pop.el.querySelector('input[name="nt"]:checked'); C.nachtrag = { dayId: sel.value, for: sel.dataset.for, reason: r.value.trim() }; pop.close(); AK.focusComposer({ scroll: false }); };
    /* Enter confirms here — and must not travel on as a line break into the composer that takes focus next */
    ok.onclick = done; r.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
    const cl = pop.el.querySelector('[data-clear]'); if (cl) cl.onclick = () => { C.nachtrag = null; pop.close(); sync(); };
  }
  function kPop(anchor) {
    const list = AK.kuerzel();
    const pop = Shell.popover(anchor, `<div class="ak-klist" role="listbox" style="width:300px"><div class="pop-lbl" style="padding:6px 8px 4px">Kürzel · tippen + Leertaste</div>${list.map((x) => `<button type="button" role="option" data-k="${x.k}" class="${x.k === AK.S.composer.k ? 'is-on' : ''}"><span class="k mono">${esc(x.k)}</span><span class="l">${esc(AK.kLabel(x.k))}</span>${x.action && AK.isArzt() ? `<span class="a">${I('signature', 11)}Aktion</span>` : ''}</button>`).join('')}</div>`, { align: 'left' });
    pop.el.onclick = (e) => { const b = e.target.closest('[data-k]'); if (!b) return; pop.close(); AK.setKuerzel(b.dataset.k); AK.focusComposer({ scroll: false }); };
  }
  function bausteinPop() {
    const pop = Shell.popover(ta, `<div class="ak-klist" style="width:320px"><div class="pop-lbl" style="padding:6px 8px 4px">Textbausteine</div>${BAUSTEINE.map((b, i) => `<button type="button" data-b="${i}"><span class="l">${esc(b)}</span></button>`).join('')}</div>`, { align: 'left' });
    pop.el.onclick = (e) => { const b = e.target.closest('[data-b]'); if (!b) return; pop.close(); const C = AK.S.composer; C.text = BAUSTEINE[+b.dataset.b]; sync(); ta.focus(); };
  }

  /* ── dictation (simulated live transcription into the field) ── */
  /* what the doctor dictates depends on where the story is (never a second copy of a pending draft, never an exam before the exam):
     pre → a review note built from the Befund · post with the Status draft discarded → the Status dictation from the consultation ·
     post otherwise → the one Procedere item the Dekurs draft does not carry */
  function dictationText() {
    const S = AK.S, sta = S.lane.drafts.sta;
    if (S.mode === 'post') {
      if (sta && sta.state === 'discarded') { const l = D.consultation.transcript.find((t) => t.dictation); return l ? l.text : ''; }
      const f = D.consultation.transcript.flatMap((t) => t.facts || []).find((x) => x.group === 'Procedere' && /Bewegungsprogramm/.test(x.text));
      return f ? `${AK.kLabel('the')}: ${f.text}.` : '';
    }
    const draw = AK.latestDraw(), fl = AK.labRows(draw).find((r) => r.flag);
    return `Befund ${AK.fmtDay(draw.date)} gesichtet${fl ? `, ${fl.key} ${window.UI.num(fl.v, fl.dec)} ${fl.unit} ${fl.flag === 'L' ? 'erniedrigt' : 'erhöht'}` : ''}. Besprechung bei der Konsultation heute.`;
  }
  AK.dictate = async () => {
    if (!AK.isArzt()) return;
    const full = dictationText(); if (!full || lockedStage()) return;
    AK.unstage && AK.unstage();
    const g = ++dictGen; const C = AK.S.composer;
    AK.focusComposer(); C.k = 'dek'; C.icd = null; C.text = ''; sync();
    root.classList.add('is-dict'); Shell.mic.set('command'); Shell.sound.listen();
    const dbtn = root.querySelector('[data-c="dict"] span'); if (dbtn) dbtn.textContent = 'Diktat läuft';
    let out = '';
    const m = full.match(/^([A-ZÄÖÜa-zäöü]+):\s*/); const prefix = m ? m[0] : '';
    const hit = m ? D.kuerzel.find((x) => Shell.norm(x.label) === Shell.norm(m[1])) : null;
    for (let i = 0; i < full.length; i++) {
      if (g !== dictGen) return;
      out += full[i];
      if (hit && out === prefix && allowed(hit.k)) { C.k = hit.k; out = ''; sync(); }
      C.text = out; ta.value = out; grow();
      if (!Shell.motion.reduced) await Shell.sleep(22 + (full[i] === ' ' ? 18 : 0));
    }
    root.classList.remove('is-dict'); Shell.mic.set('ready'); Shell.sound.end(); if (dbtn) dbtn.textContent = 'Diktieren';
    note(); ta.focus();
  };
  const stopDict = () => { if (!root || !root.classList.contains('is-dict')) return; dictGen++; root.classList.remove('is-dict'); Shell.mic.set('ready'); const d = root.querySelector('[data-c="dict"] span'); if (d) d.textContent = 'Diktieren'; };

  function bind() {
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) { const si = e.target.closest('[data-si]'); if (si) pickSugg(+si.dataset.si); else if (!e.target.closest('textarea')) AK.focusComposer({ scroll: false }); return; }
      const c = b.dataset.c;
      if (c === 'k') kPop(b);
      else if (c === 'date') nachtragPop(b);
      else if (c === 'dict') { if (root.classList.contains('is-dict')) stopDict(); else AK.dictate(); }
      else if (c === 'save') save();
      else if (c === 'cancel') { if (lockedStage()) return; stopDict(); reset(true); AK.unstage && AK.unstage(true); ta.blur(); AK.S.composer.open = false; sync(); }
    });
    ta.addEventListener('focus', () => { AK.S.composer.open = true; root.classList.add('is-open'); note(); });
    ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta && !ta.value) { AK.S.composer.open = false; root.classList.remove('is-open'); } }, 120));
    ta.addEventListener('input', () => {
      const C = AK.S.composer; stopDict(); C.text = ta.value; grow();
      if (ta.value === '/' ) { C.text = ''; ta.value = ''; bausteinPop(); return; }
      if (C.k === 'dia') { C.icd = null; showSugg(icdFind(ta.value)); note(); }
      if (ACTIONS.includes(C.k)) AK.stage && AK.stage(C.k, ta.value);
    });
    ta.addEventListener('keydown', (e) => {
      const C = AK.S.composer;
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); return; }
      if (sugg.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); suggI = (suggI + (e.key === 'ArrowDown' ? 1 : -1) + sugg.length) % sugg.length; root.querySelectorAll('[data-si]').forEach((b, i) => b.classList.toggle('is-on', i === suggI)); return; }
      if (sugg.length && e.key === 'Enter') { e.preventDefault(); pickSugg(suggI); return; }
      if (e.key === 'Enter' && ACTIONS.includes(C.k) && !e.shiftKey) { e.preventDefault(); const f = document.querySelector('#ak-staged [data-choose] button, #ak-staged [data-s="confirm"], #ak-staged .hold:not([disabled]), #ak-staged [data-s="send-req"]'); f && f.focus(); return; }
      if (e.key === ' ' && ta.selectionStart === ta.value.length) {
        const v = ta.value.trim().toLowerCase();
        if (v && v === ta.value.toLowerCase() && D.kuerzel.some((x) => x.k === v)) {
          if (allowed(v)) { e.preventDefault(); C.text = ''; ta.value = ''; AK.setKuerzel(v); return; }
        }
      }
      if (e.key === 'Backspace' && !ta.value && C.k !== (AK.isArzt() ? 'dek' : 'not') && !C.nachtrag && !lockedStage(true)) { AK.setKuerzel(AK.isArzt() ? 'dek' : 'not'); AK.unstage && AK.unstage(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (sugg.length) { hideSugg(); return; } stopDict(); ta.blur(); if (!ta.value) { AK.S.composer.open = false; sync(); } }
    });
  }
})();
