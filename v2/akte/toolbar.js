/* Akte — sticky toolbar row: views pill (tabs · Kontaktgrund) · search · Alle/Offene · Filter. Filters/tabs never animate. */
(function () {
  const { D, esc, I } = AK;
  const el = document.getElementById('ak-tb');

  AK.viewCounts = () => ({ kartei: AK.karteiCount(), medikation: D.medications.length, befunde: D.labs.draws.length, dokumente: D.documents.length });
  const VIEWS = [['kartei', 'Kartei'], ['medikation', 'Medikation'], ['befunde', 'Befunde'], ['dokumente', 'Dokumente']];

  AK.setView = (v) => { if (AK.S.view === v) return; AK.S.view = v; AK.render(['toolbar', 'view']); document.getElementById('ak-main').scrollTop = 0; };
  AK.filtersActive = () => { const f = AK.S.filters; return (f.types ? 1 : 0) + (f.problem !== 'all' ? 1 : 0); };

  /* Kontaktgrund of today — the one billing fact the doctor must not forget, inside the views pill */
  function kgHTML() {
    const S = AK.S, pre = S.mode === 'pre';
    const kg = !pre || S.added.some((r) => r.day === 'today' && r.k === 'dia');
    return kg ? `<span class="ak-qs-ok" title="Kontaktgrund für heute erfasst">Kontaktgrund ${I('check', 20)}</span>` : `<span class="ak-qs-open" title="Pro Kontakttag ist ein Kontaktgrund (ICD) nötig"><i></i>Kontaktgrund heute: offen</span>`;
  }

  function render() {
    const S = AK.S, f = S.filters, c = AK.viewCounts(), kar = S.view === 'kartei';
    const nf = AK.filtersActive(), open = AK.openCount(), sOpen = !!(S.searchOpen || f.q);
    el.innerHTML = `<div class="ak-tbp">
        <div class="ak-views" role="tablist">${VIEWS.map(([id, l]) => `<button type="button" role="tab" data-view="${id}" aria-selected="${S.view === id}">${l}<span class="n tnum"><i class="sep">·</i> ${c[id]}</span></button>`).join('')}</div>
        <span class="ak-tb-fill"></span>
        ${kgHTML()}
      </div>
      ${kar ? `${f.problem !== 'all' ? `<button class="ak-lens" type="button" data-tb="lens-clear" title="Linse ${esc(AK.problemLabel(f.problem))} · ${esc(f.problem)} — aufheben"><span class="lb">${esc(AK.problemShort(f.problem))}</span> <span class="tnum">${esc(f.problem)}</span>${I('x', 12)}</button>` : ''}
      <div class="ak-search ${sOpen ? 'is-open' : ''}">
        <button class="ak-tbr ak-search-b" type="button" data-tb="search" aria-label="In der Kartei suchen ( / )" title="Suchen · /">${I('search', 18)}</button>
        <input type="search" data-q placeholder="In der Kartei suchen" value="${esc(f.q)}" aria-label="In der Kartei suchen" autocomplete="off">
      </div>
      <button class="ak-tbs ${f.onlyOpen ? 'is-on' : ''}" type="button" data-tb="scope" aria-haspopup="menu" title="Alle Einträge oder nur offene">${f.onlyOpen ? `Offene <span class="tnum">${open}</span>` : 'Alle'}${I('chevron-down', 16)}</button>
      <button class="ak-tbr ${nf ? 'is-on' : ''}" type="button" data-tb="filter" aria-haspopup="dialog" aria-label="Filter${nf ? ` · ${nf} aktiv` : ''}" title="Filter · Problem und Eintragsarten">${I('filter-lines', 18)}${nf ? `<span class="ak-tbr-n tnum">${nf}</span>` : ''}</button>` : ''}`;
    el.classList.toggle('has-search', kar && sOpen);
    const q = el.querySelector('[data-q]');
    if (q) {
      q.addEventListener('input', () => { AK.S.filters.q = q.value; AK.render(['view']); });
      q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); AK.S.filters.q = ''; AK.S.searchOpen = false; AK.render(['toolbar', 'view']); } if (e.key === 'Enter') { const m = AK.$('#ak-view mark'); if (m) AK.scrollTo(m.closest('.ak-row')); } });
      q.addEventListener('blur', () => { if (!q.value) { AK.S.searchOpen = false; setTimeout(() => AK.render(['toolbar']), 0); } });
    }
  }
  function scopePop(anchor) {
    const f = AK.S.filters, open = AK.openCount();
    const pop = Shell.popover(anchor, `<div class="ak-menu ak-scope" style="width:230px">
      <button type="button" data-s="all" aria-pressed="${!f.onlyOpen}">${f.onlyOpen ? '<span class="ak-ico-sp"></span>' : I('check', 15)}<span>Alle Einträge</span></button>
      <button type="button" data-s="open" aria-pressed="${f.onlyOpen}">${f.onlyOpen ? I('check', 15) : '<span class="ak-ico-sp"></span>'}<span>Nur Offene <span class="tnum">(${open})</span></span></button></div>`);
    pop.el.onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; pop.close(); AK.S.filters.onlyOpen = b.dataset.s === 'open'; AK.render(['toolbar', 'view']); };
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
    else if (a === 'scope') scopePop(b);
    else if (a === 'lens-clear') AK.setProblem('all');
    else if (a === 'search') AK.openSearch();
  });
})();
