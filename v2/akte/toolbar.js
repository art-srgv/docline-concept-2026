/* Akte — sticky toolbar pill: views · Filter · Nur Offene · search · quarter strip. Filters/tabs never animate. */
(function () {
  const { D, esc, I } = AK;
  const el = document.getElementById('ak-tb');

  AK.viewCounts = () => ({ kartei: AK.karteiCount(), medikation: D.medications.length, befunde: D.labs.draws.length, dokumente: D.documents.length });
  const VIEWS = [['kartei', 'Kartei'], ['medikation', 'Medikation'], ['befunde', 'Befunde'], ['dokumente', 'Dokumente']];

  AK.setView = (v) => { if (AK.S.view === v) return; AK.S.view = v; AK.render(['toolbar', 'view']); document.getElementById('ak-main').scrollTop = 0; };
  AK.filtersActive = () => { const f = AK.S.filters; return (f.types ? 1 : 0) + (f.problem !== 'all' ? 1 : 0); };

  function strip() {
    const S = AK.S, pre = S.mode === 'pre', P = D.patient;
    const diaToday = S.added.some((r) => r.day === 'today' && r.k === 'dia');
    const kg = !pre || diaToday;
    const lei = pre ? null : (AK.removed('leistungen') ? 1 : 0);
    return `<div class="ak-qs ${pre ? 'is-pre' : ''}" title="Quartal · Behandlungsfall · Abrechnung">
      <span class="q">${esc(D.now.quarter)}</span><span class="sep"></span>
      <span class="ak-qs-rf">${esc(P.fall.code)} seit <span class="tnum">${AK.fmtDay(P.fall.since)}</span></span><span class="sep ak-qs-rf"></span>
      <span class="ak-qs-k"><span class="tnum">${AK.contacts()}</span> Kontakte</span>
      ${lei != null ? `<span class="sep"></span><span class="ak-qs-l">Leistungen offen <span class="tnum">${lei}</span></span>` : ''}
      <span class="sep"></span>
      ${kg ? `<span class="ak-qs-ok">Kontaktgrund ${I('check', 13)}</span>` : `<span class="ak-qs-open"><i></i>Kontaktgrund heute: offen</span>`}
    </div>`;
  }

  function render() {
    const S = AK.S, f = S.filters, c = AK.viewCounts(), kar = S.view === 'kartei';
    const nf = AK.filtersActive(), open = AK.openCount();
    el.innerHTML = `<div class="ak-views" role="tablist">${VIEWS.map(([id, l]) => `<button type="button" role="tab" data-view="${id}" aria-selected="${S.view === id}">${l}<span class="n tnum">${c[id]}</span></button>`).join('')}</div>
      ${kar ? `<span class="ak-tb-sep"></span>
      <button class="ak-tbb ${nf ? 'is-on' : ''}" type="button" data-tb="filter" aria-haspopup="dialog">${I('filter', 14)}Filter${nf ? ` <span class="tnum">· ${nf}</span>` : ''}${I('chevron-down', 13)}</button>
      ${f.problem !== 'all' ? `<button class="ak-lens" type="button" data-tb="lens-clear" title="Linse ${esc(AK.problemLabel(f.problem))} · ${esc(f.problem)} — aufheben"><span class="lb">${esc(AK.problemShort(f.problem))}</span> <span class="tnum">${esc(f.problem)}</span>${I('x', 12)}</button>` : ''}
      <button class="ak-tbb ${f.onlyOpen ? 'is-on' : ''}" type="button" data-tb="open" aria-pressed="${f.onlyOpen}">Nur Offene <span class="tnum">(${open})</span></button>
      <div class="ak-search ${S.searchOpen || f.q ? 'is-open' : ''}">
        <button class="ak-tbb ak-search-b" type="button" data-tb="search" aria-label="In der Kartei suchen ( / )" title="Suchen · /">${I('search', 15)}</button>
        <input type="search" data-q placeholder="In der Kartei suchen" value="${esc(f.q)}" aria-label="In der Kartei suchen" autocomplete="off">
      </div>` : ''}
      <span class="ak-tb-fill"></span>
      ${strip()}`;
    /* with a lens pill the quarter strip sheds its secondary facts instead of clipping mid-token */
    el.classList.toggle('has-lens', kar && f.problem !== 'all');
    el.classList.toggle('has-search', kar && !!(S.searchOpen || f.q));
    const q = el.querySelector('[data-q]');
    if (q) {
      q.addEventListener('input', () => { AK.S.filters.q = q.value; AK.render(['view']); const n = AK.$$('#ak-view .ak-row:not([hidden]) mark').length; });
      q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); AK.S.filters.q = ''; AK.S.searchOpen = false; AK.render(['toolbar', 'view']); } if (e.key === 'Enter') { const m = AK.$('#ak-view mark'); if (m) AK.scrollTo(m.closest('.ak-row')); } });
      q.addEventListener('blur', () => { if (!q.value) { AK.S.searchOpen = false; setTimeout(() => AK.render(['toolbar']), 0); } });
    }
  }
  AK.on('toolbar', render);

  AK.openSearch = () => { AK.setView('kartei'); AK.S.searchOpen = true; render(); const q = el.querySelector('[data-q]'); q && q.focus(); };
  AK.setProblem = (code) => { AK.S.filters.problem = code; AK.render(['toolbar', 'view']); };

  function filterPop(anchor) {
    const S = AK.S, f = S.filters;
    const types = [...AK.kuerzel().map((k) => [k.k, AK.kLabel(k.k)]), ['lab', 'Laborbefund'], ['cave', 'CAVE']];
    const on = (k) => !f.types || f.types.includes(k);
    const pop = Shell.popover(anchor, `<div class="ak-pop ak-filter" style="width:392px">
      <div class="pop-lbl">Problem</div>
      <div class="seg ak-seg-w" role="group">${[['all', 'Alle'], ...AK.PROBLEMS.map((c) => [c, c])].map(([v, l]) => `<button type="button" data-p="${v}" aria-pressed="${f.problem === v}" title="${esc(v === 'all' ? 'Alle Einträge' : AK.problemLabel(v))}">${esc(l)}</button>`).join('')}</div>
      <div class="pop-lbl" style="margin-top:14px;display:flex">Eintragsarten<span style="flex:1"></span><button class="ak-lnk" type="button" data-all>Alle</button></div>
      <div class="ak-checks">${types.map(([k, l]) => `<label class="ak-check"><input type="checkbox" data-k="${k}" ${on(k) ? 'checked' : ''}><span class="k mono">${esc(k)}</span><span class="l">${esc(l)}</span></label>`).join('')}</div>
    </div>`, { align: 'left' });
    pop.el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-p]');
      if (p) { f.problem = p.dataset.p; pop.el.querySelectorAll('[data-p]').forEach((b) => b.setAttribute('aria-pressed', b === p)); AK.render(['view']); render(); return; }
      if (e.target.closest('[data-all]')) { f.types = null; pop.el.querySelectorAll('[data-k]').forEach((c) => (c.checked = true)); AK.render(['view']); render(); }
    });
    pop.el.addEventListener('change', (e) => {
      const all = [...pop.el.querySelectorAll('[data-k]')]; const sel = all.filter((c) => c.checked).map((c) => c.dataset.k);
      f.types = sel.length === all.length ? null : sel; AK.render(['view']); render();
    });
  }

  el.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]'); if (v) { AK.setView(v.dataset.view); return; }
    const b = e.target.closest('[data-tb]'); if (!b) return;
    const a = b.dataset.tb;
    if (a === 'filter') filterPop(b);
    else if (a === 'open') { AK.S.filters.onlyOpen = !AK.S.filters.onlyOpen; AK.render(['toolbar', 'view']); }
    else if (a === 'lens-clear') AK.setProblem('all');
    else if (a === 'search') AK.openSearch();
  });
})();
