/* Desk C — ambient consultation. One SimClock (rAF) owns simT; the view is a pure function of simT (only newcomers render).
   simT += min(dt,100) · speed / 1000 · 10  → 400 s consultation ≈ 40 s at 1×.
   Lines → highlight wipe on the span → a chip lifts off and flies into Erkannt (one flight at a time, queued 120 ms).
   Proposals appear in Vorschläge as prepared objects; nothing executes. One ambiguity chip resolves Termin + eAUM together. */
(function () {
  const DK = window.DK, S = window.Shell, UI = window.UI, D = DK.D, CD = D.consultation, T = DK.table;
  const I = DK.I, esc = DK.esc, mmss = DK.mmss;
  const ORDER = CD.transcript;
  const byId = (id) => ORDER.find((l) => l.id === id);

  const K = (DK.consult = {
    D: CD, raf: 0, last: 0, lastAdv: 0, lines: new Set(), facts: new Set(), props: [], queue: [], flying: false, silent: false, level: 0.15, speakUntil: 0,

    reset() {
      cancelAnimationFrame(this.raf); this.raf = 0; this.lines = new Set(); this.facts = new Set(); this.props = []; this.queue = []; this.flying = false; this.silent = false;
      document.querySelectorAll('.dk-fly').forEach((x) => x.remove());
      const box = this.el('[data-lines]', 'talk'); if (box) box.innerHTML = '';
      T.cards.facts && T.cards.facts.el.querySelectorAll('[data-fl]').forEach((u) => (u.innerHTML = ''));
      const pr = this.el('[data-props]', 'props'); if (pr) pr.innerHTML = '';
    },
    el(sel, id) { const c = T.cards[id]; return c ? c.el.querySelector(sel) : null; },

    /* start after identity check (or deep link) */
    start(o = {}) {
      this.reset();
      const st = DK.story; st.simT = o.t || 0; st.speed = st.speed || 1; st.paused = false;
      this.renderAll(st.simT);
      this.ambient();
      this.last = performance.now(); this.lastAdv = this.last;
      const tick = (now) => {
        const dt = Math.min(now - this.last, 100); this.last = now;
        const sp = st.paused ? 0 : st.speed;
        if (sp > 0 && st.simT < CD.durationSec) { st.simT = Math.min(CD.durationSec, st.simT + dt * sp / 1000 * 10); this.lastAdv = now; if (this.silent) { this.silent = false; this.ambient(); } }
        this.step(st.simT, false);
        if (!st.paused && !this.silent && now - this.lastAdv > 20000) { this.silent = true; this.ambient(); }
        this.meter(now);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    },
    startShadow() {},
    leave() { this.halt(); },
    halt() {
      cancelAnimationFrame(this.raf); this.raf = 0; this.queue = []; document.querySelectorAll('.dk-fly').forEach((x) => x.remove());
      if (S.capsule && S.capsule._amb) S.capsule.endAmbient();
      if (S.mic.get() === 'recording' || S.mic.get() === 'off') S.mic.set('ready');
    },
    stopCapture() { cancelAnimationFrame(this.raf); this.raf = 0; this.queue = []; if (S.capsule) S.capsule.endAmbient(); S.mic.set('ready'); },

    /* capsule + mic pill */
    ambient() {
      const st = DK.story;
      const label = this.silent ? `<b>Keine Sprache erkannt seit 20 s</b> · Mikrofon prüfen` : st.paused ? `<b>Pausiert</b> · ${esc(D.patient.name)} <span class="t">${mmss(st.simT)}</span>` : `<b>Hört mit</b> · ${esc(D.patient.name)} <span class="t">${mmss(st.simT)}</span>`;
      const actions = [];
      if (st.paused) actions.push({ label: 'Fortsetzen', icon: 'play', onClick: () => this.pause(false) });
      actions.push({ label: 'Konsultation beenden', primary: true, onClick: () => S.intents.run('end') });
      S.capsule.ambient({ label, actions, mic: this.micOpts() });
      S.capsule._ambLevel = st.paused ? 0 : 0.35;
      this.micPill(true);
    },
    micOpts() { return { time: mmss(DK.story.simT), onPause: () => this.pause(!DK.story.paused), onStop: () => S.intents.run('end') }; },
    micPill(force) {
      const t = mmss(DK.story.simT);
      if (!force && t === this._mt) return;
      /* never re-render the pill while the pointer is over the top-right cluster (keeps its buttons clickable) */
      if (!force && DK.st.py != null && DK.st.py < 72 && DK.st.px > innerWidth - 420) return;
      this._mt = t;
      if (DK.story.paused) S.mic.set('off'); else S.mic.set('recording', this.micOpts());
    },
    pause(on) {
      const st = DK.story; st.paused = on; this.lastAdv = performance.now(); this.silent = false; this.ambient(); DK.presenter && DK.presenter();
    },
    speed(x) { DK.story.speed = x; DK.presenter && DK.presenter(); },
    toEnd() { const st = DK.story; st.simT = CD.durationSec; this.queue = []; this.renderAll(st.simT); this.ambient(); },

    /* ── view = f(simT) ── */
    step(t, instant) {
      ORDER.forEach((l) => { if (l.t <= t && !this.lines.has(l.id)) this.addLine(l, instant); });
      const capT = S.capsule && S.capsule.el.querySelector('[data-amb] .t'); if (capT) capT.textContent = mmss(t);
      this.micPill(false);
    },
    renderAll(t) {
      if (!T.cards.talk) return;
      const lines = this.el('[data-lines]', 'talk'); if (lines) lines.innerHTML = '';
      T.cards.facts && T.cards.facts.el.querySelectorAll('[data-fl]').forEach((u) => (u.innerHTML = ''));
      this.lines = new Set(); this.facts = new Set(); this.props = []; this.queue = [];
      document.querySelectorAll('.dk-fly').forEach((x) => x.remove());
      ORDER.forEach((l) => { if (l.t <= t) this.addLine(l, true); });
      this.renderProps(); this.renderFactsMeta();
      const box = this.el('[data-lines]', 'talk'); if (box) box.scrollTop = box.scrollHeight;
    },
    lineHTML(l) {
      const who = CD.speakers[l.who];
      const ranges = (l.facts || []).map((f) => { const i = l.text.indexOf(f.span); return i >= 0 ? [i, i + f.span.length, f.id] : null; }).filter(Boolean).sort((a, b) => a[0] - b[0]);
      let out = '', at = 0;
      ranges.forEach(([a, b, id]) => { if (a < at) return; out += esc(l.text.slice(at, a)) + `<span class="dk-span" data-f="${id}">${esc(l.text.slice(a, b))}</span>`; at = b; });
      out += esc(l.text.slice(at));
      return `<div class="dk-line" data-l="${l.id}" data-who="${l.who}"><div class="dk-line-m"><b data-private>${esc(who)}</b><span class="mono tnum">${mmss(l.t)}</span>${l.dictation ? '<span class="dk-tag">Diktat</span>' : ''}</div><p class="dk-line-t">${out}</p></div>`;
    },
    addLine(l, instant) {
      this.lines.add(l.id);
      const box = this.el('[data-lines]', 'talk'); if (!box) return;
      const el = S.h(this.lineHTML(l)); box.appendChild(el);
      box.querySelectorAll('.dk-line.is-new').forEach((x) => x.classList.remove('is-new')); el.classList.add('is-new');
      if (!instant && !DK.reduced()) { box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }); DK.anim(el, [{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { spring: DK.spr.summon }); this.speakUntil = performance.now() + Math.min(2600, l.text.length * 38); }
      else box.scrollTop = box.scrollHeight;
      if (l.resolves) { DK.story.hintResolved = true; this.renderHint(!instant); }
      (l.facts || []).forEach((f) => { if (instant) { this.landFact(f, l, true); } else this.queue.push({ f, l }); });
      if (!instant) this.pump();
      (l.actions || []).forEach((a) => { if (!this.props.find((p) => p.id === a)) this.props.push({ id: a, t: l.t, line: l.id, fresh: !instant }); });
      if ((l.actions || []).length) { this.renderProps(!instant); }
    },

    /* ── facts: highlight wipe → lift-off → flight → land ── */
    factRow(f) {
      const hint = f.hint ? `<span class="dk-fact-hint" title="${esc(D.hint.text)}">${I('alert', 13)}</span>` : '';
      return S.h(`<li class="dk-fact" data-f="${f.id}">${hint}${DK.segT(f.text, 'dk-fact-t')}</li>`);
    },
    landFact(f, l, instant) {
      if (this.facts.has(f.id)) return null;
      this.facts.add(f.id);
      const ul = T.cards.facts && T.cards.facts.el.querySelector(`[data-g="${f.group}"] [data-fl]`); if (!ul) return null;
      const li = this.factRow(f); ul.appendChild(li);
      ul.closest('.dk-fg').classList.add('has');
      if (f.hint) this.renderHint(false);
      const sp = this.el(`.dk-span[data-f="${f.id}"]`, 'talk'); if (sp) sp.classList.add('used');
      this.renderFactsMeta();
      this.reveal(li);
      return li;
    },
    /* a list taller than its card scrolls to the newest fact; its cut edges fade instead of slicing a line */
    reveal(li) {
      const fx = li.closest('.dk-facts'); if (!fx) return;
      const r = li.getBoundingClientRect(), fr = fx.getBoundingClientRect();
      if (r.bottom > fr.bottom - 28) fx.scrollTop += r.bottom - fr.bottom + 28;
      else if (r.top < fr.top + 8) fx.scrollTop -= fr.top + 8 - r.top;
      this.fadeFacts();
    },
    fadeFacts() { DK.edgeFade(T.cards.facts && T.cards.facts.el.querySelector('.dk-facts')); },
    renderHint(animate) {
      const ul = T.cards.facts && T.cards.facts.el.querySelector('[data-g="Medikation"] [data-fl]'); if (!ul || !this.facts.has('f3')) return;
      let box = ul.querySelector('.dk-fhint'); if (!box) { box = S.h('<li class="dk-fhint"></li>'); ul.appendChild(box); }
      const res = !!DK.story.hintResolved;
      box.innerHTML = res ? `<div class="ui-hint resolved">${I('check-circle', 14)}<span><b>NSAR-Hinweis erledigt</b>\u00a0·\u00a0${mmss(DK.tOf('t5'))}</span></div>` : `<div class="ui-hint">${I('alert', 14)}<span><b class="dk-nw">${esc(DK.nsar())} gleichzeitig —</b> <span class="dk-nw">Entscheidung bei Ihnen</span></span></div>`;
      ul.closest('.dk-fg').classList.toggle('hint-res', res);
      box.classList.toggle('is-res', res);
      if (animate) DK.anim(box, [{ opacity: 0.2 }, { opacity: 1 }], { ms: 300 });
    },
    renderFactsMeta() { const m = T.cards.facts && T.cards.facts.el.querySelector('[data-fcount]'); if (m) m.textContent = this.facts.size ? `${this.facts.size} aus dem Gespräch` : 'wartet auf Gespräch'; },
    async pump() {
      if (this.flying || !this.queue.length) return;
      const gen = DK.st.gen;
      if (this.queue.length > 3) { while (this.queue.length > 1) { const j = this.queue.shift(); this.landFact(j.f, j.l, true); } }
      const job = this.queue.shift(); this.flying = true;
      await this.fly(job.f, job.l, gen);
      this.flying = false;
      if (!DK.alive(gen)) return;
      await DK.wait(120); if (!DK.alive(gen)) return;
      this.pump();
    },
    async fly(f, l, gen) {
      const sp = this.el(`.dk-span[data-f="${f.id}"]`, 'talk');
      if (!sp || DK.reduced()) { this.landFact(f, l, true); return; }
      sp.classList.add('wiped');
      await DK.wait(230); if (!DK.alive(gen)) return;
      const li = this.landFact(f, l, false); if (!li) return;
      li.style.opacity = '0';
      const a = sp.getBoundingClientRect(), b = li.getBoundingClientRect();
      const chip = S.h(`<div class="dk-fly">${f.hint ? I('alert', 12) : I('sparkles', 12)}<span>${esc(f.text)}</span></div>`);
      document.body.appendChild(chip);
      const cw = chip.offsetWidth, ch = chip.offsetHeight;
      const x0 = a.left + Math.min(0, a.width / 2 - cw / 2) + Math.max(0, (a.width - cw) / 2), y0 = a.top + a.height / 2 - ch / 2;
      const x1 = b.left - 8, y1 = b.top + b.height / 2 - ch / 2;
      chip.style.translate = `${x1}px ${y1}px`;
      const s = S.motion.spring(0.4, 0.1);
      await DK.anim(chip, [{ translate: `${x0}px ${y0 + 6}px`, scale: 0.92, opacity: 0 }, { translate: `${x0}px ${y0 - 10}px`, scale: 1.02, opacity: 1, offset: 0.18 }, { translate: `${x1}px ${y1}px`, scale: 1, opacity: 1 }], { easing: s.easing, ms: 380 + 120 });
      li.style.opacity = '';
      DK.anim(li, [{ opacity: 0 }, { opacity: 1 }], { ms: 180 });
      S.timers.after(900, () => sp.classList.remove('wiped'), 'desk-wait');
      chip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => chip.remove()).catch(() => chip.remove());
    },

    /* ── Vorschläge ── */
    propHTML(id, exp, fresh, noEv) {
      const a = DK.act(id), ev = a.evidence;
      const title = id === 'termin' ? DK.swapDate(a.title) : a.title;
      const quoted = ev.quote.startsWith('…') || ev.who === D.consultation.speakers.patient;
      const evq = quoted ? `„${esc(ev.quote)}“` : esc(ev.quote);
      const evidence = `<button type="button" class="dk-ev" data-ev="${ev.t}"><b class="dk-nw">${esc(ev.who)}</b>\u00a0·\u00a0${evq}\u00a0·\u00a0<span class="mono tnum">${mmss(ev.t)}</span></button>`;
      const state = id === 'termin' && DK.story.ambChosen ? UI.state('held') : '';
      if (exp === 'mini') return `<button type="button" class="dk-prop-mini ${fresh ? 'fresh' : ''}" data-p="${id}" data-ev-t="${ev.t}" title="${esc(title)} · ${esc(ev.who)} ${mmss(ev.t)}">${esc(a.type.split(' · ')[0])}<i class="dk-tdot t${a.tier}" aria-label="${a.tier === 3 ? 'Signatur' : 'Entwurf'}"></i></button>`;
      if (!exp) return `<article class="dk-prop is-compact ${fresh ? 'fresh' : ''}" data-p="${id}" data-ev-t="${ev.t}" title="${esc(title)}"><span class="dk-prop-ic">${I(a.icon, 14)}</span><span class="dk-prop-type">${esc(a.type)}</span><span class="dk-prop-t">${esc(id === 'termin' ? title.split(' · ').slice(0, 2).join(' · ') : title.split(' · ')[0])}</span>${UI.tier(a.tier)}</article>`;
      return `<article class="dk-prop ${fresh ? 'fresh' : ''}" data-p="${id}" data-ev-t="${ev.t}"><div class="dk-prop-h"><span class="dk-prop-ic">${I(a.icon, 15)}</span><span class="dk-prop-type">${esc(a.type)}</span>${state}${UI.tier(a.tier)}</div><p class="dk-prop-t">${esc(title)}</p>${this.preview(id)}${noEv ? '' : evidence}</article>`;
    },
    preview(id) {
      const a = DK.act(id), amb = DK.amb(), st = DK.story;
      const time = (a.title.match(/\d\d:\d\d/) || [''])[0];
      if (id === 'termin') {
        /* undecided: both readings stay candidates (dashed, violet) — the AI never shows its guess as a booking */
        if (!st.ambChosen) {
          const o = CD.ambiguity.options, iso = (x) => (x.id === 'tomorrow' ? '2026-09-29' : '2026-10-06');
          const today = DK.week('2026-09-28')[0];
          const cand = (x) => { const d = DK.week(iso(x)).find((w) => w.on); return `<span class="cand ${x.recommended ? 'rec' : ''}"><i>${d.n}</i><b class="tnum">${d.d}</b><em class="tnum">${esc(time)}</em></span>`; };
          const [c1, c2] = [...o].sort((x, y) => iso(x).localeCompare(iso(y)));
          return `<div class="dk-pv dk-pv-week is-amb" title="${esc(CD.ambiguity.heard)} — noch nicht entschieden"><span class="today"><i>${today.n}</i><b class="tnum">${today.d}</b><em>heute</em></span>${cand(c1)}<span class="gap" aria-hidden="true">···</span>${cand(c2)}</div>`;
        }
        const wk = DK.week(amb.iso);
        return `<div class="dk-pv dk-pv-week" title="${esc(a.detail)}">${wk.map((d) => `<span class="${d.on ? 'on' : ''}"><i>${d.n}</i><b class="tnum">${d.d}</b>${d.on ? `<em class="tnum">${esc(time)}</em>` : ''}</span>`).join('')}</div>`;
      }
      if (id === 'eaum') {
        const f = a.fields, dx = f.find((x) => x.linked) || f[1];
        const code = (String(dx.value).match(/^[A-Z]\d+(\.\d+)?/) || [''])[0];
        const end = st.ambChosen ? `<b class="tnum">${esc(DK.tx(DK.swapDate(f[0].value).replace(/^\D+/, '').replace(/\d{4}$/, '')))}</b>` : `<b class="tnum dk-ambq" title="${esc(CD.ambiguity.heard)} — noch nicht entschieden">${esc(DK.tx(DK.amb().recommended.label.replace(/^\D+/, '')))}<span>?</span></b>`;
        return `<div class="dk-pv dk-pv-form"><div><i>AU ab</i><b class="tnum">${esc(DK.short(a.title.match(/\d\d\.\d\d\.\d{4}/)[0]))}</b></div><div><i>bis vsl.</i>${end}</div><div><i>Diagnose</i><b class="tnum">${esc(code)}</b></div><div><i>Ursache</i><b class="dk-open">offen</b></div></div>`;
      }
      if (id === 'rezept') { const f = a.fields; return `<div class="dk-pv dk-pv-rx"><span class="dk-rx">Rp.</span><span><b>${esc(f[0].value)} ${esc(f[1].value)}</b>\u00a0·\u00a0${esc(f[2].value)}<br><span class="t3">Packung</span> <b class="dk-open">offen</b></span></div>`; }
      if (id === 'ueberweisung') { const f = a.fields; return `<div class="dk-pv dk-pv-doc"><div><i>an</i><b>${esc(f[0].value)}</b></div><div><i>Frage</i><span>${esc(f[1].value)}</span></div></div>`; }
      if (id === 'cave') return `<div class="dk-pv dk-pv-line">${I('shield', 14)}${DK.segT(a.detail)}</div>`;   /* the title is the line above */
      if (id === 'leistungen') return `<div class="dk-pv dk-pv-line"><b class="dk-pv-n tnum">${esc(a.title.split(' ')[0])}</b>${DK.segT(a.detail.split(' — ')[0])}</div>`;
      if (id === 'kartei') return `<div class="dk-pv dk-pv-line">${UI.state('draft')}${DK.segT(a.detail)}</div>`;
      return '';
    },
    renderProps(animateNew) {
      const box = this.el('[data-props]', 'props'); if (!box) return;
      const amb = this.el('[data-amb]', 'props'), empty = this.el('[data-pempty]', 'props');
      const st = DK.story;
      const list = [...this.props].sort((a, b) => b.t - a.t);
      const chrono = [...this.props].sort((a, b) => a.t - b.t);
      const isAmb = (p) => p.id === 'eaum' || p.id === 'termin';
      const hasAmb = list.some(isAmb);
      const ambOpen = hasAmb && !st.ambChosen;
      const newestT = list.length ? list[0].t : -1;
      const expT = ambOpen ? list.find(isAmb).t : newestT;
      /* the violet group holds only the two readings of the ambiguity (Termin + eAUM); anything else heard in the same
         sentence (Leistungen) is not part of that decision and waits with the rest */
      const exp = list.filter((p) => p.t === expT && (!ambOpen || isAmb(p)));
      let html = '';
      const restC = chrono.filter((p) => !exp.includes(p));
      const grp = exp.some(isAmb);
      if (restC.length) html += grp || restC.length > 3
        ? `<div class="dk-prop-minis">${restC.map((p) => this.propHTML(p.id, 'mini', animateNew && p.fresh)).join('')}</div>`
        : `<div class="dk-prop-rest">${restC.map((p) => this.propHTML(p.id, false, animateNew && p.fresh)).join('')}</div>`;
      if (exp.length) {
        const inner = exp.map((p) => this.propHTML(p.id, true, animateNew && p.fresh, grp)).join('');
        if (grp) {
          const l = ORDER.find((x) => x.t === exp[0].t);
          /* the words around the ambiguous phrase — one line, the full sentence is one hover away in the transcript */
          const ph = CD.ambiguity.heard.replace(/[„“"]/g, ''), at = l.text.indexOf(ph);
          const q = at < 0 ? l.text : `…${l.text.slice(0, at).trim().split(/\s+/).slice(-1)[0]} ${ph} ${(l.text.slice(at + ph.length).trim().split(/\s+/)[0] || '').replace(/[.,;:–-]+$/, '')}…`;
          const shared = `<button type="button" class="dk-ev dk-ev-shared" data-ev="${exp[0].t}" title="${esc(l.text)}"><b class="dk-nw">${esc(CD.speakers[l.who])}</b>\u00a0·\u00a0„${esc(q)}“\u00a0·\u00a0<span class="mono tnum">${mmss(exp[0].t)}</span></button>`;
          html += `<div class="dk-ambgrp ${ambOpen ? 'open' : 'done'}">${ambOpen ? this.ambChip() : ''}${inner}${shared}</div>`;
        } else html += inner;
      }
      box.innerHTML = html;
      box.scrollTop = box.scrollHeight;
      this.props.forEach((p) => (p.fresh = false));
      if (amb) amb.hidden = true;
      if (empty) empty.hidden = list.length > 0;
      const pc = this.el('[data-pcount]', 'props'); if (pc) pc.textContent = list.length ? `${list.length} vorbereitet · nichts ausgeführt` : 'nichts wird ausgeführt';
      if (animateNew && !DK.reduced()) box.querySelectorAll('.fresh').forEach((el, i) => DK.anim(el, [{ opacity: 0, translate: '24px 0' }, { opacity: 1, translate: '0 0' }], { spring: DK.spr.summon, delay: i * 60 }));
      this.bindProps();
    },
    ambChip() {
      const o = CD.ambiguity.options, st = DK.story;
      return `<div class="dk-ambchip" role="radiogroup" aria-label="Mehrdeutig: ${esc(CD.ambiguity.heard)}">
        <div class="dk-ambchip-q"><span class="dk-ambchip-h">${I('help', 14)}${esc(CD.ambiguity.heard)}</span><span class="dk-ambchip-n">eine Wahl für Termin + Krankenstand</span></div>
        <div class="dk-ambchip-o">${o.map((x) => `<button type="button" role="radio" data-amb="${x.id}" aria-checked="${st.ambChosen ? st.ambiguity === x.id : false}" class="${x.recommended ? 'rec' : ''}"><i></i><span class="o-l"><b class="tnum">${esc(DK.tx(x.label))}</b><span>${esc(x.detail)}</span></span>${x.recommended ? '<em>empfohlen</em>' : ''}</button>`).join('')}</div>
      </div>`;
    },
    bindProps() {
      const card = T.cards.props; if (!card) return;
      card.el.querySelectorAll('[data-amb]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); this.choose(b.dataset.amb); }));
    },
    choose(id) {
      DK.story.ambiguity = id; DK.story.ambChosen = true;
      this.renderProps(false);
      const a = DK.amb();
      S.notice({ text: `„nächsten Dienstag“ → ${DK.tx(a.label)}`, detail: 'Termin und Krankenstand aktualisiert', tone: 'ai', ms: 2200 });
    },

    /* evidence hover → highlight the transcript line */
    bindEvidence(cv) {
      cv.addEventListener('pointerover', (e) => {
        const b = e.target.closest('.dk-ev, .dk-prop'); if (!b) return;
        const t = +(b.dataset.ev || b.dataset.evT); const l = ORDER.find((x) => x.t === t); if (!l) return;
        const el = this.el(`.dk-line[data-l="${l.id}"]`, 'talk'); if (!el) return;
        el.classList.add('is-ev'); const box = el.parentElement; const r = el.offsetTop - box.clientHeight / 2; box.scrollTo({ top: r, behavior: 'smooth' });
      });
      cv.addEventListener('pointerout', (e) => { const b = e.target.closest('.dk-ev, .dk-prop'); if (!b) return; document.querySelectorAll('.dk-line.is-ev').forEach((x) => x.classList.remove('is-ev')); });
    },

    /* mic level meter (Gespräch header) */
    meter(now) {
      const bars = T.cards.talk && T.cards.talk.el.querySelectorAll('.dk-meter i'); if (!bars) return;
      const speaking = !DK.story.paused && now < this.speakUntil;
      const base = DK.story.paused ? 0 : speaking ? 0.75 : 0.14;
      this.level += (base - this.level) * 0.15;
      const t = now / 140;
      bars.forEach((b, i) => b.style.setProperty('--h', Math.max(0.1, Math.min(1, this.level * (0.45 + 0.55 * Math.abs(Math.sin(t + i * 1.7))))).toFixed(2)));
      if (S.capsule) S.capsule._ambLevel = this.level;
    },
  });

  /* identity check (capsule confirm) — one line, two identifiers */
  K.identity = function () {
    const p = D.patient;
    return S.capsule.confirm({
      width: 640, height: 64,
      html: `<div class="dk-idc"><span class="dk-idc-l">${DK.photo(p, 'dk-idc-photo')}<span>Im Raum: <b data-private>${esc(p.name)}</b> <span class="tnum">· *${esc(p.dob)}</span></span></span><span class="dk-idc-a"><button type="button" class="cbtn" data-no>Anderer Patient</button><button type="button" class="cbtn primary" data-ok>Bestätigt ↵</button></span></div>`,
      bind(box, done) {
        const key = (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); fin(true); } };
        const fin = (v) => { document.removeEventListener('keydown', key, true); done(v); };
        box.querySelector('[data-ok]').onclick = () => fin(true);
        box.querySelector('[data-no]').onclick = () => fin(false);
        document.addEventListener('keydown', key, true);
        K._idFin = fin;
        setTimeout(() => box.querySelector('[data-ok]').focus(), 60);
      },
    });
  };

  /* objection: stop capture, delete transcript, log */
  K.objection = async function () {
    const v = await S.capsule.confirm({
      width: 660, height: 64,
      html: `<div class="dk-idc"><span class="dk-idc-l">${I('mic-off', 16)}<span>Mitschrift stoppen und Transkript löschen?</span></span><span class="dk-idc-a"><button type="button" class="cbtn" data-no>Abbrechen</button><button type="button" class="cbtn primary" data-ok>Stoppen &amp; löschen</button></span></div>`,
      bind(box, done) { box.querySelector('[data-ok]').onclick = () => done(true); box.querySelector('[data-no]').onclick = () => done(false); },
    });
    if (!v) { if (DK.st.scene === 'C') K.ambient(); return; }
    /* the deletion promise is literal: the transcript, the recognised facts and the prepared proposals are destroyed —
       not shelved — so nothing of it can be brought back from the Ablage. Logged with the real (sim) clock time. */
    const at = DK.clockAt(DK.story.simT);
    K.stopCapture(); K.reset();
    ['talk', 'facts', 'props'].forEach((id) => { if (T.cards[id]) T.remove(id); });
    T.renderTray();
    DK.story = Object.assign(DK.freshStory(), { cave: DK.story.cave, objected: at });
    S.notice({ text: 'Mitschrift gestoppt · Transkript gelöscht', detail: `protokolliert · ${at} · ${D.practice.doctor.short}`, tone: 'info', icon: 'mic-off', ms: 3200 });
    DK.advance('K0');
  };
  DK.actions.objection = () => K.objection();
})();
