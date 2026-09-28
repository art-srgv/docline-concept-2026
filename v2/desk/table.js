/* Desk table — the "table with dishes": card lifecycle (summon / morph / shelve / restore / close), drag with lift + tilt,
   transient alignment guides (⇧ = magnetic snap), key card (rim follows pointer), background tier, ornament, Ablage tray
   (Stage-Manager thumbnails, per-patient groups), Aufräumen (shelf-pack around the centroid), keyboard nudging.
   Positions use the CSS `translate` property only; `scale` + `opacity` for summon/tier; `transform` only for drag tilt. */
(function () {
  const DK = window.DK, S = window.Shell;
  const I = DK.I, esc = DK.esc;
  const GROUPS = { praxis: 'Praxis', demir: 'Ali Demir', hofbauer: 'Karin Hofbauer' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const T = (DK.table = {
    canvas: null, cards: {}, z: 20, key: null, orn: null, tray: null, guides: null,
    user: S.store.get('desk.layout', {}),      // geometry only — never patient data
    shelfOrder: 0,

    init(canvas) {
      this.canvas = canvas;
      this.orn = S.h(`<div class="dk-orn" role="toolbar" aria-label="Karte" hidden></div>`); document.body.appendChild(this.orn);
      this.tray = S.h(`<div class="dk-tray" aria-label="Ablage"><div class="dk-tray-pill"><span class="dk-tray-n" data-n>Ablage</span><button type="button" class="dk-tray-tidy" data-tidy>${I('layout', 14)}Aufräumen</button></div><div class="dk-stacks"></div></div>`);
      document.body.appendChild(this.tray);
      this.guides = S.h('<div class="dk-guides" aria-hidden="true"></div>'); document.body.appendChild(this.guides);
      this.tray.querySelector('[data-tidy]').onclick = () => S.intents.run('tidy');
      this.bindDrag(); this.bindKeys(); this.bindOrn(); this.loop();
    },
    onePatient() { const g = new Set(Object.values(this.cards).filter((c) => c.tier !== 'gone' && c.group !== 'praxis').map((c) => c.group)); return g.size <= 1; },
    get(id) { return this.cards[id]; },
    live(id) { const c = this.cards[id]; return !!c && (c.tier === 'fg' || c.tier === 'bg'); },
    fg() { return Object.values(this.cards).filter((c) => c.tier === 'fg'); },
    visible() { return Object.values(this.cards).filter((c) => c.tier === 'fg' || c.tier === 'bg'); },

    /* create (hidden) + render */
    ensure(id) {
      let c = this.cards[id];
      if (!c) {
        const def = DK.C[id];
        const el = S.h(`<article class="dk-card card" data-card="${id}" data-patient="${def.group}" tabindex="0" aria-label="${esc(DK.cardTitle(id))}"><div class="plate"><div class="dk-pad"></div></div></article>`);
        el.style.visibility = 'hidden';
        this.canvas.appendChild(el);
        c = this.cards[id] = { id, el, mode: '', x: 0, y: 0, w: 0, h: 0, tier: 'gone', pinned: !!def.pinned, group: def.group, touched: DK.st.cmd, fixedH: !!def.fixedH };
      }
      return c;
    },
    render(id, mode) {
      const c = this.ensure(id); if (mode !== undefined) c.mode = mode;
      c.el.querySelector('.dk-pad').innerHTML = DK.C[id].html(c.mode);
      c.el.classList.toggle('is-strip', c.mode === 'strip'); c.el.classList.toggle('is-full', c.mode === 'full');
      c.el.setAttribute('aria-label', DK.cardTitle(id));
      if (DK.onRender) DK.onRender(id, c);
      return c;
    },
    refresh() { Object.values(this.cards).forEach((c) => { if (c.tier !== 'gone' && !c.fixedH) this.render(c.id); }); this.renderTray(); },
    measure(id, w, mode) {
      const c = this.ensure(id); if (mode !== undefined && mode !== c.mode) this.render(id, mode); else if (!c.el.querySelector('.dk-pad').innerHTML) this.render(id);
      if (w) { c.el.style.width = w + 'px'; c.w = w; }
      if (!c.fixedH) c.el.style.height = '';
      return c.el.offsetHeight;
    },
    setBox(c, p) {
      c.x = Math.round(p.x); c.y = Math.round(p.y);
      if (p.w) { c.w = p.w; c.el.style.width = p.w + 'px'; }
      /* height: a number sets it (slot / cap), null returns to natural height, absent leaves it untouched (drag, tidy) */
      if (p.h) { c.h = p.h; c.el.style.height = p.h + 'px'; }
      else if (p.h === null && !c.fixedH) { c.el.classList.remove('is-capped'); c.el.style.height = ''; }
      c.el.style.translate = `${c.x}px ${c.y}px`;
    },
    /* a card whose content grew (full report, Vidieren panel …) never runs into the chip row / capsule:
       spring it up into the free band; taller than the band → cap the plate and let the content scroll inside. */
    fit(id, o = {}) {
      const c = this.cards[id]; if (!c || c.fixedH) return { y: c ? c.y : 0, h: null, capped: false };
      const g = DK.geom();
      const pad = c.el.querySelector('.dk-pad'), st = pad ? pad.scrollTop : 0;
      const explicit = !c.el.classList.contains('is-capped') && c.el.style.height ? parseFloat(c.el.style.height) : 0;   // slot height (e.g. strip, P hero column)
      c.el.classList.remove('is-capped'); c.el.style.height = '';
      const bottom = DK.bottomFor(c.x, c.w), top = DK.topFor(c.x, c.w);      // side wings may run lower (and higher) than centre cards
      const nat = Math.max(c.el.offsetHeight, explicit), band = bottom - top;
      if (explicit) c.el.style.height = nat + 'px';
      const capped = nat > band, h = capped ? band : nat;
      let y = c.y;
      if (y + h > bottom) y = Math.max(top, bottom - h);
      if (y < top - 16 && !o.keepTop) y = top;
      if (capped) {
        c.el.classList.add('is-capped'); c.el.style.height = h + 'px';
        if (pad) { pad.scrollTop = st; if (!pad._dkScroll) { pad._dkScroll = true; pad.addEventListener('scroll', () => c.el.classList.toggle('is-scrolled', pad.scrollTop > 2), { passive: true }); } c.el.classList.toggle('is-scrolled', pad.scrollTop > 2); }
      } else c.el.classList.remove('is-scrolled');
      if (o.noMove) y = c.y;
      if (!o.measureOnly && y !== c.y) {
        if (o.instant || DK.reduced()) this.setBox(c, { x: c.x, y });
        else this.morph(id, { x: c.x, y }, { spring: DK.spr.morph });
      }
      return { y, h: capped ? h : null, capped };
    },
    /* drag / nudge bounds: the header stays grabbable — never under the top navigation row (0–72),
       never under the capsule zone (bottom 150, centred 700 wide) */
    bound(c, x, y) {
      const W = innerWidth, H = innerHeight, cx = DK.geom().cx;
      x = clamp(x, 48 - c.w, W - 48); y = clamp(y, 72, H - 48);
      const headH = 44;
      if (x < cx + 350 && x + c.w > cx - 350 && y + headH > H - 150) y = H - 150 - headH;
      return { x: Math.round(x), y: Math.round(y) };
    },
    userPos(id) { const u = this.user[id]; if (!u) return u; const c = this.cards[id.split(':')[0]]; return c && c.w ? this.bound(c, u.x, u.y) : u; },
    saveUser(id) { const c = this.cards[id]; this.user[id + (c.mode ? ':' + c.mode : '')] = { x: c.x, y: c.y }; S.store.set('desk.layout', this.user); },
    clearUser() { this.user = {}; S.store.set('desk.layout', {}); },
    front(id) { const c = this.cards[id]; if (c) c.el.style.zIndex = ++this.z; },

    setTier(id, tier) {
      const c = this.cards[id]; if (!c) return;
      c.tier = tier;
      c.el.classList.toggle('is-bg', tier === 'bg');
      c.el.classList.toggle('is-shelved', tier === 'shelf');
      c.el.style.visibility = tier === 'fg' || tier === 'bg' ? '' : 'hidden';
      c.el.tabIndex = tier === 'fg' || tier === 'bg' ? 0 : -1;
    },
    setKey(id) {
      this.key = id && this.live(id) ? id : null;
      const fgc = this.fg();
      Object.values(this.cards).forEach((c) => { c.el.classList.toggle('is-key', c.id === this.key); c.el.classList.toggle('recede', !!this.key && c.id !== this.key && c.tier === 'fg' && fgc.length > 1 && !DK.st.noRecede); });
      if (this.key) this.front(this.key);
      this.renderOrn();
    },
    touch(id) { const c = this.cards[id]; if (c) c.touched = DK.st.cmd; },
    /* cards untouched for 3 commands drift silently to the background tier */
    drift() {
      this.fg().forEach((c) => { if (!c.pinned && c.id !== this.key && !c.fixedH && DK.st.cmd - c.touched >= 3) { this.setTier(c.id, 'bg'); } });
    },

    /* ── motion primitives ── */
    capRect() { const e = S.capsule && S.capsule.el; return e ? e.getBoundingClientRect() : { left: innerWidth / 2 - 260, top: innerHeight - 80, width: 520, height: 56 }; },
    async summon(id, p, delay = 0) {                                 // pinch-off out of the capsule
      const c = this.ensure(id); this.setBox(c, p); this.setTier(id, 'fg'); this.front(id);
      const h = c.el.offsetHeight, w = c.w, cr = this.capRect();
      const dx = cr.left + cr.width / 2 - (c.x + w / 2), dy = cr.top + cr.height / 2 - (c.y + h / 2);
      const pw = Math.min(w, 240), ph = 52;
      c.flying = true;
      await DK.anim(c.el, [
        { translate: `${c.x + dx}px ${c.y + dy}px`, scale: 0.92, opacity: 0, clipPath: `inset(${(h - ph) / 2}px ${(w - pw) / 2}px round 26px)` },
        { opacity: 1, offset: 0.16 },
        { translate: `${c.x}px ${c.y}px`, scale: 1, opacity: 1, clipPath: 'inset(0px 0px 0px 0px round 28px)' },
      ], { spring: () => S.motion.spring(0.62, 0.12), delay });
      c.flying = false;
    },
    async appear(id, p, delay = 0) {                                 // quiet in-place entrance (≥ .92, ≤ 420 ms)
      const c = this.ensure(id); this.setBox(c, p); this.setTier(id, 'fg');
      await DK.anim(c.el, [{ opacity: 0, scale: 0.96, translate: `${c.x}px ${c.y + 10}px` }, { opacity: 1, scale: 1, translate: `${c.x}px ${c.y}px` }], { spring: DK.spr.summon, delay });
    },
    async morph(id, p, o = {}) {
      const c = this.cards[id]; if (!c) return;
      const from = { x: c.x, y: c.y, h: c.el.offsetHeight }; this.setBox(c, p);
      if (from.x === c.x && from.y === c.y && !o.h) return;
      const kf = [{ translate: `${from.x}px ${from.y}px` }, { translate: `${c.x}px ${c.y}px` }];
      if (o.h) { kf[0].height = from.h + 'px'; kf[1].height = c.el.offsetHeight + 'px'; }
      await DK.anim(c.el, kf, { spring: o.spring || DK.spr.morph, delay: o.delay || 0 });
    },
    async close(id, animate = true) {
      const c = this.cards[id]; if (!c || c.tier === 'gone') return;
      c.tier = 'gone';
      if (animate && !DK.reduced()) await c.el.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.96 }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.catch(() => {});
      c.el.remove(); delete this.cards[id];
      if (this.key === id) this.setKey(null);
      this.renderTray(); this.renderOrn();
    },
    remove(id) { const c = this.cards[id]; if (!c) return; c.el.remove(); delete this.cards[id]; if (this.key === id) this.key = null; },
    async shelve(id, animate = true) {
      const c = this.cards[id]; if (!c || c.tier === 'shelf') return;
      const wasLive = this.live(id);
      c.shelfSeq = ++this.shelfOrder; c.tier = 'shelf';
      const thumb = this.renderTray(id);
      if (animate && wasLive && thumb && !DK.reduced()) {
        const r = thumb.getBoundingClientRect(), h = c.el.offsetHeight, s = 96 / c.w;
        const cs = getComputedStyle(c.el).scale; const sc = cs && cs !== 'none' ? parseFloat(cs) : 1;
        c.flying = true;
        await DK.anim(c.el, [
          { translate: `${c.x}px ${c.y}px`, scale: sc, opacity: 1 },
          { opacity: 1, offset: 0.55 },
          { translate: `${r.left + r.width / 2 - c.w / 2}px ${r.top + r.height / 2 - h / 2}px`, scale: s, opacity: 0 },
        ], { spring: DK.spr.shelf });
        c.flying = false;
      }
      this.setTier(id, 'shelf'); if (thumb) thumb.classList.add('in');
      if (this.key === id) this.setKey(null);
      this.renderOrn();
    },
    async restore(id, p, animate = true) {
      const c = this.cards[id]; if (!c) return;
      const thumb = this.tray.querySelector(`[data-thumb="${id}"]`);
      const r = thumb ? thumb.getBoundingClientRect() : null;
      if (p) this.setBox(c, p);
      this.setTier(id, 'fg'); this.front(id);
      this.renderTray();
      if (animate && r && !DK.reduced()) {
        const h = c.el.offsetHeight, s = 96 / c.w;
        c.flying = true;
        await DK.anim(c.el, [
          { translate: `${r.left + r.width / 2 - c.w / 2}px ${r.top + r.height / 2 - h / 2}px`, scale: s, opacity: 0 },
          { opacity: 1, offset: 0.35 },
          { translate: `${c.x}px ${c.y}px`, scale: 1, opacity: 1 },
        ], { spring: DK.spr.summon });
        c.flying = false;
      }
    },

    /* ── Ablage tray ── */
    renderTray(pendingId) {
      const wrap = this.tray.querySelector('.dk-stacks');
      const shelved = Object.values(this.cards).filter((c) => c.tier === 'shelf').sort((a, b) => a.shelfSeq - b.shelfSeq);
      const inConsult = DK.st.scene === 'C' || DK.st.scene === 'F';
      const cur = DK.st.patient;
      const groups = {};
      shelved.forEach((c) => {
        const hide = inConsult && c.group !== 'demir';               // privacy: other patients' / practice data stays hidden during the consultation
        if (!hide) (groups[c.group] = groups[c.group] || []).push(c);
      });
      const order = ['praxis', 'demir', 'hofbauer'].filter((g) => groups[g]);
      let pending = null;
      wrap.innerHTML = '';
      order.forEach((g) => {
        const list = groups[g];
        const st = S.h(`<div class="dk-stack ${g === cur || (g === 'praxis' && !cur) ? 'is-cur' : ''}" data-g="${g}" style="--n:${list.length}"><div class="dk-stack-cards"></div><span class="dk-stack-t" data-private>${esc(GROUPS[g])}<b class="tnum">${list.length}</b></span></div>`);
        const cc = st.querySelector('.dk-stack-cards');
        list.forEach((c, i) => {
          const th = S.h(`<button type="button" class="dk-thumb ${c.id === pendingId ? '' : 'in'}" data-thumb="${c.id}" style="--i:${i};--n:${list.length}" aria-label="${esc(DK.cardTitle(c.id))} zurückholen"><span class="dk-thumb-in"></span><span class="dk-thumb-l">${esc(DK.cardTitle(c.id))}</span></button>`);
          const inner = th.querySelector('.dk-thumb-in');
          const clone = c.el.querySelector('.plate').cloneNode(true); clone.setAttribute('inert', ''); clone.removeAttribute('id');
          const s = 96 / Math.max(1, c.w || 400);
          clone.style.width = c.w + 'px'; clone.style.height = (c.el.offsetHeight || 400) + 'px'; clone.style.transform = `scale(${s})`; clone.style.transformOrigin = '0 0';
          inner.appendChild(clone);
          th.onclick = (e) => { e.stopPropagation(); DK.restoreFromTray && DK.restoreFromTray(c.id); };
          cc.appendChild(th);
          if (c.id === pendingId) pending = th;
        });
        cc.style.width = (96 + (list.length - 1) * 12) + 'px';
        wrap.appendChild(st);
      });
      const n = order.reduce((s, g) => s + groups[g].length, 0);
      this.tray.querySelector('[data-n]').innerHTML = n ? `Ablage <b class="tnum">${n}</b>` : 'Ablage leer';
      this.tray.classList.toggle('is-empty', !order.length);
      this.tray.classList.toggle('no-tidy', this.fg().filter((c) => !c.pinned && !c.fixedH).length < 2);
      this.tray.hidden = !n && (DK.st.scene === 'P' || DK.st.scene === 'T1' || this.fg().filter((c) => !c.pinned && !c.fixedH).length < 2);
      return pending;
    },

    /* ── Aufräumen: deterministic shelf-pack of the foreground around its centroid. Never overlaps, never promotes a
       background card. Pinned cards stay. What does not fit beside the lead card steps back into a peeking stack
       behind it (least recently used first); what does not fit there either flies into the Ablage. ── */
    async tidy() {
      const g = DK.geom(), scene = DK.st.scene;
      if (scene === 'P' || scene === 'T1') return this.tidySlots();
      const pinned = this.fg().filter((c) => c.pinned && !c.fixedH);
      const loose = this.fg().filter((c) => !c.pinned && !c.fixedH);
      const bgs = this.visible().filter((c) => c.tier === 'bg' && !c.pinned && !c.fixedH).sort((a, b) => b.touched - a.touched);
      if (!loose.length) return;
      const gap = clamp(DK.kcols(g).gap, 16, 32);
      let L = g.L, R = g.R, anchorTop = null;
      pinned.forEach((p) => { if (p.x + p.w / 2 < g.cx) L = Math.max(L, p.x + p.w + gap); else R = Math.min(R, p.x - gap); if (anchorTop == null || p.y < anchorTop) anchorTop = p.y; });
      const hOf = (c) => c.el.offsetHeight;
      const lead = loose.find((c) => c.id === this.key) || [...loose].sort((a, b) => b.touched - a.touched || a.x - b.x)[0];
      const rank = [lead, ...loose.filter((c) => c !== lead).sort((a, b) => b.touched - a.touched || a.x - b.x)];
      const pack = (set, top) => {
        const items = [...set].sort((a, b) => a.x - b.x || a.y - b.y);
        const rows = []; let row = { items: [], w: 0, h: 0 };
        items.forEach((c) => { if (row.items.length && row.w + gap + c.w > R - L) { rows.push(row); row = { items: [], w: 0, h: 0 }; } row.items.push(c); row.w += (row.items.length > 1 ? gap : 0) + c.w; row.h = Math.max(row.h, hOf(c)); });
        rows.push(row);
        const blockW = Math.max(...rows.map((r) => r.w)), blockH = rows.reduce((s, r) => s + r.h, 0) + gap * (rows.length - 1);
        return { rows, blockW, blockH, fits: blockW <= R - L && (set.length === 1 || blockH <= g.bottom - top) };
      };
      const STACK = 44;                                               // room above the lead for a peeking background stack
      let keep = [lead], back = [];
      rank.slice(1).forEach((c) => { if (pack([...keep, c], g.safeTop).fits) keep.push(c); else back.push(c); });
      const top = g.safeTop;
      const P = pack(keep, top);
      /* place the block: top-aligned with the pinned anchor when there is one, else around the centroid */
      const cxm = keep.reduce((s, c) => s + c.x + c.w / 2, 0) / keep.length, cym = keep.reduce((s, c) => s + c.y + hOf(c) / 2, 0) / keep.length;
      const bx = clamp(cxm - P.blockW / 2, L, Math.max(L, R - P.blockW));
      const by = clamp(anchorTop != null ? anchorTop : cym - P.blockH / 2, top, Math.max(top, g.bottom - P.blockH));
      const moves = []; let y = by;
      P.rows.forEach((r) => { let x = bx + (P.blockW - r.w) / 2; r.items.forEach((c) => { moves.push([c, x, y]); x += c.w + gap; }); y += r.h + gap; });
      const leadAt = moves.find((m) => m[0] === lead);
      /* the foreground wins: the lead steps down just enough for a peeking stack above it — only when that neither pushes it
         into the chip band nor onto a card below it; otherwise the overflow goes to the Ablage */
      let stackRoom = false;
      if (back.length + bgs.length) {
        const ny = leadAt[2] + STACK, nb = ny + hOf(lead);
        const below = moves.filter((m) => m[0] !== lead && m[2] > leadAt[2] && m[1] < leadAt[1] + lead.w && m[1] + m[0].w > leadAt[1]);
        if (nb <= g.bottom && below.every((m) => nb + gap <= m[2])) { leadAt[2] = ny; stackRoom = true; }
      }
      /* background stack behind the lead: centred on it, each peeking 42 px (+14 per step) above its top edge */
      const stack = [...back.slice().reverse(), ...bgs];              // most recently used first
      const bgMoves = [], toShelf = [];
      stack.forEach((c, i) => {
        const h = hOf(c), s = 0.04;
        const vx = clamp(leadAt[1] + lead.w / 2 - c.w / 2, L - s * c.w, R - (1 - s) * c.w);
        const vy = leadAt[2] - 42 - i * 14 - s * h;
        const visTop = vy + s * h, visBot = vy + (1 - s) * h;
        if (stackRoom && i < 2 && visTop >= 76 && visBot <= g.bottom + 24) bgMoves.push([c, vx, vy]); else toShelf.push(c);
      });
      const jobs = [];
      let k = 0;
      moves.forEach(([c, x, yy]) => { jobs.push(this.morph(c.id, { x, y: yy }, { spring: DK.spr.tidy, delay: Math.min(k++, 4) * 40 })); this.saveUser(c.id); });
      bgMoves.forEach(([c, x, yy], i) => { this.setTier(c.id, 'bg'); c.el.style.zIndex = 12 - i; jobs.push(this.morph(c.id, { x, y: yy }, { spring: DK.spr.tidy, delay: Math.min(k++, 4) * 40 })); this.saveUser(c.id); });
      toShelf.forEach((c) => jobs.push(this.shelve(c.id, true)));
      this.front(lead.id);
      if (toShelf.length) S.notice({ text: `${toShelf.length === 1 ? '1 Karte' : toShelf.length + ' Karten'} in der Ablage`, detail: 'Passte nicht mehr auf den Tisch · ein Klick holt sie zurück', tone: 'info', icon: 'archive', ms: 2400 });
      await Promise.all(jobs);
      this.setKey(this.key && this.live(this.key) && this.cards[this.key].tier === 'fg' ? this.key : lead.id);
      this.renderTray();
    },
    /* P: the stage & wings are the tidy state — slots, symmetric about the capsule axis */
    async tidySlots() {
      const g = DK.geom();
      const ids = Object.values(this.cards).filter((c) => c.group === 'praxis' && this.live(c.id)).map((c) => c.id);
      ids.forEach((id) => { delete this.user[id]; }); S.store.set('desk.layout', this.user);
      const L = DK.layouts.P(g, (cid, w) => this.measure(cid, w));
      await Promise.all(ids.map((id, i) => { if (this.cards[id].tier === 'bg') this.setTier(id, 'fg'); return L[id] ? this.morph(id, L[id], { spring: DK.spr.tidy, delay: i * 40 }) : null; }));
      this.renderTray();
    },

    /* ── drag: header, pointer capture, 4 px threshold, lift + tilt, guides, ⇧ snap, clamp ── */
    bindDrag() {
      const cv = this.canvas; let d = null;
      cv.addEventListener('pointerdown', (e) => {
        const el = e.target.closest('.dk-card'); if (!el || e.button !== 0) return;
        const id = el.dataset.card, c = this.cards[id]; if (!c || c.flying) return;
        if (c.tier === 'bg') { this.setTier(id, 'fg'); }
        this.touch(id);
        if (id !== this.key && !DK.st.noKey) this.setKey(id); else this.front(id);
        if (e.target.closest('button, a, input, textarea, select, label, [data-act], .dk-lines')) return;
        const handle = e.target.closest('[data-drag]') || !e.target.closest('.plate');
        if (!handle) return;
        d = { id, c, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y, lx: e.clientX, ly: e.clientY, lt: performance.now(), rx: 0, ry: 0, on: false, pid: e.pointerId };
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      });
      cv.addEventListener('pointermove', (e) => {
        if (!d || e.pointerId !== d.pid) return;
        const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
        if (!d.on) { if (Math.hypot(dx, dy) < 4) return; d.on = true; S.dragging = true; d.c.el.classList.add('is-lifted'); document.body.classList.add('dk-dragging'); }
        const c = d.c;
        let { x, y } = this.bound(c, d.ox + dx, d.oy + dy);
        const snap = this.guideCheck(c, x, y, e.shiftKey); ({ x, y } = this.bound(c, snap.x, snap.y));
        this.setBox(c, { x, y });
        const now = performance.now(), dt = Math.max(8, now - d.lt);
        const vx = (e.clientX - d.lx) / dt, vy = (e.clientY - d.ly) / dt; d.lx = e.clientX; d.ly = e.clientY; d.lt = now;
        d.ry = d.ry * 0.7 + clamp(vx * 5, -3, 3) * 0.3; d.rx = d.rx * 0.7 + clamp(-vy * 5, -3, 3) * 0.3;
        c.el.style.transform = `perspective(1200px) rotateX(${d.rx.toFixed(2)}deg) rotateY(${d.ry.toFixed(2)}deg)`;
      });
      const end = (e) => {
        if (!d || (e && e.pointerId !== d.pid)) return;
        const c = d.c;
        if (d.on) { c.el.classList.remove('is-lifted'); c.el.style.transform = ''; this.saveUser(c.id); document.body.classList.remove('dk-dragging'); }
        S.dragging = false; this.guides.innerHTML = ''; d = null;
      };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      /* rim highlight follows the pointer on the key card only */
      let raf = 0, px = 0, py = 0;
      document.addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; DK.st.px = px; DK.st.py = py; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; const k = this.key && this.cards[this.key]; if (!k) return; const r = k.el.getBoundingClientRect(); const a = Math.atan2(py - (r.top + r.height / 2), px - (r.left + r.width / 2)) * 180 / Math.PI + 90 - 40; k.el.style.setProperty('--rim-angle', a.toFixed(1) + 'deg'); }); });
    },
    guideCheck(c, x, y, snap) {
      const others = this.visible().filter((o) => o !== c && o.tier === 'fg');
      const h = c.el.offsetHeight, tol = snap ? 8 : 2.5;
      const g = DK.geom();
      const xs = [], ys = [];
      others.forEach((o) => { const oh = o.el.offsetHeight; xs.push([o.x, o], [o.x + o.w / 2, o], [o.x + o.w, o]); ys.push([o.y, o], [o.y + oh / 2, o], [o.y + oh, o]); });
      xs.push([g.cx, null]);
      let bx = null, by = null;
      [[x, 0], [x + c.w / 2, 1], [x + c.w, 2]].forEach(([v]) => xs.forEach(([t, o]) => { const dd = t - v; if (Math.abs(dd) <= tol && (!bx || Math.abs(dd) < Math.abs(bx.d))) bx = { d: dd, t, o }; }));
      [[y, 0], [y + h / 2, 1], [y + h, 2]].forEach(([v]) => ys.forEach(([t, o]) => { const dd = t - v; if (Math.abs(dd) <= tol && (!by || Math.abs(dd) < Math.abs(by.d))) by = { d: dd, t, o }; }));
      if (snap) { if (bx) x += bx.d; if (by) y += by.d; }
      let html = '';
      if (bx && (snap || Math.abs(bx.d) <= 1.5)) { const o = bx.o; const top = o ? Math.min(y, o.y) : 72, bot = o ? Math.max(y + h, o.y + o.el.offsetHeight) : innerHeight - 150; html += `<i class="v ${o ? '' : 'axis'}" style="left:${Math.round(bx.t)}px;top:${top}px;height:${bot - top}px"></i>`; }
      if (by && (snap || Math.abs(by.d) <= 1.5)) { const o = by.o; const l = Math.min(x, o.x), r = Math.max(x + c.w, o.x + o.w); html += `<i class="h" style="top:${Math.round(by.t)}px;left:${l}px;width:${r - l}px"></i>`; }
      this.guides.innerHTML = html;
      return { x, y };
    },
    bindKeys() {
      this.canvas.addEventListener('keydown', (e) => {
        const el = e.target.closest && e.target.closest('.dk-card'); if (!el || e.target !== el) return;
        const c = this.cards[el.dataset.card]; if (!c) return;
        const step = e.shiftKey ? 10 : 1;
        const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (mv) { e.preventDefault(); e.stopPropagation(); this.setBox(c, this.bound(c, c.x + mv[0], c.y + mv[1])); this.saveUser(c.id); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); if (!c.pinned) { this.shelve(c.id); } else S.notice({ text: 'Angeheftet', detail: 'Die Patientenkarte bleibt, solange der Patient aktiv ist.', tone: 'info', ms: 2200 }); return; }
        if (e.key === 'Enter') { e.preventDefault(); if (c.tier === 'bg') this.setTier(c.id, 'fg'); this.setKey(c.id); }
      });
      this.canvas.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('.dk-card'); if (el && e.target === el && this.cards[el.dataset.card] && !DK.st.noKey) this.setKey(el.dataset.card); });
    },

    /* ── ornament (glass pill on the key card's bottom edge) ── */
    bindOrn() {
      this.orn.addEventListener('click', (e) => {
        const b = e.target.closest('[data-o]'); if (!b || !this.key) return;
        const id = this.key, c = this.cards[id];
        const o = b.dataset.o;
        if (o === 'pin') { c.pinned = !c.pinned; this.renderOrn(); S.notice({ text: c.pinned ? 'Angeheftet' : 'Nicht mehr angeheftet', detail: c.pinned ? 'Bleibt beim Aufräumen an seinem Platz.' : '', tone: 'info', ms: 1800 }); }
        if (o === 'back') { this.setTier(id, 'bg'); this.setKey(null); }
        if (o === 'shelf') { this.shelve(id); }
        if (o === 'close') { this.close(id); }
      });
    },
    renderOrn() {
      const c = this.key && this.cards[this.key];
      const show = !!c && c.tier === 'fg' && !DK.st.noKey;
      this.orn.hidden = !show; if (!show) return;
      const anchor = c.id === 'anchor' || c.id === 'anchor2';
      this.orn.innerHTML = anchor
        ? `<button type="button" data-o="back">${I('send-back', 14)}<span>Nach hinten</span></button>`
        : `<button type="button" data-o="pin" aria-pressed="${!!c.pinned}">${I('pin', 14)}<span>${c.pinned ? 'Angeheftet' : 'Anheften'}</span></button><button type="button" data-o="back">${I('send-back', 14)}<span>Nach hinten</span></button><button type="button" data-o="shelf">${I('archive', 14)}<span>Ablage</span></button><button type="button" data-o="close" aria-label="Schließen">${I('x', 14)}</button>`;
    },
    loop() {
      const tick = () => {
        const c = this.key && this.cards[this.key];
        if (c && !this.orn.hidden) {
          const r = c.el.getBoundingClientRect(), ow = this.orn.offsetWidth, oh = this.orn.offsetHeight || 36;
          /* the ornament rides the key card's bottom edge — flipped to its top edge when that would cross the chip row /
             capsule band (bottom 140 px), hidden when neither edge is free */
          let y = r.bottom - 14; const floor = innerHeight - 151;          // chip row starts at H − 147
          if (y + oh > floor && y + oh - floor <= 16) y = floor - oh;        // a few px: ride slightly higher on the edge
          else if (y + oh > floor) y = r.top - oh + 14;
          const off = y < 72 || y + oh > floor;
          this.orn.style.visibility = off ? 'hidden' : '';
          this.orn.style.translate = `${Math.round(r.left + r.width / 2 - ow / 2)}px ${Math.round(y)}px`;
          this.orn.classList.toggle('is-moving', !!c.flying || c.el.classList.contains('is-lifted'));
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
  });
})();
