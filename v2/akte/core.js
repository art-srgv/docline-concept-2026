/* Akte — core: namespace, state, derivations from window.DOCLINE (single source of truth).
   Every render module reads AK.S + AK.* derivations and writes only into its own root. */
(function () {
  const D = window.DOCLINE, esc = Shell.esc;
  const AK = (window.AK = { D });
  AK.esc = esc;
  AK.I = (n, s = 14) => window.ICON(n, { size: s });
  AK.$ = (sel, root = document) => root.querySelector(sel);
  AK.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ── people ── */
  const DOC = D.practice.doctor, ASS = D.practice.assistant;
  AK.people = {
    [DOC.short]: { initials: DOC.initials, role: 'Arzt' }, [DOC.name]: { initials: DOC.initials, role: 'Arzt' },
    [ASS.short]: { initials: ASS.initials, role: 'Assistenz' }, [ASS.name]: { initials: ASS.initials, role: 'Assistenz' },
  };
  AK.ini = (name) => (AK.people[name] ? AK.people[name].initials : String(name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase());
  AK.me = () => (AK.S.role === 'arzt' ? DOC.short : ASS.short);
  /* patient photo over an initials fallback; a failed load is remembered so re-renders never flash.
     cls: 'cut' = the cut-out portrait (banner) · 'round' = circular face crop (staged card, identity rows) */
  AK.photo = (cls = '') => `<span class="ak-ph ${cls}" aria-hidden="true"><span class="ini">${esc(D.patient.initials)}</span>${D.patient.photo && AK.photoOK !== false
    ? `<img src="${esc(D.patient.photo)}" alt="" draggable="false" onerror="AK.photoOK=false;this.remove()">` : ''}</span>`;
  /* a person you can open (blue) */
  AK.who = (name) => `<span class="ak-who">${esc(name)}</span>`;
  AK.isArzt = () => AK.S.role === 'arzt';

  /* typography on escaped HTML: never break inside „Dr. Berger“, „RR 135/85“, „20 mg“ or a compound like „e-card-System“,
     and never leave a „·“ alone at a line end or start */
  const UNIT = '(?:mg\\/dl|ng\\/ml|g\\/dl|mmHg|mg|ng|ml|kg|Stk\\.|Wo\\.|Mon\\.|Min|OP)';
  AK.nb = (h) => String(h == null ? '' : h)
    .replace(/\b(Dr\.|Mag\.|Fr\.|Hr\.) (?=[A-ZÄÖÜ])/g, '$1&nbsp;')
    .replace(/\b(RR|Puls|KS|bis|seit) (?=\d)/g, '$1&nbsp;')
    .replace(/ (L|H|LL|HH)(?=$|[\s,.;)&])/g, '&nbsp;$1')   /* a lab flag letter stays with its analyte („Ferritin L“) */
    .replace(new RegExp('(\\d) (' + UNIT + ')(?![A-Za-zÄÖÜäöüß])', 'g'), '$1&nbsp;$2')
    .replace(/(^|[\s(„])(e-[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*)/g, '$1<span class="ak-nw">$2</span>')
    .replace(/ · /g, '&nbsp;·&nbsp;');   /* a „·“ never ends or starts a line — it travels with its neighbours */
  /* icon + text as two flex items: the gap sits only between icon and text, the text keeps its own word spaces */
  AK.lbl = (icon, html) => `${icon || ''}<span>${html}</span>`;

  /* ── time: pre 09:45 (data), post 09:55 (after the 09:46–09:53 consultation); advances with real minutes ── */
  const t0 = Date.now();
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const hm = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  AK.baseTime = () => (AK.S.mode === 'pre' ? D.now.time : hm(toMin(D.consultation.end) + 2));
  AK.clock = () => hm(toMin(AK.baseTime()) + Math.floor((Date.now() - t0) / 60000));
  AK.today = D.now.date;                                  // 28.09.2026
  AK.todayShort = D.now.date.slice(0, 6);                 // 28.09.
  AK.mmss = (sec) => String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');

  /* ── labs ── */
  const SHORT = { 'Hämoglobin': 'Hb', 'Kreatinin': 'Krea' };
  AK.short = (k) => SHORT[k] || k;
  AK.draw = (id) => D.labs.draws.find((d) => d.id === id);
  AK.labRows = (draw) => {
    const rows = [];
    D.labs.analytes.forEach((a) => {
      const i = a.series.findIndex((s) => s.d === draw.date); if (i < 0) return;
      const s = a.series[i];
      rows.push({ name: a.key, key: a.key, v: s.v, dec: a.dec, unit: a.unit, ref: a.ref, flag: s.flag, isNew: s.isNew, series: a.series.slice(0, i + 1), refMin: a.refMin, refMax: a.refMax, prev: i > 0 ? a.series[i - 1].v : null });
    });
    return rows.sort((a, b) => (!!b.flag - !!a.flag) || AK.short(a.key).localeCompare(AK.short(b.key)));
  };
  AK.latestDraw = () => D.labs.draws[D.labs.draws.length - 1];
  AK.fmtDay = (date) => date.slice(0, 6);                 // 25.09.2026 → 25.09.
  /* transcript offsets (seconds since start) → wall-clock time; the Akte never shows mm:ss next to hh:mm */
  AK.wall = (sec) => hm(toMin(D.consultation.start) + Math.floor((sec || 0) / 60));
  /* when the Befund was discussed in the consultation (t of the transcript line that flags it) */
  const discussedLine = D.consultation.transcript.find((t) => t.befundDiscussed);
  AK.discussedAt = discussedLine ? AK.wall(discussedLine.t) : '';
  const ibuLine = D.consultation.transcript.find((t) => t.resolves === D.hint.id);
  AK.hintResolvedAt = ibuLine ? AK.wall(ibuLine.t) : '';
  /* the shared hint component prints the Desk's transcript offset (mm:ss) — in the Akte it reads as wall time */
  AK.hint = (resolved) => {
    const h = window.UI.hint(D.hint, { resolved });
    return resolved && ibuLine ? h.split(AK.mmss(ibuLine.t)).join(AK.hintResolvedAt) : h;
  };

  /* ── consultation derivations (post) ── */
  const A = D.consultation.actions;
  AK.A = A;
  AK.field = (act, label) => (A[act].fields || []).find((f) => f.label === label) || {};
  AK.pickChoice = (act, label, raw) => {
    const f = AK.field(act, label); const ch = f.choose || [];
    if (raw == null) return ch[0] || f.value || '';
    if (typeof raw === 'number') return ch[raw] || ch[0];
    const hit = ch.find((c) => Shell.norm(c).startsWith(Shell.norm(String(raw)).split(' ')[0])); return hit || String(raw);
  };
  AK.ambiguity = () => {
    const st = AK.S.story || {}; const id = st.ambiguity || (st.choices && st.choices.ambiguity) || 'next';
    return D.consultation.ambiguity.options.find((o) => o.id === id) || D.consultation.ambiguity.options[0];
  };
  /* one choice („nächsten Dienstag“) updates every place that names the date: rail, Aktivität, KI draft, Termin */
  const ddmm = (s) => (String(s || '').match(/\d\d\.\d\d\./) || [''])[0];
  const AMB_BASE = ddmm((D.consultation.ambiguity.options.find((o) => o.recommended) || D.consultation.ambiguity.options[0]).label);
  AK.ambDate = () => ddmm(AK.ambiguity().label) || AMB_BASE;
  AK.swapDate = (s) => {
    const cur = AK.ambDate(); if (!AMB_BASE || cur === AMB_BASE || s == null) return s;
    return String(s).split(AMB_BASE).join(cur);
  };
  const re = (s, rx) => { const m = String(s || '').match(rx); return m ? m[0] : ''; };
  AK.rezId = re(A.rezept.result, /REZ-ID [A-Z0-9-]+/);
  AK.uebValid = re(A.ueberweisung.result, /gültig bis [0-9.]+/);
  AK.removed = (id) => (AK.S.removed || []).includes(id);
  /* Tier-3 documents of the consultation (signed in the Freigabe — or left unsigned via „Später in der Akte“) */
  AK.T3 = ['rezept', 'ueberweisung', 'eaum'].filter((id) => A[id] && A[id].tier === 3);
  const T3K = { rezept: 'rez', ueberweisung: 'ueb', eaum: 'au' };
  AK.unsignedKinds = () => (AK.S.later ? AK.T3.map((id) => T3K[id]).filter((k) => !AK.S.laterDone[k]) : []);
  /* storno: an external act — only final once transmitted (hold-before-send); 'sending' is still stoppable */
  AK.isStorno = (id) => { const s = AK.S.storno[id]; return !!s && s.phase !== 'sending'; };

  /* ── problems (lens) — keyword heuristics per Dauerdiagnose ── */
  AK.PROBLEMS = D.patient.problems.map((p) => p.code);
  const LENS = {
    'M54.5': ['m54', 'lws', 'rucken', 'kreuz', 'lumb', 'naproxen', 'lasegue', 'bewegungsprogramm', 'physio', 'orthop', 'krankenstand', 'eaum', 'heben', 'lager', 'red flags', 'kraft'],
    'K21.9': ['k21', 'sodbrennen', 'reflux', 'pantoprazol', 'ppi', 'ferritin', 'gastro', 'dysphagie', 'blutabnahme', 'labor', 'magen'],
  };
  AK.matchesProblem = (text, code, dayIcd) => {
    if (!code || code === 'all') return true;
    const n = Shell.norm(text); return (LENS[code] || []).some((w) => n.includes(w));
  };
  AK.problemLabel = (code) => { const p = D.patient.problems.find((x) => x.code === code); return p ? p.label : code; };
  const LENS_SHORT = { 'M54.5': 'Rücken', 'K21.9': 'Reflux' };      // short lens names for the 44 px toolbar pill
  AK.problemShort = (code) => LENS_SHORT[code] || AK.problemLabel(code);

  /* ── state ── */
  AK.S = {
    mode: 'post', role: Shell.settings.role, view: 'kartei', story: {},
    removed: [], choices: {}, eaumFailed: false, later: false, laterDone: {},
    cave: 'missing',
    lane: { open: false, seen: {}, flag: null, drafts: {} },
    vid: null, vidOpen: false, vidChoice: null, vidReason: '', vidTask: null,
    added: [], corrections: {}, storno: {}, tasks: [], acts: [], medStops: {}, done: {},
    filters: { types: null, problem: 'all', onlyOpen: false, q: '' },
    expanded: {}, editing: null, focusId: null,
    staged: null,
    composer: { k: 'dek', text: '', nachtrag: null, open: false },
    searchOpen: false,
  };

  AK.initMode = (mode) => {
    const S = AK.S; const st = Shell.story.get() || {};
    S.mode = mode; S.story = st;
    S.removed = mode === 'post' ? (st.removed || []) : [];
    S.choices = st.choices || {};
    /* „Später in der Akte“: nothing was signed or transmitted → no receipts, no send failure */
    S.later = mode === 'post' && !!st.later; S.laterDone = {};
    S.eaumFailed = mode === 'post' && !S.later && !!st.eaumFailed;
    S.cave = mode === 'post' && !AK.removed('cave') ? 'none' : 'missing';
    S.lane = { open: false, seen: {}, flag: null, drafts: {} };
    (A.kartei.drafts || []).forEach((d) => (S.lane.drafts[d.k] = { state: 'pending', edited: false, text: AK.swapDate(d.text) }));
    S.vid = null; S.vidOpen = false; S.vidChoice = null; S.vidReason = ''; S.vidTask = null;
    S.added = []; S.corrections = {}; S.storno = {}; S.tasks = []; S.acts = []; S.medStops = {}; S.done = {};
    S.expanded = {}; S.editing = null; S.focusId = null; S.staged = null;
    S.composer = { k: AK.isArzt() ? 'dek' : 'not', text: '', nachtrag: null, open: false };
    S.filters = { types: null, problem: 'all', onlyOpen: false, q: '' }; S.searchOpen = false;
    Shell.services.set('ecard', S.eaumFailed ? 'warn' : 'ok', S.eaumFailed ? 'Störung seit 09:53 · Übermittlungen werden automatisch nachgeholt' : (D.services.find((s) => s.id === 'ecard') || {}).detail);
  };

  /* ── Kartei model ── */
  AK.kuerzel = () => D.kuerzel.filter((k) => AK.isArzt() || !k.doctorOnly || k.assistantAs);
  AK.kLabel = (k) => { const t = D.kuerzel.find((x) => x.k === k); if (!t) return k; return !AK.isArzt() && t.assistantAs ? t.assistantAs : t.label; };

  /* committed rows of today (post receipts + released drafts + composer entries) */
  AK.todayRows = () => {
    const S = AK.S, rows = [];
    if (S.mode === 'post') {
      const pack = AK.pickChoice('rezept', 'Packung', S.choices.packung);
      const dose = AK.field('rezept', 'Dosierung').value;
      const fail = S.eaumFailed;
      const cons = D.consultation.end;
      const inbox = `unsigniert · im Posteingang ${DOC.short}`;
      /* type word lives in the 88 px type column — row text starts with the content */
      const rezTxt = `${A.rezept.title.replace(/ Tabletten$/, '')} · ${pack} · ${dose}`;
      if (S.later) {
        /* „Später in der Akte“: prepared, never signed → no REZ-ID, no validity, one permitted next step */
        const un = AK.unsignedKinds();
        if (un.includes('rez')) rows.push({ id: 't-rez', k: 'rez', unsigned: 'rez', medId: 'm1', by: DOC.short, time: cons, text: rezTxt, detail: inbox, state: 'unsigned', more: `Vorbereitet in der Freigabe ${cons} · nicht signiert, nicht übermittelt · Patient hat kein e-Rezept` });
        if (un.includes('ueb')) rows.push({ id: 't-ueb', k: 'ueb', unsigned: 'ueb', by: DOC.short, time: cons, text: A.ueberweisung.title, detail: inbox, state: 'unsigned', more: `Fragestellung: ${AK.field('ueberweisung', 'Fragestellung').value} · nicht signiert, nicht erstellt` });
        if (un.includes('au')) rows.push({ id: 't-au', k: 'au', unsigned: 'au', by: DOC.short, time: cons, text: `${AK.todayShort}–${AK.ambDate()} (voraussichtlich) · an ${D.patient.carrier.short}`, detail: inbox, state: 'unsigned', more: `Nicht an ${D.patient.carrier.short} übermittelt · Signatur morgen = Rückdatierung` });
      } else {
        rows.push({ id: 't-rez', k: 'rez', receipt: 'rez', medId: 'm1', rezId: fail ? '' : AK.rezId, by: DOC.short, time: cons,
          text: rezTxt,
          detail: fail ? (A.rezept.failResult.split(' — ')[1] || A.rezept.failResult).split(' · ')[0] : AK.rezId, state: fail ? 'pending' : 'sent', ext: true,
          more: fail ? A.rezept.failResult : A.rezept.result });
        rows.push({ id: 't-ueb', k: 'ueb', receipt: 'ueb', gastro: true, by: DOC.short, time: cons,
          text: A.ueberweisung.title, detail: AK.uebValid, state: 'sent', ext: true,
          more: `Fragestellung: ${AK.field('ueberweisung', 'Fragestellung').value} · ${A.ueberweisung.result}` });
        const urs = AK.pickChoice('eaum', 'Ursache', S.choices.ursache), aus = AK.pickChoice('eaum', 'Ausgehzeiten', S.choices.ausgang);
        rows.push({ id: 't-au', k: 'au', receipt: 'au', by: DOC.short, time: cons,
          text: `${AK.todayShort}–${AK.ambDate()} (voraussichtlich) · an ${D.patient.carrier.short}`, detail: 'Arbeitgeber-Bestätigung ohne Diagnose',
          state: fail ? 'pending' : 'sent', ext: true,
          more: fail ? A.eaum.failResult : `Ursache: ${urs} · Ausgehzeiten: ${aus} · Diagnose ${AK.field('eaum', 'Diagnose').value.split(' (')[0]} nur an ${D.patient.carrier.short} · ${A.eaum.result}` });
      }
      if (!AK.removed('leistungen')) {
        const lei = A.leistungen.detail.split(' — ');
        rows.push({ id: 't-lei', k: 'lei', receipt: 'lei', by: DOC.short, time: cons, text: lei[0], state: 'done', doneLabel: `${A.leistungen.title.split(' ')[0]} erfasst`, more: `${lei[1] ? lei[1] + ' · ' : ''}${A.leistungen.result}` });
      }
      if (!AK.removed('cave')) rows.push({ id: 't-cave', k: 'cave', receipt: 'cave', by: DOC.short, time: cons, text: A.cave.title, detail: A.cave.detail, state: 'done', doneLabel: 'gespeichert', more: `Evidenz: ${A.cave.evidence.who} „${A.cave.evidence.quote}“ · ${AK.mmss(A.cave.evidence.t)}` });
    }
    /* released AI drafts come first (they replace the lane in place) */
    const rel = Object.entries(S.lane.drafts).filter(([, d]) => d.state === 'taken').map(([k, d]) => ({ id: 't-ai-' + k, k, text: d.text, by: DOC.short, time: d.at, ai: { edited: d.edited, at: d.at } }));
    const own = S.added.filter((r) => r.day === 'today');
    return [...rel, ...own.slice().reverse(), ...rows];
  };

  /* record days, with today prepended to the current quarter */
  AK.quarters = () => {
    const S = AK.S;
    return D.record.map((q, qi) => {
      const days = q.days.map((d) => {
        const entries = (d.entries || []).map((e, i) => Object.assign({ id: `${d.id}-${i}` }, e));
        const extra = S.added.filter((r) => r.day === d.id);
        return Object.assign({}, d, { rows: [...extra, ...entries] });
      });
      if (qi === 0) days.unshift({ id: 'today', date: `${D.now.weekday.slice(0, 2)} ${D.now.date}`, kind: 'heute', title: 'Heute', rows: AK.todayRows() });
      return Object.assign({}, q, { days });
    });
  };

  AK.allRows = () => AK.quarters().flatMap((q) => q.days.flatMap((d) => d.rows || []));
  /* corrections are a chain, oldest first: [{ from, to, reason, at, by }] — every step keeps its own reason, person and time (P7) */
  AK.corrChain = (r) => {
    const own = AK.S.corrections[r.id]; if (own) return own;
    return r.correction ? [{ from: r.correction.original, to: r.text, reason: r.correction.reason, at: r.correction.at, by: r.correction.by }] : [];
  };
  AK.curText = (r) => { const c = AK.corrChain(r); return c.length ? c[c.length - 1].to : r.text; };
  AK.lanePending = () => AK.S.mode === 'post' && Object.values(AK.S.lane.drafts).some((d) => d.state === 'pending');
  AK.vidOpenState = () => !AK.S.vid;       // 25.09. not yet vidiert
  AK.openCount = () => {
    let n = 0; if (AK.lanePending()) n++; if (AK.vidOpenState()) n++;
    AK.allRows().forEach((r) => { if (r.loop || r.state === 'pending' || r.state === 'unsigned') n++; });
    return n;
  };
  AK.isOpenRow = (r) => !!(r.loop || r.state === 'pending' || r.state === 'unsigned');
  AK.karteiCount = () => AK.allRows().length + D.labs.draws.length;
  AK.contacts = () => D.record[0].days.filter((d) => d.kind !== 'labor').length + (AK.S.mode === 'post' ? 1 : 0);

  /* open items for the rail (data + dynamic) */
  AK.openItems = () => {
    const S = AK.S; const list = (S.mode === 'post' ? D.openItems.post : D.openItems.pre).map((o) => Object.assign({}, o));
    list.forEach((o) => {
      if (S.done[o.id]) { o.done = true; o.state = S.done[o.id]; }
      if (o.id === 'p4') { o.text = AK.swapDate(o.text); o.due = AK.swapDate(o.due); }
      if (o.id === 'p3' && AK.unsignedKinds().includes('ueb')) o.state = 'wartet auf Überweisung';
      if (o.id === 'p4' && AK.removed('termin')) o.hidden = true;
      if (o.id === 'o2' && S.cave === 'none') { o.done = true; o.state = 'erhoben'; }
      if ((o.id === 'o1' || o.id === 'p2') && S.vid) { o.done = true; o.state = 'vidiert ' + S.vid.at; }
      if (o.id === 'p1' && !AK.lanePending()) {
        /* the workflow layer reports what actually happened to the drafts — never an adoption that did not take place */
        const ds = Object.values(S.lane.drafts), taken = ds.filter((d) => d.state === 'taken').length, disc = ds.filter((d) => d.state === 'discarded').length;
        o.done = true; o.state = disc && !taken ? 'verworfen' : disc ? `${taken} übernommen · ${disc} verworfen` : 'übernommen';
      }
    });
    if (S.eaumFailed) list.unshift({ id: 'fail', text: 'Nacherfassung: e-Rezept + eAUM (e-card-System gestört)', owner: ASS.short, state: 'wird automatisch nachgeholt', due: 'heute', clinical: false });
    if (S.later) {
      const NAME = { rez: 'e-Rezept', ueb: 'Überweisung', au: 'eAUM' };
      const un = AK.unsignedKinds(), all = AK.T3.length;
      list.unshift(un.length
        ? { id: 'sign', text: `${un.length} ${un.length === 1 ? 'Dokument' : 'Dokumente'} signieren (${un.map((k) => NAME[k]).join(', ')})`, owner: DOC.short, state: 'Wartet auf Arzt', due: 'heute', clinical: true }
        : { id: 'sign', text: `${all} Dokumente signiert`, owner: DOC.short, state: 'übermittelt', due: 'heute', clinical: true, done: true });
    }
    return [...S.tasks, ...list.filter((o) => !o.hidden)];
  };

  AK.activity = () => {
    const S = AK.S;
    let base = S.mode === 'post' ? D.activity.post.map((a) => Object.assign({}, a, { text: AK.swapDate(a.text) })) : D.activity.pre;
    if (S.mode === 'post' && S.eaumFailed) base = base.map((a) => (/e-Rezept|eAUM/.test(a.text) ? Object.assign({}, a, { text: a.text.replace(/an [^·]+ übermittelt/, 'Übermittlung ausstehend (e-card-System gestört)') }) : a));
    if (S.mode === 'post' && S.later) {
      /* nothing was signed or transmitted — the record must not claim it */
      const first = base.findIndex((a) => /signiert|übermittelt/.test(a.text));
      base = base.filter((a) => !/signiert|übermittelt/.test(a.text));
      const n = AK.T3.length;
      base.splice(Math.max(0, first), 0, { t: D.consultation.end, text: `Konsultation beendet · ${n} Dokumente unsigniert · im Posteingang ${DOC.short}`, by: DOC.short });
    }
    return [...S.acts.slice().reverse(), ...base];
  };
  AK.log = (text, by) => { const a = { t: AK.clock(), text, by: by || AK.me() }; AK.S.acts.push(a); return a; };
  AK.unlog = (a) => { AK.S.acts = AK.S.acts.filter((x) => x !== a); };

  /* ── render orchestration ── */
  const R = {};
  AK.on = (name, fn) => (R[name] = fn);
  AK.render = (only) => {
    const list = only ? [].concat(only) : Object.keys(R);
    list.forEach((k) => { try { R[k] && R[k](); } catch (e) { console.error('[akte] render ' + k, e); } });
  };
  AK.after = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));

  /* flash a target (row / group) after navigation */
  AK.flash = (el) => { if (!el) return; el.classList.remove('ak-flash'); void el.offsetWidth; el.classList.add('ak-flash'); setTimeout(() => el.classList.remove('ak-flash'), 1400); };
  AK.scrollTo = (el, o = {}) => {
    if (!el) return; const main = AK.$('#ak-main'); const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
    const top = main.scrollTop + r.top - m.top - (o.offset != null ? o.offset : 64) - 12;   /* the pill toolbar floats over the scroller; its fade ends 74 px down */
    main.scrollTo({ top: Math.max(0, top), behavior: o.instant || Shell.motion.reduced ? 'auto' : 'smooth' });
  };
})();
