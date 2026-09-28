/* Akte — staged Tier-3 cards from action Kürzel (rez / ueb / au) — same anatomy as the Freigabe cards:
   fields with provenance · Prüfen choices without default · UI.hold seal-and-send · hold-before-send bar (Stopp) → receipt row.
   Assistenz: rez becomes „Rezeptanfrage an Dr. Berger“ (request ≠ prescription, Tier 1 with undo). */
(function () {
  const { D, esc, I } = AK; const A = AK.A, P = D.patient, DOC = D.practice.doctor;
  const SEND_S = 5;
  let holdCtl = null;

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function findMed(text) {
    const n = Shell.norm(text).split(' ')[0]; if (!n || n.length < 3) return null;
    return D.medications.find((m) => m.status !== 'extern' && Shell.norm(m.name).startsWith(n)) || null;
  }

  /* a same-day document for the same thing already went out (or is waiting for Nacherfassung) → duplicate needs a decision */
  function todayDup(kind, match) {
    const hit = AK.todayRows().find((r) => r.receipt === kind && (r.state === 'sent' || r.state === 'pending') && !AK.isStorno(r.id) && match(r));
    if (!hit) return '';
    if (kind === 'rez') return `Heute ${hit.time} bereits verordnet${hit.rezId ? ' · ' + hit.rezId : ''}`;
    return `Heute ${hit.time} bereits erstellt${hit.detail && /gültig/.test(hit.detail) ? ' · ' + hit.detail : ''}`;
  }

  /* build a staged model from composer text (live while typing) */
  function model(k, text) {
    const S = AK.S, arzt = AK.isArzt();
    if (k === 'rez') {
      const m = findMed(text);
      if (!m) return text.trim().length >= 3 ? { kind: arzt ? 'rez' : 'req', miss: text.trim() } : null;
      if (!arzt) return { kind: 'req', med: m, title: `${m.name} ${m.strength}`, fields: [
        { label: 'Medikament', value: `${m.name} ${m.strength} ${m.form}`, prov: 'aus Akte' },
        { label: 'Dosierung', value: m.dose, prov: 'aus Akte' },
        { label: 'An', value: `${DOC.name} · zur Verordnung`, prov: 'Standard' } ] };
      const pack = AK.field('rezept', 'Packung'), abs = AK.field('rezept', 'ABS'), em = AK.field('rezept', 'e-Medikation');
      const dup = todayDup('rez', (r) => r.medId === m.id);
      return { kind: 'rez', med: m, icon: 'pill', type: 'e-Rezept', title: `${m.name} ${m.strength} ${m.form}`, dup, fields: [
        { label: 'Wirkstoff', value: m.name, prov: 'aus Akte' },
        { label: 'Stärke', value: m.strength, prov: 'aus Akte' },
        { label: 'Dosierung', value: m.dose, prov: 'aus Akte' },
        { label: 'Packung', value: null, prov: 'abgeleitet', choose: pack.choose, hint: 'Größe wählen' },
        { label: 'ABS', value: abs.value, prov: abs.prov },
        { label: 'e-Medikation', value: em.value, prov: em.prov, toggleOff: em.toggleOff } ] };
    }
    if (k === 'ueb') {
      const n = Shell.norm(text); if (n.length < 3) return null;
      const u = A.ueberweisung; const gastro = 'gastroenterologie'.startsWith(n.split(' ')[0]) || n.includes('gastro');
      const fr = AK.field('ueberweisung', 'Fachrichtung'), fq = AK.field('ueberweisung', 'Fragestellung'), gv = AK.field('ueberweisung', 'Gültigkeit');
      const dup = gastro ? todayDup('ueb', (r) => r.gastro) : '';
      /* provenance must be true at the moment it is shown: before the consultation there is no „Gespräch“ to cite */
      const ext = D.medications.find((x) => x.status === 'extern');
      const fqHint = S.mode === 'pre' ? `aus Befund ${AK.fmtDay(AK.latestDraw().date)}${ext ? ` + e-Medikation ${AK.fmtDay(ext.since)}` : ''}` : fq.hint;
      return { kind: 'ueb', icon: 'send', type: 'Überweisung', title: gastro ? u.title : cap(text.trim()), gastro, dup, fields: [
        { label: 'Fachrichtung', value: gastro ? fr.value : cap(text.trim()), prov: 'getippt' },
        gastro ? { label: 'Fragestellung', value: fq.value, prov: fq.prov, confirm: true, hint: fqHint } : { label: 'Fragestellung', value: '', prov: 'getippt', input: true },
        { label: 'Gültigkeit', value: gv.value, prov: gv.prov } ] };
    }
    if (k === 'au') {
      const e = A.eaum; const dm = text.match(/(\d{1,2})\.(\d{1,2})\.?/);
      const end = dm ? `${dm[1].padStart(2, '0')}.${dm[2].padStart(2, '0')}.` : null;
      const f = (l) => AK.field('eaum', l);
      /* Diagnose is „aus Akte“ only once today's Kontaktgrund exists (post, or a confirmed dia entry); before that it is derived and must be confirmed */
      const diaToday = S.added.find((r) => r.day === 'today' && r.k === 'dia' && r.code);
      const diag = S.mode === 'post' ? { label: 'Diagnose', value: f('Diagnose').value, prov: 'aus Akte' }
        : diaToday ? { label: 'Diagnose', value: `${diaToday.text} — nur an ${P.carrier.short}`, prov: 'aus Akte' }
        : { label: 'Diagnose', value: f('Diagnose').value, prov: f('Diagnose').prov, confirm: true, hint: 'Kontaktgrund heute noch offen' };
      return { kind: 'au', icon: 'file', type: 'eAUM · Krankenstand', title: `arbeitsunfähig ab ${AK.today}`, fields: [
        { label: 'Ende (voraussichtlich)', value: end, prov: end ? 'getippt' : 'abgeleitet', choose: end ? null : D.consultation.ambiguity.options.map((o) => o.label), hint: 'Datum wählen' },
        diag,
        { label: 'Ursache', value: null, prov: 'abgeleitet', choose: f('Ursache').choose },
        { label: 'Ausgehzeiten', value: null, prov: 'abgeleitet', choose: f('Ausgehzeiten').choose },
        { label: 'Arbeitgeber', value: f('Arbeitgeber').value, prov: f('Arbeitgeber').prov } ] };
    }
    return null;
  }

  AK.stage = (k, text) => {
    const S = AK.S; if (S.staged && ['signed', 'sending', 'stopped'].includes(S.staged.phase)) return;
    const m = model(k, text || '');
    if (!m) { if (S.staged) AK.unstage(); return; }
    const prev = S.staged;
    if (prev && prev.kind === m.kind && prev.title === m.title && !m.miss) { m.dupAck = prev.dupAck && !!m.dup; m.fields.forEach((f, i) => { const pf = prev.fields && prev.fields[i]; if (pf && pf.label === f.label) { f.chosen = pf.chosen; f.confirmed = pf.confirmed; f.off = pf.off; if (f.input) f.value = pf.value; } }); }
    m.phase = 'draft'; const isNew = !prev || prev.kind !== m.kind || !!prev.miss !== !!m.miss;
    S.staged = m; render(isNew);
  };
  AK.unstage = (force) => {
    const S = AK.S; if (!S.staged) return; if (!force && ['signed', 'sending', 'stopped'].includes(S.staged.phase)) return;
    const el = document.querySelector('#ak-staged .ak-stg'); S.staged = null; Shell.timers.clear('staged');
    if (el && !Shell.motion.reduced) el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px) scale(.98)' }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => render());
    else render();
  };

  const dupLabel = (m) => (m.kind === 'rez' ? 'Doppelverordnung' : 'Doppelüberweisung');
  const openFields = (m) => [
    ...(m.dup && !m.dupAck ? [{ label: dupLabel(m) }] : []),
    ...(m.kind === 'rez' && !m.miss && AK.S.cave === 'missing' ? [{ label: 'CAVE' }] : []),
    ...(m.fields || []).filter((f) => (f.choose && !f.chosen) || (f.confirm && !f.confirmed) || (f.input && !String(f.value || '').trim())),
  ];
  /* CAVE at the moment of commit (P11 / pin 1): the signer sees the allergy state next to the identity */
  function caveHTML(m) {
    const S = AK.S; if (m.kind !== 'rez' || m.phase === 'sent') return '';
    if (S.cave === 'missing') return `<div class="ak-stg-cave is-warn">${I('alert', 13)}<span class="t">CAVE nicht erhoben</span>${m.phase === 'draft' ? `<span class="a"><button type="button" data-s="cave-none">Keine bekannt</button><button type="button" data-s="cave-add">Eintragen …</button></span>` : ''}</div>`;
    if (S.cave === 'entered') return `<div class="ak-stg-cave is-warn">${I('alert', 13)}<span class="t">CAVE: ${esc(S.caveText)}</span></div>`;
    const at = S.caveAt ? AK.todayShort : AK.fmtDay(P.cave.post.at);
    return `<div class="ak-stg-cave">${I('shield', 13)}<span class="t">CAVE: ${esc(P.cave.post.label.replace(/^Keine/, 'keine'))} · <span class="tnum">${at}</span></span></div>`;
  }

  function fieldHTML(f, i, m) {
    const locked = m.phase !== 'draft';
    let val;
    if (f.choose) val = f.chosen && locked ? `<span class="v">${esc(f.chosen)}</span>`
      : `<div class="ak-prf" data-choose="${i}" role="group" aria-label="${esc(f.label)} wählen">${f.choose.map((c) => `<button type="button" data-s="choose" data-i="${i}" data-v="${esc(c)}" aria-pressed="${f.chosen === c}" ${locked ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>`;
    else if (f.input) val = `<input class="ak-in ak-in-sm" data-s="input" data-i="${i}" value="${esc(f.value || '')}" placeholder="Fragestellung (Pflicht)" ${locked ? 'disabled' : ''}>`;
    else val = `<span class="v ${f.off ? 'is-off' : ''}">${esc(f.off ? f.toggleOff : f.value)}</span>`;
    const confirm = f.confirm ? (f.confirmed ? `<span class="ak-cf">${I('check', 12)}bestätigt</span>` : `<button type="button" class="btn btn-secondary btn-sm ak-cfb" data-s="confirm" data-i="${i}" ${locked ? 'disabled' : ''}>Bestätigen</button>`) : '';
    const tog = f.toggleOff && !locked ? `<button type="button" class="ak-lnk" data-s="toggle" data-i="${i}">${f.off ? 'Doch speichern' : 'Nicht speichern'}</button>` : '';
    const prov = (f.choose && !f.chosen) || (f.confirm && !f.confirmed) ? window.UI.prov('abgeleitet') : (f.chosen ? `<span class="ui-prov">${I('check', 11)}gewählt</span>` : (f.confirm ? `<span class="ui-prov">${I('check', 11)}bestätigt</span>` : window.UI.prov(f.prov)));
    return `<div class="ak-fld ${(f.choose && !f.chosen) || (f.confirm && !f.confirmed) ? 'is-open' : ''}"><span class="lbl">${esc(f.label)}</span><div class="val">${val}${f.hint && ((f.choose && !f.chosen) || (f.confirm && !f.confirmed)) ? `<span class="hint">${esc(f.hint)}</span>` : ''}${confirm}${tog}</div><span class="pv">${prov}</span></div>`;
  }

  function sideHTML(m) {
    const req = m.kind === 'req';
    const idb = `<div class="ak-stg-top"><div class="ak-stg-who">${AK.photo('round')}<span><b data-private>${esc(P.name)}</b><span class="tnum">*${esc(P.dob)} <i class="sl">/</i> SV ${esc(P.svnr)}</span></span></div>${req ? '' : caveHTML(m)}</div>`;
    if (req) return `${idb}<p class="ak-stg-sn">Anfrage — kein Rezept. ${esc(DOC.short)} entscheidet und signiert.</p><button class="btn btn-primary ak-stg-go" type="button" data-s="send-req">${I('send', 15)}Anfrage senden</button>`;
    if (m.phase === 'sending') return `${idb}<div class="ak-hbs" data-hbs><span class="ak-hbs-l"><span>Wird übermittelt in <b class="tnum" data-hbs-n>${SEND_S}</b> s</span></span><span class="ak-hbs-fill" data-hbs-fill aria-hidden="true"><span class="ak-hbs-l"><span>Wird übermittelt in <b class="tnum" data-hbs-n2>${SEND_S}</b> s</span></span></span><button type="button" class="ak-hbs-stop" data-s="stop">Stopp</button></div><p class="ak-stg-sn">Signiert ${esc(m.signedAt)} · danach nur noch Storno</p>`;
    if (m.phase === 'stopped') return `${idb}<div class="ak-stopped">${window.UI.state('signed', 'nicht übermittelt')}</div><div class="ak-stg-row"><button class="btn btn-ghost btn-sm" type="button" data-s="discard">Verwerfen</button><button class="btn btn-primary btn-sm" type="button" data-s="resend">${I('send', 14)}Jetzt übermitteln</button></div>`;
    const open = openFields(m);
    const label = `${I('signature', 16)}Für ${esc(P.name)} signieren`;
    return `${idb}<button class="hold ak-stg-go" type="button" data-hold ${open.length && m.phase === 'draft' ? 'disabled' : ''}>${m.phase === 'signed' ? `${I('check', 16)}Signiert · <span class="tnum">${esc(m.signedAt)}</span>` : label}</button>
      <span class="ak-hold-h ${open.length && m.phase === 'draft' ? 'is-warn' : ''}">${open.length && m.phase === 'draft' ? `${I('alert', 12)}Noch ${open.length === 1 ? '1 Angabe' : open.length + ' Angaben'} offen: ${esc(open.map((f) => f.label).join(', '))}` : 'Halten zum Signieren<br>Touch ID · Windows Hello · o-card-PIN'}</span>`;
  }

  function cardHTML(m) {
    if (m.miss) return `<div class="ak-stg ak-stg-miss"><div class="ak-note">${I('search', 13)}„${esc(m.miss)}“ — kein Treffer in der Medikation von ${esc(P.name)} · Arzneimittelverzeichnis im Produkt (Demo: <button type="button" class="ak-lnk" data-s="demo-panto">Pantoprazol</button>)</div></div>`;
    const req = m.kind === 'req';
    return `<div class="ak-stg card ${req ? 'is-req' : ''}" data-phase="${m.phase}"><div class="plate ak-stg-p">
      <div class="ak-stg-h">
        <span class="ak-stg-ic">${I(req ? 'send' : m.icon, 16)}</span>
        <div class="ak-stg-tt"><div class="ak-stg-ty">${req ? `Rezeptanfrage an ${esc(DOC.short)}` : esc(m.type)} ${req ? window.UI.tier(1) : window.UI.tier(3)}<span class="st">${m.phase === 'draft' ? 'vorbereitet · nicht übermittelt' : m.phase === 'signed' ? 'signiert' : m.phase === 'sending' ? 'signiert · wird übermittelt' : m.phase === 'stopped' ? 'signiert · gestoppt' : ''}</span></div><div class="ak-stg-ti">${esc(m.title)}</div></div>
        <span class="grow"></span>
        ${m.phase === 'draft' ? `<button class="icon-btn" type="button" data-s="close" aria-label="Verwerfen">${I('x', 16)}</button>` : ''}
      </div>
      <div class="ak-stg-b">
        <div class="ak-stg-fl">${m.dup ? `<div class="ak-stg-dup ${m.dupAck ? 'is-ack' : ''}">${I(m.dupAck ? 'check' : 'alert', 13)}<span class="t"><b>${dupLabel(m)}</b> · ${esc(m.dup)}</span>${m.dupAck ? '<span class="ak-cf">bewusst bestätigt</span>' : `<button type="button" class="ak-dup-ok" data-s="dup-ack" ${m.phase !== 'draft' ? 'disabled' : ''}>Trotzdem ${m.kind === 'rez' ? 'verordnen' : 'überweisen'}</button>`}</div>` : ''}<div class="ak-flds">${m.fields.map((f, i) => fieldHTML(f, i, m)).join('')}</div></div>
        <div class="ak-stg-side">${sideHTML(m)}</div>
      </div>
    </div></div>`;
  }

  function render(enter) {
    const host = document.getElementById('ak-staged'); if (!host) return;
    const m = AK.S.staged; host.innerHTML = m ? cardHTML(m) : '';
    if (!m) return;
    const card = host.querySelector('.ak-stg');
    if (enter && !m.miss) Shell.motion.animate(card, [{ opacity: 0, transform: 'translateY(-8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 0.45, bounce: 0.1 });
    const hb = host.querySelector('[data-hold]');
    if (hb && m.phase === 'draft' && !hb.disabled) holdCtl = window.UI.hold(hb, { ms: 900, onDone: () => signed() });
    if (m.phase === 'sending') runSend();
  }
  AK.on('staged', () => render(false));

  /* „Jetzt signieren“ for a document left unsigned in the Freigabe — reuses the same staged card + seal-and-send */
  AK.signLater = (k) => {
    if (!AK.isArzt()) return;
    if (k === 'rez') AK.prefill('rez', 'pantoprazol 20');
    else if (k === 'ueb') AK.prefill('ueb', 'gastro');
    else if (k === 'au') AK.prefill('au', `bis ${AK.ambDate()}`);
  };

  function signed() {
    const m = AK.S.staged; if (!m) return; m.phase = 'signed'; m.signedAt = AK.clock(); Shell.sound.success();
    AK.log(`${m.type} ${m.title} signiert`);
    render(); Shell.timers.after(700, () => { if (AK.S.staged === m) { m.phase = 'sending'; render(); } }, 'staged');
  }
  function runSend() {
    const m = AK.S.staged; const fill = document.querySelector('[data-hbs-fill]'), n = document.querySelector('[data-hbs-n]');
    if (!fill) return;
    m.sendStart = m.sendStart || Date.now();
    const left = () => Math.max(0, SEND_S - (Date.now() - m.sendStart) / 1000);
    const n2 = document.querySelector('[data-hbs-n2]');
    const a = fill.animate([{ clipPath: `inset(0 ${(1 - left() / SEND_S) * 100}% 0 0 round 999px)` }, { clipPath: 'inset(0 100% 0 0 round 999px)' }], { duration: left() * 1000, easing: 'linear', fill: 'forwards' });
    const tick = () => { if (AK.S.staged !== m || m.phase !== 'sending') return; const l = left(); if (n) n.textContent = Math.ceil(l); if (n2) n2.textContent = Math.ceil(l); if (l <= 0) { sent(); return; } Shell.timers.after(200, tick, 'staged'); };
    tick(); m._anim = a;
  }
  function sent() {
    const S = AK.S, m = S.staged; if (!m) return; m.phase = 'sent';
    const ec = S.eaumFailed;
    let row;
    if (m.kind === 'rez') {
      const pack = m.fields.find((f) => f.label === 'Packung').chosen;
      /* a transmitted e-Rezept always carries its REZ-ID (issued by the e-card-System; demo: generated in the same 4-4-4 format) */
      const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', blk = () => Array.from({ length: 4 }, () => B32[Math.floor(Math.random() * B32.length)]).join('');
      const rezId = ec ? '' : `REZ-ID ${blk()}-${blk()}-${blk()}`;
      row = { k: 'rez', receipt: 'rez', medId: m.med.id, rezId, text: `${m.med.name} ${m.med.strength} · ${pack} · ${m.med.dose}`, detail: ec ? (A.rezept.failResult.split(' — ')[1] || A.rezept.failResult).split(' · ')[0] : rezId, state: ec ? 'pending' : 'sent', more: `${ec ? A.rezept.failResult : (AK.rezId ? A.rezept.result.split(AK.rezId).join(rezId) : `${rezId}`)} · ` + [m.dupAck ? `Doppelverordnung bewusst bestätigt (${m.dup})` : '', ...m.fields.map((f) => `${f.label}: ${f.off ? f.toggleOff : (f.chosen || f.value)}`)].filter(Boolean).join(' · ') };
    } else if (m.kind === 'ueb') {
      row = { k: 'ueb', receipt: 'ueb', gastro: !!m.gastro, text: m.title, detail: `gültig ${m.fields.find((f) => f.label === 'Gültigkeit').value}`, state: 'sent', more: `${m.dupAck ? `Doppelüberweisung bewusst bestätigt (${m.dup}) · ` : ''}Fragestellung: ${m.fields.find((f) => f.label === 'Fragestellung').value}` };
    } else {
      const end = m.fields[0].value || m.fields[0].chosen;
      row = { k: 'au', receipt: 'au', text: `${AK.todayShort}–${String(end).replace(/^[A-Za-z]{2} /, '')} (voraussichtlich) · an ${P.carrier.short}`, detail: 'Arbeitgeber-Bestätigung (ohne Diagnose) an Patient', state: ec ? 'pending' : 'sent', more: m.fields.map((f) => `${f.label}: ${f.chosen || f.value}`).join(' · ') };
    }
    Object.assign(row, { id: 'n-' + Date.now(), day: 'today', by: DOC.short, time: AK.clock(), fresh: true });
    /* signing a document that was left „Später in der Akte“ closes that obligation (the unsigned row gives way to the receipt) */
    if (AK.unsignedKinds().includes(m.kind) && (m.kind !== 'rez' || m.med.id === 'm1') && (m.kind !== 'ueb' || m.gastro)) S.laterDone[m.kind] = true;
    S.added.push(row);
    AK.log(`${m.type} ${ec && row.state === 'pending' ? 'signiert · Übermittlung ausstehend' : 'übermittelt'}`);
    Shell.sound.success();
    const el = document.querySelector('#ak-staged .ak-stg');
    const finish = () => { S.staged = null; AK.resetComposer(true); render(); AK.render(['timeline', 'toolbar', 'rail']); AK.refreshChips && AK.refreshChips(); };
    if (el && !Shell.motion.reduced) el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(8px) scale(.98)' }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(finish); else finish();
  }

  document.getElementById('ak-view').addEventListener('click', (e) => {
    const b = e.target.closest('[data-s]'); if (!b || !b.closest('#ak-staged')) return;
    const S = AK.S, m = S.staged; if (!m) return; const a = b.dataset.s, i = +b.dataset.i;
    if (a === 'choose') { m.fields[i].chosen = b.dataset.v; render(); const nx = document.querySelector('#ak-staged [data-choose] button:not([aria-pressed="true"])'); const hold = document.querySelector('#ak-staged .hold:not([disabled])'); (hold || nx) && (hold || nx).focus(); }
    else if (a === 'confirm') { m.fields[i].confirmed = true; render(); const hold = document.querySelector('#ak-staged .hold:not([disabled])'); hold && hold.focus(); }
    else if (a === 'toggle') { m.fields[i].off = !m.fields[i].off; render(); }
    else if (a === 'close' || a === 'discard') { if (a === 'discard') AK.log(`${m.type} ${m.title} verworfen · signiert, nie übermittelt`); AK.unstage(true); AK.resetComposer(true); if (a === 'discard') AK.render(['rail']); }
    else if (a === 'dup-ack') { m.dupAck = true; AK.log(`${dupLabel(m)} bewusst bestätigt · ${m.title}`); render(); const nx = document.querySelector('#ak-staged [data-choose] button, #ak-staged [data-s="confirm"], #ak-staged .hold:not([disabled])'); nx && nx.focus(); }
    else if (a === 'cave-none') { AK.setCaveNone && AK.setCaveNone(); const hold = document.querySelector('#ak-staged .hold:not([disabled])'); hold && hold.focus({ preventScroll: true }); }
    else if (a === 'cave-add') { AK.caveAdd && AK.caveAdd(b); }
    else if (a === 'stop') { m.phase = 'stopped'; if (m._anim) m._anim.cancel(); Shell.timers.clear('staged'); m.sendStart = null; AK.log(`${m.type} signiert · nicht übermittelt (gestoppt)`); render(); }
    else if (a === 'resend') { m.phase = 'sending'; m.sendStart = null; render(); }
    else if (a === 'demo-panto') AK.prefill('rez', 'pantoprazol 20');
    else if (a === 'send-req') {
      const row = { id: 'n-' + Date.now(), day: 'today', k: 'rez', text: `${m.title} · ${m.med.dose} · an ${DOC.short}`, by: AK.me(), time: AK.clock(), state: 'request', fresh: true };
      const task = { id: 'task-' + Date.now(), text: `Rezeptanfrage: ${m.title}`, owner: DOC.short, state: 'Wartet auf Arzt', due: 'heute', clinical: true, fresh: true };
      S.added.push(row); S.tasks.unshift(task); const lg = AK.log(`Rezeptanfrage an ${DOC.short} · ${m.title}`);
      S.staged = null; AK.resetComposer(true); render(); AK.render(['timeline', 'toolbar', 'rail']);
      Shell.undo({ text: `Rezeptanfrage an ${DOC.short} · ${m.title}`, seconds: 8, onUndo: () => { S.added = S.added.filter((r) => r !== row); S.tasks = S.tasks.filter((t) => t !== task); AK.unlog(lg); AK.render(['timeline', 'toolbar', 'rail']); } });
    }
  });
  document.getElementById('ak-view').addEventListener('input', (e) => {
    if (!e.target.matches('#ak-staged [data-s="input"]')) return; const m = AK.S.staged; m.fields[+e.target.dataset.i].value = e.target.value;
    const open = openFields(m); const hb = document.querySelector('#ak-staged [data-hold]');
    if (hb && hb.disabled !== !!open.length) { const pos = e.target.selectionStart; render(); const inp = document.querySelector('#ak-staged [data-s="input"]'); if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); } }
  });
})();
