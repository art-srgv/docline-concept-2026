/* Akte — the Desk's lab card, summoned over the Akte (one spatial model): floating .card, drag by header (translate only), close/Esc. */
(function () {
  const { D, esc, I } = AK; const P = D.patient;
  const host = document.getElementById('ak-float');
  const W = 520;
  let card = null, layer = null;

  function html(focus) {
    const draws = D.labs.draws; const latest = AK.latestDraw();
    const rows = AK.labRows(latest);
    const hero = rows.find((r) => r.flag) || rows[0];
    return `<div class="plate ak-lc">
      <header class="ak-lc-h" data-drag>
        ${window.UI.identity(P)}<span class="grow"></span>
        <button class="icon-btn" type="button" data-lc="close" aria-label="Schließen (Esc)">${I('x', 16)}</button>
      </header>
      <h3 class="ak-lc-t">Blutbefunde · <span class="tnum">${draws.map((d) => d.date.slice(0, 6)).join(' / ')}</span></h3>
      <div class="ak-lc-hero"><span class="n tnum">${window.UI.num(hero.v, hero.dec)}</span><span class="u">${esc(hero.unit)}</span><span class="k">${esc(hero.key)}</span>${window.UI.flag(hero.flag)}${hero.isNew ? '<span class="ak-new">neu</span>' : ''}<span class="grow"></span><button class="ak-lnk" type="button" data-lc="full">Befund ${AK.fmtDay(latest.date)} vollständig öffnen</button></div>
      ${window.UI.labCompare(D.labs.analytes, { dates: draws.map((d) => d.date), height: 118 })}
      <div class="ak-lc-tbl">${window.UI.labTable(rows, { trend: true })}</div>
      <footer class="ak-lc-f"><span class="src">${I('info', 13)}<span>${draws.length} Befunde · Laborschnittstelle + ELGA (seit 01/2026) · Duplikat zusammengeführt · ELGA kann unvollständig sein</span></span></footer>
    </div>`;
  }
  function slot() {
    const m = document.getElementById('ak-main').getBoundingClientRect();
    const saved = Shell.store.get('akte.labcard', null);
    if (saved && saved.x < innerWidth - 120 && saved.y < innerHeight - 80) return saved;
    const hgt = (card && card.offsetHeight) || 500;
    return { x: Math.round(m.right - W - 28), y: Math.round(Math.max(m.top + 6, Math.min(m.top + 56, innerHeight - 100 - hgt))) };   /* clear the floating toolbar pill when there is room, stay above the capsule */
  }
  function place(x, y) {
    const r = card.getBoundingClientRect();
    x = Math.max(-r.width + 120, Math.min(innerWidth - 120, x)); y = Math.max(0, Math.min(innerHeight - 48, y));
    card.style.translate = `${x}px ${y}px`; card._x = x; card._y = y;
  }
  function highlight(key) {
    if (!card) return; card.querySelectorAll('.ui-labs tbody tr').forEach((tr) => tr.classList.toggle('is-hl', !!key && key !== 'all' && tr.firstElementChild.textContent.trim() === key));
  }

  AK.openLabCard = (src, key) => {
    if (card) { highlight(key); Shell.motion.animate(card, [{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], { duration: 0.4, bounce: 0.1, fill: 'none' }); return; }
    card = document.createElement('article'); card.className = 'card ak-lcard'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Blutbefunde'); card.dataset.patient = P.id;
    card.innerHTML = html(key); host.appendChild(card);
    const s = slot(); place(s.x, s.y); highlight(key); Shell.sound.summon();
    let from = 'translate(24px, 0) scale(.92)';
    if (src && src.getBoundingClientRect) { const a = src.getBoundingClientRect(); const cx = s.x + W / 2, cy = s.y + card.offsetHeight / 2; from = `translate(${Math.round((a.left + a.width / 2 - cx) * 0.18)}px, ${Math.round((a.top + a.height / 2 - cy) * 0.18)}px) scale(.92)`; }
    Shell.motion.animate(card, [{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: 0.45, bounce: 0.1, fill: 'none' });
    layer = { close: close }; Shell.layers.push(layer);
    bind();
  };
  function close() {
    if (!card) return; const c = card; card = null; if (layer) Shell.layers.remove(layer); layer = null;
    c.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.96)' }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => c.remove());
  }
  AK.closeLabCard = close;

  function bind() {
    const c = card;
    c.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lc]'); if (!b) return;
      if (b.dataset.lc === 'close') close();
      if (b.dataset.lc === 'full') { close(); AK.goTarget('[data-day="d-2509"]'); }
    });
    const hd = c.querySelector('[data-drag]');
    let st = null;
    hd.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      st = { x: e.clientX, y: e.clientY, ox: c._x, oy: c._y, lx: e.clientX, t: performance.now(), moved: false };
      hd.setPointerCapture(e.pointerId);
    });
    hd.addEventListener('pointermove', (e) => {
      if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) < 4) return;
      if (!st.moved) { st.moved = true; Shell.dragging = true; c.classList.add('is-lift'); }
      const v = Math.max(-1, Math.min(1, (e.clientX - st.lx) / 12)); st.lx = e.clientX;
      c.style.setProperty('--tilt', (v * 3).toFixed(2) + 'deg');
      place(st.ox + dx, st.oy + dy);
    });
    const end = () => { if (!st) return; if (st.moved) { Shell.store.set('akte.labcard', { x: c._x, y: c._y }); c.classList.remove('is-lift'); c.style.setProperty('--tilt', '0deg'); } st = null; setTimeout(() => (Shell.dragging = false), 0); };
    hd.addEventListener('pointerup', end); hd.addEventListener('pointercancel', end);
  }
  window.addEventListener('resize', () => { if (card) place(card._x, card._y); });
})();
