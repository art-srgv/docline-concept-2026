/* Akte — view host: Kartei (composer + timeline) and the lighter views Medikation · Befunde · Dokumente (no animation on switch). */
(function () {
  const { D, esc, I } = AK; const P = D.patient, DOC = D.practice.doctor, A = AK.A;
  const host = document.getElementById('ak-view');

  function kartei() {
    if (!document.getElementById('ak-tl')) {
      host.innerHTML = `<div class="ak-kartei"><div id="ak-comp-host"></div><div class="ak-tl" id="ak-tl"></div></div>`;
      AK.render(['composer', 'staged', 'timeline']);
    } else AK.render(['timeline']);
  }

  /* ── Medikation ── */
  function medikation() {
    const S = AK.S, post = S.mode === 'post', arzt = AK.isArzt();
    const groups = [['Dauer', 'Dauermedikation'], ['Bei Bedarf', 'Bei Bedarf'], ['Extern', 'Extern · ELGA e-Medikation']];
    const row = (m0) => {
      const m = AK.rxMed ? AK.rxMed(m0) : m0;
      const stopped = S.medStops[m.id] ? S.medStops[m.id].label : (post && m.post ? m.post : null);
      const ext = m.status === 'extern';
      const steps = m.chain ? m.chain.steps : null; const at = m.chain ? (post ? m.chain.post : m.chain.pre) : -1;
      const editing = S.medEdit === m.id;
      return `<div class="ak-mrow ${stopped ? 'is-stopped' : ''} ${ext ? 'is-ext' : ''}" data-med="${m.id}">
        <div class="nm"><b>${esc(m.name)}</b> <span class="tnum">${esc(m.strength)}</span> <span class="f">${esc(m.form)}</span></div>
        <div class="ds tnum">${esc(m.dose)}</div>
        <div class="mt">${ext ? AK.lbl(I('database', 12), `${AK.nb(esc(m.source))} · <span class="tnum">${esc(AK.fmtDay(m.since))}</span>`) : `<span>seit <span class="tnum">${esc(m.since)}</span>${m.indication ? ` · ${esc(m.indication)}` : ''}</span>`}</div>
        <div class="stp">${steps ? `<div class="ak-steps">${steps.map((s, i) => `<span class="${i <= at ? 'on' : ''} ${i === at ? 'cur' : ''}">${esc(s)}</span>`).join('')}</div><div class="lr tnum">${esc(post ? m.lastRx.post : m.lastRx.pre)}</div>` : ''}${stopped ? `<div class="stop">${I('x', 12)}${esc(stopped)}</div>` : ''}</div>
        <div class="ac">${editing ? `<input class="ak-in ak-in-sm" data-mreason placeholder="Grund (Pflicht)" autocomplete="off"><button class="btn btn-primary btn-sm" type="button" data-m="stop-ok" disabled>Absetzen</button><button class="btn btn-ghost btn-sm" type="button" data-m="stop-x">Abbrechen</button>`
          : stopped ? `<button class="btn btn-ghost btn-sm" type="button" data-m="hist">Verlauf</button>`
          : arzt ? `${!ext ? `<button class="btn btn-secondary btn-sm" type="button" data-m="renew">${I('pill', 14)}Verlängern</button>` : ''}<button class="btn btn-ghost btn-sm" type="button" data-m="stop">Absetzen …</button>`
          : (!ext ? `<button class="btn btn-secondary btn-sm" type="button" data-m="request">${I('send', 14)}Rezeptanfrage</button>` : '')}</div>
      </div>`;
    };
    host.innerHTML = `<div class="ak-vw">
      <div class="ak-vw-hint">${AK.hint(post)}</div>
      ${groups.map(([g, l]) => { const ms = D.medications.filter((m) => m.group === g); return ms.length ? `<div class="ak-grp"><div class="ak-grp-h"><span class="eyebrow">${esc(l)}</span><span class="n tnum">${ms.length}</span></div><div class="ak-plate">${ms.map(row).join('')}</div></div>` : ''; }).join('')}
      <p class="ak-vw-foot">${I('info', 13)}Medikamente werden nie gelöscht — Absetzen mit Grund bleibt im Verlauf sichtbar.</p>
    </div>`;
  }

  /* ── Befunde: Eingang (states) vs Ausgestellt (signer · transmission · validity) ── */
  function befunde() {
    const S = AK.S, pre = S.mode === 'pre';
    const draws = D.labs.draws.slice().reverse();
    const inRow = (d) => {
      const latest = d.id === AK.latestDraw().id; const rows = AK.labRows(d);
      const fl = rows.filter((r) => r.flag);
      const state = latest ? (S.vid ? window.UI.state('reviewed', `${S.vid.by} · ${S.vid.at}`) : pre ? window.UI.state('unreviewed') : window.UI.state('discussed', AK.discussedAt))
        : `<span class="ak-done">${AK.lbl(I('check', 13), `vidiert <span class="tnum">${esc(AK.fmtDay(d.reviewed.at.split(' · ')[0]))}</span> · ${esc(d.reviewed.outcome)}`)}</span>`;
      const src = d.source.split(' — ')[0];
      return `<button type="button" class="ak-bf" data-bf="${d.id}">
        <span class="d tnum">${esc(d.date)}</span>
        <span class="t"><b>Laborbefund · ${esc(src.split(' · ')[0])}</b><span class="s">${rows.length} Werte${fl.length ? ` · ${fl.map((r) => `${esc(r.key)} ${window.UI.flag(r.flag)}`).join(' ')}` : ' · unauffällig'}</span></span>
        <span class="src">${/DaMe/.test(d.source) ? '<span class="ak-srcb">DaMe</span>' : ''}${/ELGA/.test(d.source) ? '<span class="ak-srcb">ELGA</span>' : ''}</span>
        <span class="st">${state}</span></button>`;
    };
    const out = [];
    AK.quarters().forEach((q) => q.days.forEach((day) => (day.rows || []).forEach((r) => {
      if (!['rez', 'ueb', 'au'].includes(r.k) || (r.state === 'request')) return;
      out.push({ date: day.id === 'today' ? AK.today : day.date.replace(/^[A-Za-z]{2} /, ''), r });
    })));
    const TYPE = { rez: 'e-Rezept', ueb: 'Überweisung', au: 'eAUM' };
    const outRow = ({ date, r }) => {
      const stn = AK.isStorno(r.id), stnSend = S.storno[r.id] && S.storno[r.id].phase === 'sending';
      const title = String(r.text).startsWith(TYPE[r.k]) ? r.text : `${TYPE[r.k]} ${r.text}`;
      const sys = stn ? `storniert ${S.storno[r.id].at} · Storno an e-card-System übermittelt`
        : r.unsigned ? 'vorbereitet in der Freigabe · nicht übermittelt'
        : r.system || (r.state === 'sent' ? `übermittelt${r.detail ? ' · ' + r.detail : ''}` : r.state === 'pending' ? r.detail : '');
      const valid = stn || r.unsigned ? '' : (String(r.detail || r.system || '').match(/gültig bis [0-9.]+/) || [''])[0];
      const today = date === AK.today;
      const st = stn ? `<span class="ak-stn">${I('x', 12)}storniert</span>` : stnSend ? `<span class="ak-uns">${I('clock', 12)}Storno läuft</span>`
        : r.unsigned ? `<span class="ak-uns">${I('signature', 12)}Signatur offen</span>`
        : r.loop ? window.UI.state('loop', 'kein Rückbefund') : r.state === 'pending' ? window.UI.state('pending') : today && r.state === 'sent' ? `<span class="ak-sent">${I('check', 13)}übermittelt</span>` : `<span class="ak-done">${I('check', 13)}${/eingelöst/.test(r.system || '') ? 'eingelöst' : 'übermittelt'}</span>`;
      return `<div class="ak-bf is-out ${stn ? 'is-storno' : ''}"><span class="d tnum">${esc(date.slice(0, 6))}</span><span class="t"><b>${AK.nb(esc(title))}</b><span class="s">${I('signature', 12)}${AK.nb(r.unsigned ? `unsigniert · im Posteingang ${esc(r.by)}` : `signiert ${esc(r.by)}`)}${sys ? ` · ${AK.nb(esc(sys.replace(/ · gültig bis [0-9.]+/, '')))}` : ''}</span></span><span class="src">${valid ? `<span class="ak-srcb">${esc(valid)}</span>` : ''}</span><span class="st">${st}</span></div>`;
    };
    host.innerHTML = `<div class="ak-vw ak-bfs">
      <div class="ak-grp"><div class="ak-grp-h"><span class="eyebrow">Eingang</span><span class="n tnum">${draws.length}</span><span class="grow"></span><span class="ak-note">Eingegangen ≠ gesehen ≠ erledigt</span></div><div class="ak-plate">${draws.map(inRow).join('')}</div></div>
      <div class="ak-grp"><div class="ak-grp-h"><span class="eyebrow">Ausgestellt</span><span class="n tnum">${out.length}</span><span class="grow"></span><span class="ak-note">Signiert · Übermittlung · Gültigkeit</span></div><div class="ak-plate">${out.map(outRow).join('')}</div></div>
    </div>`;
  }

  /* ── Dokumente ── */
  function dokumente() {
    host.innerHTML = `<div class="ak-vw"><div class="ak-grp"><div class="ak-grp-h"><span class="eyebrow">Dokumente</span><span class="n tnum">${D.documents.length}</span></div>
      <div class="ak-docs">${D.documents.map((d) => `<button type="button" class="ak-doc" data-doc="${d.id}">
        <span class="pg ${d.pages > 1 ? 'multi' : ''}" aria-hidden="true"><span class="hd"></span><i></i><i></i><i class="s"></i><span class="tb"><i></i><i></i><i></i><i></i></span><i></i><i class="s"></i></span>
        <span class="tt">${AK.nb(esc(d.title))}</span>
        <span class="mt"><span class="chip">${esc(d.type)}</span><span class="tnum">${esc(d.date)}</span></span>
        <span class="so">${I('database', 12)}${esc(d.source)} · ${d.pages} ${d.pages === 1 ? 'Seite' : 'Seiten'}</span></button>`).join('')}</div></div></div>`;
  }

  function render() {
    host.dataset.view = AK.S.view;
    ({ kartei, medikation, befunde, dokumente }[AK.S.view] || kartei)();
  }
  AK.on('view', render);

  host.addEventListener('click', (e) => {
    const S = AK.S;
    const bf = e.target.closest('[data-bf]'); if (bf) { AK.goTarget(`[data-day="${bf.dataset.bf === 'lab-2509' ? 'd-2509' : bf.dataset.bf === 'lab-1408' ? 'd-1408l' : 'd-1704'}"]`); return; }
    const dc = e.target.closest('[data-doc]'); if (dc) { Shell.notice({ text: 'Dokumentansicht', detail: 'Original-PDF · im Konzept nicht ausgearbeitet', tone: 'info' }); return; }
    const m = e.target.closest('[data-m]'); if (!m) return;
    const id = m.closest('[data-med]').dataset.med; const med = D.medications.find((x) => x.id === id);
    const a = m.dataset.m;
    if (a === 'renew') { AK.setView('kartei'); AK.after(() => AK.prefill('rez', `${med.name.toLowerCase()} ${med.strength.replace(/\s*mg/, '')}`)); }
    else if (a === 'request') { AK.setView('kartei'); AK.after(() => AK.prefill('rez', med.name.toLowerCase())); }
    else if (a === 'stop') { S.medEdit = id; render(); AK.after(() => { const i = AK.$('[data-mreason]'); i && i.focus(); }); }
    else if (a === 'stop-x') { S.medEdit = null; render(); }
    else if (a === 'stop-ok') { const why = AK.$('[data-mreason]').value.trim(); S.medStops[id] = { label: `abgesetzt · ${why} · ${AK.clock()} ${AK.me()}` }; S.medEdit = null; AK.log(`${med.name} abgesetzt · ${why}`); render(); AK.render(['rail']); }
    else if (a === 'hist') Shell.notice({ text: `${med.name} · Verlauf`, detail: (S.medStops[id] || {}).label || med.post || '', tone: 'info' });
  });
  host.addEventListener('input', (e) => { if (e.target.matches('[data-mreason]')) { const ok = AK.$('[data-m="stop-ok"]'); ok.disabled = e.target.value.trim().length < 3; } });
  host.addEventListener('keydown', (e) => { if (e.target.matches('[data-mreason]') && e.key === 'Enter') { const ok = AK.$('[data-m="stop-ok"]'); ok && !ok.disabled && ok.click(); } });
})();
