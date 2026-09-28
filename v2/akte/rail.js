/* Akte — context rail (workflow layer): Offen · Werte (summons the lab card) · Medikation · Fällig & Schleifen · Aktivität (provenance). */
(function () {
  const { D, esc, I } = AK; const P = D.patient, DOC = D.practice.doctor;
  const el = document.getElementById('ak-rail');

  const TARGET = { o1: '[data-day="d-2509"]', p2: '[data-day="d-2509"]', o2: '[data-target="cave"]', o3: '[data-row="d-2506-2"]', p1: '[data-lane]', p3: '[data-row="t-ueb"]', p4: '[data-target="termin"]', fail: '[data-row="t-au"]', sign: '[data-row="t-rez"], [data-row="t-ueb"], [data-row="t-au"]' };

  /* Offen — like „Wartet auf Sie“: light big numbers per owner, then the list (meta line over the task, owner circle right) */
  function offen() {
    const items = AK.openItems(); const arzt = AK.isArzt(); const me = AK.me();
    const other = arzt ? D.practice.assistant.short : DOC.short;
    const openMine = items.filter((o) => !o.done && o.owner === me).length, openOther = items.filter((o) => !o.done && o.owner !== me).length;
    const done = items.filter((o) => o.done).length;
    const clinMine = items.some((o) => !o.done && o.owner === me && o.clinical);
    const mx = (n, l, d, cls = '') => `<div class="ak-mx-i"><span class="n tnum">${n}</span><span class="lt"><span class="l">${l}</span><span class="d ${cls}">${d}</span></span></div>`;
    return `<section class="ak-rc ak-rc-off" data-target="offen"><header class="ak-rc-h"><span class="ttl">Offen</span><span class="grow"></span><span class="rt">${arzt ? 'Arzt' : 'Assistenz'}</span></header>
      <div class="ak-mx">${mx(openMine, 'Bei Ihnen', clinMine ? 'klinisch' : AK.esc(me), clinMine ? 'is-warn' : '')}${mx(openOther, arzt ? 'Assistenz' : 'Arzt', AK.who(other))}${mx(done, 'Erledigt', 'heute', 'is-mute')}</div>
      <ul class="ak-off">${items.map((o) => {
        const mine = o.owner === me;
        /* one line per task, ellipsis at the card edge; the full text sits in the title */
        const full = AK.nb(esc(o.text)).replace(/&nbsp;·&nbsp;/g, ' <i class="sep">·</i> ');
        return `<li><button type="button" class="ak-off-i ${o.done ? 'is-done' : ''} ${o.fresh ? 'is-fresh' : ''} ${mine ? 'is-mine' : ''}" data-open="${esc(o.id)}" title="${esc(o.text)}">
          <span class="tx"><span class="s">${esc(o.state)}${o.due ? ` <i class="sep">·</i> ${AK.nb(esc(o.due))}` : ''}${!arzt && o.clinical && !o.done ? ` <i class="sep">·</i> bei ${esc(DOC.short)}` : ''}</span><span class="t">${o.done ? I('check', 16) : ''}<span class="tt">${full}</span></span></span>
          <span class="av ${o.owner === DOC.short ? '' : 'as'}" title="${esc(o.owner)}${mine ? ' · Ihre Aufgabe' : ''}">${esc(AK.ini(o.owner))}</span></button></li>`;
      }).join('')}</ul></section>`;
  }

  function werte() {
    const S = AK.S, post = S.mode === 'post';
    const latest = AK.labRows(AK.latestDraw());
    const by = (k) => latest.find((r) => r.key === k);
    const row = (r, extra) => {
      const delta = r.prev != null ? r.v - r.prev : null;
      const band = r.refMax != null ? r.refMax - (r.refMin || 0) : null;
      const trend = r.flag ? window.UI.flag(r.flag) : (delta != null && band && Math.abs(delta) / band >= 0.05 ? window.UI.trend(delta, r.dec) : '');
      return `<button type="button" class="ak-w" data-lab="${esc(r.key)}" title="Verlauf · ${esc(r.ref)} ${esc(r.unit)}">
        <span class="k">${esc(AK.short(r.key))}</span>
        <span class="v"><b class="tnum">${window.UI.num(r.v, r.dec)}</b> <span class="u">${esc(r.unit)}</span>${extra || ''}</span>
        <span class="f">${trend}</span>
        <span class="sp">${window.UI.sparkline(r.series.map((s) => ({ v: s.v, flag: s.flag })), { refMin: r.refMin, refMax: r.refMax, w: 65, h: 27 })}</span></button>`;
    };
    const krea = D.labs.analytes.find((a) => a.key === 'Kreatinin');
    const rrToday = D.vitals.find((v) => v.post), rrOld = D.vitals.find((v) => v.label === 'Blutdruck' && !v.post), wt = D.vitals.find((v) => v.label === 'Gewicht');
    /* today's RR exists only through the Status draft: tagged while it waits, plain once released,
       gone again if the doctor discards the draft or edits the value out (P7 / P11) */
    const sta = S.lane.drafts.sta;
    const rrLive = post && rrToday && sta && sta.state !== 'discarded' && String(sta.text).includes(rrToday.value);
    const rr = rrLive ? rrToday : rrOld;
    const rrDraft = rrLive && sta.state === 'pending';
    const vit = (v, tag) => `<div class="ak-w is-vit" title="${esc(v.label)} · ${esc(v.source)}"><span class="k">${esc(v.label === 'Blutdruck' ? 'RR' : v.label)}</span><span class="v"><b class="tnum">${esc(v.value)}</b> <span class="u">${esc(v.unit)}</span></span><span class="f"></span><span class="sp d tnum">${tag || esc(v.date === 'heute' ? 'heute' : AK.fmtDay(v.date))}</span></div>`;
    /* the flagged new value leads as a light big number, the rest stay compact rows */
    const hero = latest.find((r) => r.flag) || by('Ferritin');
    const heroHTML = `<button type="button" class="ak-w-hero" data-lab="${esc(hero.key)}" title="Verlauf · ${esc(hero.ref)} ${esc(hero.unit)}">
        <span class="n tnum">${window.UI.num(hero.v, hero.dec)}</span>
        <span class="lt"><span class="l">${esc(hero.key)} <span class="u">${esc(hero.unit)}</span></span><span class="d">${hero.flag ? `<span class="ak-warn-t">${hero.flag === 'L' ? 'erniedrigt' : 'erhöht'}${hero.isNew ? ' <i class="sep">·</i> neu' : ''}</span>` : ''}<span class="ref">Ref. ${esc(hero.ref)}</span></span></span>
        <span class="f">${window.UI.flag(hero.flag)}</span>
        <span class="sp">${window.UI.sparkline(hero.series.map((s) => ({ v: s.v, flag: s.flag })), { refMin: hero.refMin, refMax: hero.refMax, w: 64, h: 27 })}</span></button>`;
    return `<section class="ak-rc" data-target="werte"><header class="ak-rc-h ak-rc-h-w"><span class="ttl">Werte</span><span class="sub tnum">Labor ${AK.fmtDay(AK.latestDraw().date)}</span><span class="grow"></span><button type="button" class="ak-rc-go" data-lab="all">Verlauf</button></header>
      ${heroHTML}
      <div class="ak-ws">
        ${hero.key !== 'Ferritin' ? row(by('Ferritin')) : ''}
        ${row(by('Hämoglobin'))}
        ${row(by('Kreatinin'), krea.derived ? ` <span class="x">· ${esc(krea.derived.key)} <span class="tnum">${krea.derived.v}</span></span>` : '')}
        ${row(by('CRP'))}
        ${vit(rr, rrDraft ? `<span class="ak-kitag">${I('stars', 11)}KI-Entwurf</span>` : '')}
        ${vit(wt)}
      </div></section>`;
  }

  function medikation() {
    const S = AK.S, post = S.mode === 'post';
    const rx = AK.rxMed;
    const meds = D.medications.map((m) => {
      if (S.medStops[m.id]) return Object.assign({}, m, { post: S.medStops[m.id].label });
      return rx(m);
    });
    const forcePost = (m) => post || !!S.medStops[m.id];
    return `<section class="ak-rc" data-target="medis"><header class="ak-rc-h"><span class="ttl">Medikation</span><span class="n tnum">${meds.length}</span><span class="grow"></span><button type="button" class="ak-lnk" data-go="medikation">Alle</button></header>
      <div class="ak-meds">${meds.map((m) => window.UI.medRow(m, { post: forcePost(m) })).join('')}</div>
      <div class="ak-rc-hint">${AK.hint(post)}</div></section>`;
  }

  /* the stepper follows the latest e-Rezept of today: unsigned („Später“), storniert, or sent from the Akte */
  AK.rxMed = (m) => {
    const post = AK.S.mode === 'post';
    if (!m.chain) return m;
    const today = AK.todayRows().filter((r) => r.medId === m.id && (r.receipt === 'rez' || r.unsigned));
    const r = today.find((x) => x.id !== 't-rez') || today[0];
    if (!r) return m;
    const chain = Object.assign({}, m.chain), lastRx = Object.assign({}, m.lastRx), key = post ? 'post' : 'pre';
    if (AK.isStorno(r.id)) { chain[key] = -1; lastRx[key] = `heute ${r.time} · storniert ${AK.S.storno[r.id].at}`; }
    else if (r.unsigned) { chain[key] = 1; lastRx[key] = 'heute · Entwurf · Signatur offen'; }
    else if (r.state === 'pending') { chain[key] = 2; lastRx[key] = `heute ${r.time} · signiert · Übermittlung ausstehend`; }
    else { chain[key] = 3; lastRx[key] = `heute ${r.time} · übermittelt`; }
    return Object.assign({}, m, { chain, lastRx });
  };

  function faellig() {
    const IC = { Vorsorge: 'stethoscope', Impfung: 'shield', 'Überweisung': 'link' };
    const well = (k) => `<span class="ak-well">${I(IC[k] || 'calendar', 12)}</span>`;
    return `<section class="ak-rc"><header class="ak-rc-h"><span class="ttl">Fällig & Schleifen</span></header>
      <ul class="ak-due">${P.due.map((d) => `<li>${well(d.kind)}<span class="tx"><span class="kd">${esc(d.kind)}</span><span class="t">${AK.nb(esc(d.text))}</span></span></li>`).join('')}
      ${P.openLoops.map((l) => `<li><button type="button" class="ak-due-l" data-open="o3">${well(l.kind)}<span class="tx"><span class="kd">${esc(l.kind)} <i class="sep">·</i> <span class="ak-warn-t">offene Schleife</span></span><span class="t">${AK.nb(esc(l.text))}</span></span></button></li>`).join('')}</ul></section>`;
  }

  function aktivitaet() {
    const list = AK.activity();
    return `<section class="ak-rc" data-target="aktiv"><header class="ak-rc-h"><span class="ttl">Aktivität</span><span class="sub">Herkunft & Zugriffe</span></header>
      <ol class="ak-act">${list.map((a) => `<li><span class="t tnum">${esc(a.t)}</span><span class="x">${AK.nb(esc(a.text))}<span class="b">${AK.nb(esc(a.by))}</span></span></li>`).join('')}</ol>
      <div class="ak-elga"><span class="ak-well">${I('shield', 12)}</span><span>ELGA-Zugriffe unter ${AK.nb(esc(DOC.short))} protokolliert · für Patient einsehbar (§&nbsp;22 GTelG)</span></div></section>`;
  }

  function render() { el.innerHTML = `<div class="ak-rail-in">${offen()}${werte()}${medikation()}${faellig()}${aktivitaet()}</div>`; AK.S.tasks.forEach((t) => (t.fresh = false)); }
  AK.on('rail', render);
  /* the rail scrolls on its own; a short top fade once it moves, so cards never end in a hard cut under the toolbar line */
  el.addEventListener('scroll', () => el.classList.toggle('is-scrolled', el.scrollTop > 4), { passive: true });

  AK.goTarget = (sel) => {
    if (sel === '[data-target="cave"]') { const c = AK.$('.ak-banner'); AK.$('#ak-main').scrollTo({ top: 0, behavior: 'smooth' }); AK.flash(c); return; }
    const go = () => { const t = AK.$(sel); if (!t) return; AK.scrollTo(t, { offset: 64 }); AK.flash(t.closest('.ak-row, .ak-day, [data-lane]') || t); };
    if (AK.S.view !== 'kartei') { AK.setView('kartei'); AK.after(go); } else if (AK.filtersActive() || AK.S.filters.onlyOpen || AK.S.filters.q) { AK.S.filters = { types: null, problem: 'all', onlyOpen: false, q: '' }; AK.render(['toolbar', 'view']); AK.after(go); } else go();
  };
  el.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { const id = o.dataset.open; let sel = TARGET[id]; if (!sel && /^task/.test(id)) sel = '[data-day="d-2509"]'; if (id === 'p1') AK.toggleLane(true); if (sel) AK.goTarget(sel); return; }
    const l = e.target.closest('[data-lab]'); if (l) { AK.openLabCard(l, l.dataset.lab); return; }
    const g = e.target.closest('[data-go]'); if (g) AK.setView(g.dataset.go);
  });
})();
