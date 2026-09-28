/* Desk core — shared namespace, derived data, geometry, motion helpers. Classic script, global `DK`.
   Every clinical string is derived from window.DOCLINE (data.js). */
(function () {
  const D = window.DOCLINE, S = window.Shell, P = D.patient;
  const DK = (window.DK = {});
  DK.D = D; DK.P = P;
  DK.esc = S.esc; DK.h = S.h;
  /* dates are written without the trailing dot on the Desk — "Frist 01.10", "Labor 25.09" */
  DK.short = (d) => String(d || '').slice(0, 5);                        // '25.09.2026' → '25.09'
  DK.tx = (s) => String(s == null ? '' : s).replace(/(\b\d\d\.\d\d)\.(?!\d)/g, '$1').replace(/ \+ /g, '\u00a0+\u00a0');   // '… 06.10. …' → '… 06.10 …'; „a + b“ never breaks at the „+“
  DK.mmss = (t) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  DK.min = (hhmm) => { const [a, b] = String(hhmm).split(':').map(Number); return a * 60 + b; };
  DK.ini = (name) => String(name).split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  DK.isArzt = () => S.settings.role === 'arzt';
  /* facts joined by "·" that may wrap: every segment carries its own separator and the one that starts a line is clipped
     (see .dk-segs), so a "·" never dangles at a line start or end. parts = escaped HTML; segT splits a data string. */
  DK.segs = (parts, cls = '') => `<span class="dk-segs ${cls}"><span class="dk-segs-i">${parts.filter(Boolean).map((p) => `<span class="dk-sg">${p}</span>`).join('')}</span></span>`;
  DK.segT = (s, cls) => DK.segs(String(s == null ? '' : s).split(' · ').map((x) => DK.esc(DK.tx(x)).replace(/ \/ /g, '\u00a0/\u00a0').replace(/ — /g, '\u00a0— ')), cls);
  /* a scroll box never slices a line at its edge: the cut edge fades (classes fade-t / fade-b, see .dk-fadebox) */
  DK.edgeFade = (el) => {
    if (!el) return;
    if (!el._edge) { el._edge = true; el.classList.add('dk-fadebox'); el.addEventListener('scroll', () => DK.edgeFade(el), { passive: true }); }
    el.classList.toggle('fade-t', el.scrollTop > 1);
    el.classList.toggle('fade-b', el.scrollTop + el.clientHeight < el.scrollHeight - 1);
  };
  /* prose with an inline "·": bind each separator to its neighbours (no-break spaces) so it never ends or starts a line */
  DK.bind = (html) => String(html).replace(/ · /g, '\u00a0·\u00a0');
  DK.num = (v, dec) => S.fmt.num(v, dec);

  /* mutable desk state (scene machine) */
  DK.st = { scene: '', gen: 0, patient: null, cmd: 0, film: false, busyScene: false };
  /* story — the only mutable clinical state; persisted to Shell.story on sign */
  DK.freshStory = () => ({ drafted: false, ambiguity: 'next', choices: { packung: null, ursache: null, ausgang: null }, removed: [], eaumFailed: false, signed: false, sent: false, stopped: false, labViewed: false, cave: null, fragOk: false, emedOff: false, later: false, simT: 0, speed: 1, paused: false });
  DK.story = DK.freshStory();

  /* geometry: a top navigation row (0–67) + the sub-row pill (87–119). Content spans x 20 … W−20,
     y ≈ 133 … the chip/capsule band (bottom 160 in the centre). Side columns (outside the chip band, cx ± 350) may run down to
     the presenter pill (left, bottomL) or the Ablage tray (right, bottomR). */
  DK.geom = () => {
    const W = innerWidth, H = innerHeight, cx = W / 2;
    /* band = half-width of the chip row / expanded capsule for the current scene (P: 3 chips · K: 3 · B: 3 · C/F: ambient capsule) */
    const sc = DK.st.scene || 'P', band = /^K/.test(sc) ? 308 : sc === 'B' || sc === 'H' ? 316 : sc === 'C' || sc === 'F' ? 330 : 340;   // measured chip rows + 8 px
    return { W, H, cx, safeTop: H >= 880 ? 133 : 128, wingTop: Math.max(87, Math.min(H >= 880 ? 133 : 128, Math.round(H / 2 - 317))), bottom: H - 160, bottomL: H - 92, bottomR: H - 190, L: 20, R: W - 20, band };
  };
  /* the lowest y a card may reach: side cards clear of the chip band may go lower than centre cards */
  /* the highest y a card may take: wings clear of the centred sub-row pill may rise to just under the header row (87) */
  DK.topFor = (x, w) => { const g = DK.geom(); return x + w < g.cx - 130 || x > g.cx + 130 ? 87 : g.safeTop; };
  DK.bottomFor = (x, w) => {
    const g = DK.geom(), praxis = DK.st.scene === 'P' || DK.st.scene === 'T1';   // the Ablage tray is hidden on the Praxis desk
    if (x + w <= g.cx - g.band) return g.bottomL;
    if (x >= g.cx + g.band) return praxis ? g.bottomL : g.bottomR;
    /* narrow laptops: a centre card that reaches over the Ablage column (up to two tab groups) ends above it too */
    return !praxis && x + w > g.W - 380 ? Math.min(g.bottom, g.bottomR) : g.bottom;
  };
  /* wing width: 411 at 1600 px, never narrower than the inbox metrics row needs */
  DK.wingW = (W) => Math.round(Math.max(392, Math.min(440, (W || innerWidth) * 411 / 1600)));

  /* springs (Apple duration/bounce → linear()) */
  const sp = (d, b) => S.motion.spring(d, b);
  DK.spr = { summon: () => sp(0.45, 0.1), morph: () => sp(0.4, 0.1), tidy: () => sp(0.5, 0), sheet: () => sp(0.5, 0), fly: () => sp(0.4, 0.1), shelf: () => sp(0.42, 0) };
  DK.reduced = () => S.motion.reduced;
  /* WAAPI helper that never leaves a fill behind: the caller sets the final inline value first. */
  DK.anim = (el, kf, o = {}) => {
    if (!el || !el.animate) return Promise.resolve();
    if (DK.reduced()) return Promise.resolve();
    const s = o.spring ? o.spring() : null;
    const a = el.animate(kf, { duration: o.ms || (s ? s.ms : 240), easing: o.easing || (s ? s.easing : 'cubic-bezier(0.23,1,0.32,1)'), delay: o.delay || 0, fill: o.delay ? 'backwards' : 'none' });
    return a.finished.catch(() => {});
  };
  /* waits that survive scene changes (callers check the generation token after awaiting) */
  DK.wait = (ms) => new Promise((r) => S.timers.after(ms, r, 'desk-wait'));
  DK.later = (ms, fn) => S.timers.after(ms, fn, 'scene');
  DK.alive = (g) => g === DK.st.gen;

  /* ── derived data ── */
  const draw = D.labs.draws.find((d) => d.id === 'lab-2509') || D.labs.draws[D.labs.draws.length - 1];
  const last = (a) => a.series[a.series.length - 1];
  const prev = (a) => a.series[a.series.length - 2];
  const A = (k) => D.labs.analytes.find((a) => a.key === k);
  DK.lab = {
    draw, last, prev, A,
    dates: D.labs.draws.map((d) => d.date),
    rows(all) {
      return D.labs.analytes.map((a) => ({ name: a.key, v: last(a).v, dec: a.dec, unit: a.unit, ref: a.ref, flag: last(a).flag, series: a.series, refMin: a.refMin, refMax: a.refMax }))
        .sort((x, y) => (y.flag ? 1 : 0) - (x.flag ? 1 : 0));
    },
    flagged: () => D.labs.analytes.filter((a) => last(a).flag).length,
    count: () => D.labs.analytes.length,
  };
  DK.med = (id) => D.medications.find((m) => m.id === id);
  DK.ibu = () => D.medications.find((m) => m.status === 'extern');
  DK.nsar = () => (D.hint.text.match(/^\d+\s*NSAR/) || ['NSAR'])[0];            // "2 NSAR"
  DK.loop = () => {                                                              // "Überweisung Orthopädie" · "25.06." · "kein Rückbefund"
    const l = P.openLoops[0]; const m = l.text.match(/^(.*?)\s*\((\d\d\.\d\d)\.\)\s*[—-]\s*(.*)$/);
    return m ? { what: m[1], date: m[2], state: m[3] } : { what: l.text, date: DK.short(l.since), state: '' };
  };
  DK.sinceLast = () => DK.short(P.lastConsultation.date);
  DK.impf = () => (P.elga.modules.find((m) => m.id === 'impf') || {}).until;
  /* longest wait = among those not yet called (the next patient, already "da", is being called now) */
  DK.waitStats = () => {
    const now = DK.min(D.now.time), rest = D.waiting.filter((w) => w.name !== P.name);
    return { n: D.waiting.length, longest: Math.max(...rest.map((w) => now - DK.min(w.arrived))), walkIn: D.waiting.filter((w) => !w.termin).length };
  };
  /* patient photo with an initials fallback */
  DK.photo = (p, cls = '') => p && p.photo
    ? `<span class="dk-photo ${cls}" data-private><img class="ph-blur" src="${DK.esc(p.photo)}" alt="" aria-hidden="true"><img class="ph" src="${DK.esc(p.photo)}" alt="" onerror="this.parentNode.classList.add('no-photo')"><b aria-hidden="true">${DK.esc(p.initials)}</b></span>`
    : `<span class="dk-photo no-photo ${cls}" data-private><b aria-hidden="true">${DK.esc(p ? p.initials : '')}</b></span>`;
  /* icons missing from the shared set (Untitled-UI equivalents) */
  const EXTRA = { 'slash-circle': '<circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/>', target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>' };
  DK.I = (n, s = 16) => EXTRA[n] ? `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EXTRA[n]}</svg>` : window.ICON(n, { size: s });
  DK.visite = () => (D.dayStats.visite.match(/^\d\d:\d\d/) || [''])[0];
  DK.quarterShort = () => D.now.quarter.split('/')[0];
  DK.CD = D.consultation;
  /* wall-clock time of a consultation second (09:46 + simT) */
  DK.clockAt = (sec) => { const m = DK.min(D.consultation.start) + Math.floor((sec || 0) / 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  DK.act = (id) => D.consultation.actions[id];
  DK.tOf = (lineId) => (D.consultation.transcript.find((l) => l.id === lineId) || {}).t;
  /* the ambiguity ("nächsten Dienstag"): date strings derived from data + calendar arithmetic around today (28.09.2026) */
  DK.amb = () => {
    const o = D.consultation.ambiguity.options, pick = o.find((x) => x.id === DK.story.ambiguity) || o[0];
    const iso = pick.id === 'tomorrow' ? '2026-09-29' : '2026-10-06';
    return { pick, label: pick.label, iso, full: pick.label.replace(/\.$/, '') + '.2026', recommended: o.find((x) => x.recommended) };
  };
  DK.week = (iso) => {                                                            // Mon–Fri around a date
    const d = new Date(iso + 'T12:00:00Z'); const day = (d.getUTCDay() + 6) % 7; const mon = new Date(d.getTime() - day * 864e5);
    const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
    return names.map((n, i) => { const x = new Date(mon.getTime() + i * 864e5); return { n, d: String(x.getUTCDate()).padStart(2, '0') + '.' + String(x.getUTCMonth() + 1).padStart(2, '0'), on: i === day }; });
  };
  /* swap the recommended date for the chosen one in data strings */
  DK.swapDate = (s) => {
    if (DK.story.ambiguity !== 'tomorrow' || !s) return s;
    return String(s).replace(/Di 06\.10\.2026/g, 'Di 29.09.2026').replace(/Di 06\.10\./g, 'Di 29.09.').replace(/06\.10\./g, '29.09.');
  };
  DK.hofbauer = () => { const w = D.waiting.find((x) => x.name === 'Karin Hofbauer'); return { name: w.name, initials: DK.ini(w.name), age: w.age, dob: '', anliegen: w.anliegen, arrived: w.arrived, termin: w.termin }; };
})();
