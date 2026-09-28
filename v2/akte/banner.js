/* Akte — patient banner (identity + CAVE; collapses 92 → 60 px when the Kartei scrolls). view-transition-name: patient. */
(function () {
  const { D, esc, I } = AK; const P = D.patient;
  const el = document.getElementById('ak-banner');

  /* CAVE — outlined status pill: orange while not recorded (with one-click actions), neutral once recorded */
  function caveHTML() {
    const S = AK.S;
    if (S.cave === 'none') {
      const at = S.caveAt ? AK.todayShort : AK.fmtDay(P.cave.post.at);
      return `<span class="ak-cave is-ok" data-target="cave" title="erhoben ${esc(P.cave.post.at)} · ${esc(P.cave.post.by)}">${I('shield', 14)}<span>CAVE: ${esc(P.cave.post.label.replace(/^Keine/, 'keine'))} <i class="sep">·</i> <span class="tnum">${at}</span></span></span>`;
    }
    if (S.cave === 'entered') return `<span class="ak-cave is-warn" data-target="cave">${I('alert', 14)}<span>CAVE: ${esc(S.caveText)}</span></span>`;
    return `<span class="ak-cave is-warn" data-target="cave" title="CAVE: ${esc(P.cave.pre.label)}">${I('alert', 14)}<span class="lb">CAVE nicht erhoben</span>${AK.isArzt()
      ? `<span class="ak-cave-acts"><button type="button" data-bn="cave-none">Keine bekannt</button><button type="button" data-bn="cave-add">Eintragen …</button></span>` : ''}</span>`;
  }

  function render() {
    const S = AK.S, pre = S.mode === 'pre', arzt = AK.isArzt();
    const e = P.ecard, elga = P.elga, impf = elga.modules.find((m) => m.id === 'impf'), ap = P.appointment;
    const cons = D.consultation;
    const sl = '<i class="sl" aria-hidden="true">/</i>';
    const primary = pre
      ? (arzt ? `<button class="btn btn-primary ak-bn-go" type="button" data-bn="consult" title="Öffnet den Desk mit ${esc(P.name)} · dort mit ↵ starten (Identität bestätigen, Mitschrift)">Konsultation am Desk<span class="rt">${I('arrow-up-right', 16)}</span></button>` : '')
      : `<button class="ak-bn-cons" type="button" data-bn="today" title="Zur heutigen Konsultation">Konsultation <span class="tnum">${cons.start}–${cons.end}</span><span class="ok">${I('check', 14)}</span></button>`;
    el.innerHTML = `<div class="plate ak-bn">
      <span class="ak-bn-av">${AK.photo('cut')}</span>
      <div class="ak-bn-r1">
        <h1 class="ak-bn-name" data-private>${esc(P.name)}</h1>
        <span class="ak-bn-meta">
          <span>${P.age} J.</span>${sl}<span class="tnum">*${esc(P.dob)}</span>${sl}<span>${esc(P.sexLabel)}</span>${sl}<span class="tnum" title="Sozialversicherungsnummer">SV ${esc(P.svnr)}</span>${sl}<span class="ak-bn-car" title="${esc(P.carrier.long)} — ${esc(P.carrier.note)}">${esc(P.carrier.short)}</span><span class="ak-bn-fall">${sl}<span title="Behandlungsfall seit ${esc(P.fall.since)}">${esc(P.fall.code)} · ${esc(P.fall.label)}</span></span>
        </span>
        <span class="ak-bn-cave-c">${caveHTML()}</span>
      </div>
      <div class="ak-bn-r2 ${S.cave === 'missing' && arzt ? 'pre-cave' : ''}">
        <span class="ak-st ak-chk" title="${esc(e.source)} · gesteckt ${esc(e.time)} · ${esc(e.by)}">${I('check', 16)}<b>e-card</b><span class="d tnum">${esc(e.time)}</span></span>
        <span class="ak-st ak-chk" title="${esc(e.entitlement)} · ${esc(e.carrierConfirmed || P.carrier.short)} — e-card gesteckt ≠ Anspruch">${I('check', 16)}<b>Anspruch</b><span class="d">${esc(e.carrierConfirmed || P.carrier.short)}</span></span>
        <span class="ak-st ak-chk" title="${esc(elga.modules.map((m) => m.label + ' bis ' + m.until).join(' · '))}">${I('check', 16)}<b>ELGA</b><span class="d">bis <span class="tnum">${AK.fmtDay(elga.until)}</span><span class="ak-st-impf"> · e-Impfpass bis <span class="tnum">${AK.fmtDay(impf.until)}</span></span></span></span>
        ${caveHTML()}
        ${pre ? `<span class="ak-pill ak-st-wz" title="Termin ${esc(ap.time)} · ${esc(ap.reason)}">${AK.lbl(I('clock', 15), `Wartezimmer seit <span class="tnum">${esc(ap.arrived)}</span>`)}</span>` : ''}
        <span class="ak-st ak-st-dd" title="${esc(P.problems.map((p) => p.code + ' ' + p.label + ' (seit ' + p.since + ')').join(' · '))}">Dauerdiagnosen <b class="tnum">${P.problems.map((p) => p.code).join('</b> <i class="sep">·</i> <b class="tnum">')}</b></span>
        <span class="ak-st ak-st-mit" title="${esc(P.consent.note)} · ${esc(P.consent.by)} ${esc(P.consent.at)}">${esc(P.consent.label)}</span>
      </div>
      <div class="ak-bn-act">
        ${primary}
        <button class="btn btn-secondary ak-bn-termin" type="button" data-bn="termin">${I('calendar', 16)}Termin</button>
        <button class="ak-rnd" type="button" data-bn="more" aria-label="Weitere Aktionen">${I('more', 18)}</button>
        <button class="ak-rnd" type="button" data-bn="close" aria-label="Akte schließen (Esc)" title="Akte schließen · Esc">${I('x', 18)}</button>
      </div>
    </div>`;
  }
  AK.on('banner', render);

  /* ── actions ── */
  function setCaveNone() {
    const S = AK.S; S.cave = 'none'; S.caveAt = AK.clock();
    const row = { id: 'n-cave', day: 'today', k: 'cave', text: P.cave.post.label, detail: 'Pat. verneint', by: AK.me(), time: S.caveAt, state: 'done', doneLabel: 'gespeichert', fresh: true };
    S.added.push(row); const lg = AK.log('CAVE: keine bekannten Allergien erhoben');
    AK.render();
    Shell.undo({ text: 'CAVE: keine bekannten Allergien · gespeichert', seconds: 6, onUndo: () => { S.cave = 'missing'; S.caveAt = null; S.added = S.added.filter((r) => r !== row); AK.unlog(lg); AK.render(); } });
  }
  AK.setCaveNone = setCaveNone;
  function caveAdd(anchor) {
    const pop = Shell.popover(anchor, `<div class="ak-pop" style="width:320px"><div class="pop-lbl">CAVE eintragen</div>
      <label class="ak-fl"><span>Allergen / Unverträglichkeit</span><input class="ak-in" data-a placeholder="z. B. Wirkstoff"></label>
      <label class="ak-fl"><span>Reaktion</span><input class="ak-in" data-r placeholder="z. B. Exanthem"></label>
      <div class="ak-pop-f"><button class="btn btn-ghost btn-sm" type="button" data-x>Abbrechen</button><button class="btn btn-primary btn-sm" type="button" data-ok disabled>Speichern</button></div></div>`, { align: 'left' });
    const a = pop.el.querySelector('[data-a]'), r = pop.el.querySelector('[data-r]'), ok = pop.el.querySelector('[data-ok]');
    setTimeout(() => a.focus(), 30);
    const upd = () => (ok.disabled = !a.value.trim());
    a.oninput = upd; r.oninput = upd;
    pop.el.querySelector('[data-x]').onclick = pop.close;
    const save = () => { if (ok.disabled) return; const S = AK.S; S.cave = 'entered'; S.caveText = a.value.trim() + (r.value.trim() ? ' – ' + r.value.trim() : ''); AK.log('CAVE eingetragen: ' + S.caveText); pop.close(); AK.render(); };
    ok.onclick = save; pop.el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  }
  AK.caveAdd = caveAdd;
  function menu(anchor) {
    const pop = Shell.popover(anchor, `<div class="ak-menu" style="width:260px">
      <button type="button" data-m="stamm">${I('user', 15)}<span>Stammdaten</span></button>
      <button type="button" data-m="kopie">${I('file', 15)}<span>Patientenkopie<small>§ 51 ÄrzteG · vollständige Kartei inkl. Verlauf</small></span></button>
      <button type="button" data-m="print">${I('file', 15)}<span>Drucken</span></button></div>`);
    pop.el.onclick = (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return; pop.close();
      const m = b.dataset.m;
      if (m === 'kopie') Shell.notice({ text: 'Patientenkopie vorbereitet', detail: 'Kartei inkl. Korrekturen, Stornos und Herkunft — erste Kopie kostenlos', tone: 'ok', icon: 'file' });
      else Shell.notice({ text: m === 'stamm' ? 'Stammdaten' : 'Drucken', detail: 'Nicht Teil dieses Konzepts', tone: 'info' });
    };
  }
  function termin(anchor) {
    const pre = AK.S.mode === 'pre', t = AK.A.termin, ap = P.appointment;
    const body = pre || AK.removed('termin')
      ? `<div class="pop-row"><span class="grow"><b>Heute ${esc(ap.time)}</b> · ${esc(ap.reason)}<div class="sub">im Wartezimmer seit ${esc(ap.arrived)}</div></span></div>`
      : `<div class="pop-row"><span class="grow"><b>${esc(AK.swapDate(t.title))}</b><div class="sub">${esc(t.result)}</div></span></div>`;
    const pop = Shell.popover(anchor, `<div style="width:320px"><div class="pop-sec"><div class="pop-lbl">Termine · ${esc(P.name)}</div>${body}</div><div class="pop-sec"><div class="pop-row" data-new style="cursor:pointer">${I('calendar-plus', 15)}<span class="grow">Neuer Termin …</span></div></div></div>`);
    pop.el.querySelector('[data-new]').onclick = () => { pop.close(); Shell.notice({ text: 'Terminplanung', detail: 'Nicht Teil dieses Konzepts', tone: 'info' }); };
  }
  /* never leave the Akte with work that exists only in memory (composer text, a staged or transmitting document,
     an open Vidierung / Korrektur, a running storno) — say why and point at it instead */
  AK.dirty = () => {
    const S = AK.S, st = S.staged;
    if (st && st.phase === 'sending') return { text: `${st.type} wird gerade übermittelt`, detail: 'Akte bleibt offen bis zur Übermittlung · Stopp im Dokument', focus: 'staged' };
    if (Object.values(S.storno).some((x) => x.phase === 'sending')) return { text: 'Storno wird gerade übermittelt', detail: 'Akte bleibt offen bis zur Übermittlung', focus: 'storno' };
    if (st && !st.miss && st.phase !== 'sent') return { text: `${st.kind === 'req' ? 'Rezeptanfrage' : st.type} nicht ${st.kind === 'req' ? 'gesendet' : 'signiert'}`, detail: 'Erst abschließen oder verwerfen', focus: 'staged' };
    if (String(S.composer.text || '').trim()) return { text: 'Ungespeicherter Eintrag', detail: 'Erst speichern oder verwerfen', focus: 'composer' };
    if (S.editing) return { text: 'Korrektur nicht gespeichert', detail: 'Erst speichern oder abbrechen', focus: 'edit' };
    if (S.lane.editing) return { text: 'KI-Entwurf in Bearbeitung', detail: 'Erst fertig bearbeiten oder abbrechen', focus: 'lane' };
    if (S.vidOpen && !S.vid) return { text: 'Vidierung nicht abgeschlossen', detail: 'Erst vidieren oder abbrechen', focus: 'vid' };
    return null;
  };
  AK.closeAkte = () => {
    const d = AK.dirty();
    if (d) {
      Shell.notice({ text: d.text, detail: d.detail, tone: 'warn', icon: 'alert', ms: 2400 }); Shell.sound.warn();
      if (d.focus === 'composer' || d.focus === 'staged') AK.focusComposer({ scroll: true });
      else { const t = AK.$(d.focus === 'vid' ? '[data-vid]' : d.focus === 'edit' ? '.ak-row.is-editing' : d.focus === 'lane' ? '.ak-draft.is-edit' : '.ak-stn-send'); if (t) { AK.scrollTo(t, { offset: 120 }); AK.flash(t); } }
      return;
    }
    if (/desk\.html/.test(document.referrer) && history.length > 1) history.back(); else location.href = 'desk.html';
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bn]'); if (!b) return;
    const a = b.dataset.bn;
    if (a === 'cave-none') setCaveNone();
    else if (a === 'cave-add') caveAdd(b);
    else if (a === 'more') menu(b);
    else if (a === 'termin') termin(b);
    else if (a === 'close') AK.closeAkte();
    else if (a === 'today') { AK.setView('kartei'); AK.after(() => { const t = AK.$('[data-day="today"]'); AK.scrollTo(t, { offset: 56 }); AK.flash(t); }); }
    else if (a === 'consult') {
      /* the consultation runs on the Desk; identity check happens there at the moment of commit (P11):
         Desk K0 with the patient open → „Konsultation starten ↵“ → „Im Raum: … Bestätigt ↵“. The label says exactly that. */
      if (AK.dirty()) { AK.closeAkte(); return; }
      Shell.story.set({ consultation: 'not-started', later: false, eaumFailed: false }); location.href = 'desk.html#K0';
    }
  });

  /* ── collapse with scroll (hysteresis; keyboard jumps are not animated) ── */
  let collapsed = false;
  AK.bannerSync = (instant) => {
    const main = document.getElementById('ak-main'); const y = main.scrollTop;
    main.classList.toggle('is-scrolled', y > 4);
    const next = collapsed ? y > 24 : y > 64;
    if (next === collapsed) return;
    collapsed = next;
    if (instant || AK.kbdNav) { el.classList.add('no-anim'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('no-anim'))); }
    el.classList.toggle('is-collapsed', collapsed);
  };
  document.getElementById('ak-main').addEventListener('scroll', () => AK.bannerSync(), { passive: true });
})();
