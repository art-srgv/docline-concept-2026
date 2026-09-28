/* Desk scene machine — pure renders P → K0 → K1 → K2 → C → F → B (+ T1 overlay beat, H = next patient).
   go(id) renders instantly (deep links, reload, presenter jumps); advance(id) animates from the current table.
   Every async step checks the generation token DK.st.gen; timers via Shell.timers. */
(function () {
  const DK = window.DK, D = DK.D, P = DK.P, S = window.Shell, T = DK.table;
  const PRAXIS = ['next', 'inbox', 'wait'];

  /* ── scene specs (role-aware) ── */
  const SPEC = {
    P: () => ({ patient: null, fg: PRAXIS, key: null, stage: true }),
    K0: () => ({ patient: 'demir', fg: ['anchor', 'neu'], shelf: PRAXIS, key: 'neu' }),
    K1: () => ({ patient: 'demir', fg: ['anchor', 'neu', 'labs'], shelf: PRAXIS, key: 'labs' }),
    K2: () => ({ patient: 'demir', fg: ['anchor', 'neu', 'meds'], bg: ['labs'], shelf: PRAXIS, key: 'meds' }),
    C: () => DK.isArzt()
      ? { patient: 'demir', fg: ['anchor', 'talk', 'facts', 'props'], modes: { anchor: 'strip' }, shelf: [...PRAXIS, 'neu'], noKey: true, layout: 'C', enter: { talk: 'rise', facts: 'rise', props: 'slide' } }
      : { patient: 'demir', fg: ['anchor', 'busy'], shelf: [...PRAXIS, 'neu'], key: 'busy', layout: 'K0', close: ['talk', 'facts', 'props'] },
    B: () => ({ patient: 'demir', fg: ['anchor', 'report'], shelf: [...PRAXIS, 'neu'], close: ['talk', 'facts', 'props', 'busy'], key: 'report' }),
    H: () => ({ patient: 'hofbauer', fg: ['anchor2'], shelf: [...PRAXIS, 'neu', 'anchor', 'report'], close: ['talk', 'facts', 'props', 'busy'], key: 'anchor2' }),
  };
  SPEC.F = SPEC.C; SPEC.T1 = SPEC.P;
  DK.SPEC = SPEC;

  /* ── patient pill (identity-only, single source of truth) ── */
  function setPatient(pid) {
    if (DK.st.patient === pid) return;
    DK.st.patient = pid;
    document.body.classList.toggle('dk-nodob', pid === 'hofbauer');
    if (pid === 'demir') S.patient.set(P);
    else if (pid === 'hofbauer') S.patient.set(DK.hofbauer());
    else S.patient.set(null);
  }

  /* ── centre stage (time block) ── */
  const stage = { el: null };
  function stageShow(on, pos, animate) {
    if (!stage.el) { stage.el = S.h('<section class="dk-stage" aria-label="Heute"></section>'); T.canvas.appendChild(stage.el); }
    const el = stage.el;
    if (on) {
      el.innerHTML = DK.stageHTML();
      if (pos) { el.style.width = pos.w + 'px'; el.style.translate = `${pos.x}px ${pos.y}px`; }
      const was = el.classList.contains('on'); el.classList.add('on');
      if (animate && !was) [...el.children].forEach((ch, i) => DK.anim(ch, [{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { spring: DK.spr.summon, delay: i * 70 }));
    } else if (el.classList.contains('on')) {
      if (animate && !DK.reduced()) el.animate([{ opacity: 1 }, { opacity: 0, translate: '0 -6px' }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)' });
      el.classList.remove('on');
    }
  }
  DK.stage = stage;

  /* ── apply a scene to the table ── */
  async function apply(id, animate, o = {}) {
    const gen = DK.st.gen;
    const spec = SPEC[id]();
    const lid = spec.layout || (id === 'T1' ? 'P' : id);
    DK.st.noKey = !!spec.noKey;
    document.body.classList.toggle('dk-consult', id === 'C' || id === 'F');
    setPatient(spec.patient);
    const want = [...spec.fg, ...(spec.bg || [])];
    const modes = spec.modes || {};
    const g = DK.geom();
    const jobs = [];

    /* 1 · everything not wanted leaves: close (consultation cards) or shelve (FLIP into the Ablage) */
    const leaving = Object.values(T.cards).filter((c) => !want.includes(c.id) && c.tier !== 'gone');
    let si = 0;
    leaving.forEach((c) => {
      if ((spec.close || []).includes(c.id) || (!animate && !(spec.shelf || []).includes(c.id))) { if (animate) jobs.push(T.close(c.id, true)); else T.remove(c.id); }
      else if (c.tier !== 'shelf') { const d = si++ * 60; jobs.push(animate ? DK.wait(d).then(() => DK.alive(gen) && T.shelve(c.id, true)) : T.shelve(c.id, false)); }
    });
    /* deep link: the Ablage already holds what the story would have put there */
    if (!animate) (spec.shelf || []).forEach((sid) => { if (!T.cards[sid]) { T.render(sid, ''); T.measure(sid, defW(sid)); T.cards[sid].tier = 'gone'; T.shelve(sid, false); } });
    stageShow(false, null, animate);

    /* 2 · render wanted cards in their mode, measure, lay out */
    const prevMode = {}, wasLive = {}, oldH = {};
    want.forEach((cid) => { const c = T.cards[cid]; prevMode[cid] = c ? c.mode : null; wasLive[cid] = T.live(cid); if (c && wasLive[cid]) oldH[cid] = c.el.offsetHeight; });
    want.forEach((cid) => T.render(cid, modes[cid] || (cid === 'labs' && T.cards.labs ? T.cards.labs.mode : '')));
    const L = DK.layouts[lid](g, (cid, w) => T.measure(cid, w));
    if (spec.stage) stageShow(true, L._stage, animate);

    /* 3 · place: summon (pinch-off) / restore (from Ablage) / morph */
    let k = 0; const fitLater = [];
    want.forEach((cid) => {
      const c = T.cards[cid], slot = L[cid] || { x: g.L, y: g.safeTop, w: c.w || 420 };
      const up = T.userPos(cid + (c.mode ? ':' + c.mode : ''));
      const p = Object.assign({ h: null }, slot, up ? { x: up.x, y: up.y } : {});
      const tier = (spec.bg || []).includes(cid) ? 'bg' : 'fg';
      if (tier === 'fg') fitLater.push([cid, !!up]);
      if (!animate) { T.setBox(c, p); T.setTier(cid, tier); c.touched = DK.st.cmd; return; }
      if (wasLive[cid]) {
        const modeChanged = prevMode[cid] !== c.mode;
        if (modeChanged) {
          jobs.push(T.morph(cid, p, { h: true, spring: DK.spr.morph }));
          DK.anim(c.el.querySelector('.dk-pad'), [{ opacity: 0 }, { opacity: 1 }], { ms: 260, delay: 90 });
        } else jobs.push(T.morph(cid, p));
        if (c.tier !== tier) T.setTier(cid, tier);
        return;
      }
      if (c.tier === 'shelf') { jobs.push(T.restore(cid, p, true)); T.setTier(cid, tier); c.touched = DK.st.cmd; return; }
      const delay = 180 + k++ * 120;
      const how = (spec.enter || {})[cid] || 'summon';
      c.touched = DK.st.cmd;
      if (how === 'rise') jobs.push(riseIn(c, p, delay - 120));
      else if (how === 'slide') jobs.push(slideIn(c, p, delay - 120));
      else jobs.push(T.summon(cid, p, delay));
      if (tier === 'bg') T.setTier(cid, 'bg');
    });
    if (!animate) fitLater.forEach(([cid, user]) => T.fit(cid, { instant: true, noMove: user }));
    T.renderTray();
    T.setKey(spec.key || null);
    if (animate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) S.sound.summon();
    await Promise.all(jobs);
    if (!DK.alive(gen)) return;
    if (animate) fitLater.forEach(([cid, user]) => T.fit(cid, { noMove: user }));
    T.renderTray(); T.setKey(spec.key || null);
  }
  function defW(id) { const w = DK.wingW(); return { next: w, inbox: w, wait: w, anchor: w, neu: 440, labs: 520, meds: 440, report: 520, talk: 500, facts: 560, props: 400 }[id] || 420; }
  async function riseIn(c, p, delay) {
    T.setBox(c, p); T.setTier(c.id, 'fg');
    await DK.anim(c.el, [{ opacity: 0, translate: `${c.x}px ${c.y + 28}px`, scale: 0.97 }, { opacity: 1, translate: `${c.x}px ${c.y}px`, scale: 1 }], { spring: DK.spr.summon, delay: Math.max(0, delay) });
  }
  async function slideIn(c, p, delay) {
    T.setBox(c, p); T.setTier(c.id, 'fg');
    await DK.anim(c.el, [{ opacity: 0, translate: `${c.x + 48}px ${c.y}px` }, { opacity: 1, translate: `${c.x}px ${c.y}px` }], { spring: DK.spr.summon, delay: Math.max(0, delay) });
  }

  /* ── scene lifecycle ── */
  const CHIPS = {
    /* three chips (Konsultation starten lives on the patient card as the primary button) */
    P: () => DK.isArzt()
      ? [{ label: 'Öffne Herrn Demir', icon: 'user', intent: 'open' }, { label: 'Was ist neu bei Herrn Demir?', icon: 'sparkles', intent: 'new' }, { label: 'Aufgabe an Frau Wagner …', icon: 'check', intent: 'task' }]
      : [{ label: 'Öffne Herrn Demir', icon: 'user', intent: 'open' }, { label: 'Was ist neu bei Herrn Demir?', icon: 'sparkles', intent: 'new' }],
    /* as on P: the primary action (Konsultation starten ↵) lives on the patient card — chips are for asking */
    K: () => [{ label: 'Letzte 3 Blutbefunde vergleichen', icon: 'flask', intent: 'labs' }, { label: 'Was nimmt er aktuell?', icon: 'pill', intent: 'meds' }, { label: 'Räum auf', icon: 'layout', intent: 'tidy' }],
    C: () => [],
    F: () => (DK.isArzt() && !DK.sheet.isOpen() && !DK.story.sent ? [{ label: 'Freigabe fortsetzen', icon: 'signature', run: () => DK.sheet.open() }] : []),
    B: () => [{ label: 'Nächster Patient: Karin Hofbauer (nur Rezept)', icon: 'arrow-right', intent: 'next' }, { label: 'Akte öffnen', icon: 'file', run: () => { location.href = 'akte.html#post'; } }, { label: 'Räum auf', icon: 'layout', intent: 'tidy' }],
    H: () => [],
  };
  DK.setChips = (extra) => {
    const s = DK.st.scene, base = (CHIPS[s] || CHIPS[s[0]] || (() => []))();
    S.chips(extra ? [...extra, ...base] : base);
  };

  /* Story handoff (Desk → Akte). A replay scene (P…F) is always "before the consultation is signed": overwrite, never keep a
     stale 'done' from an earlier run — otherwise a jump back mixes pre- and post-consultation cards. Only B/H keep 'done'.
     keepStory (role switch, resize) re-renders the same moment and leaves the story untouched. */
  function writeStory(id, o = {}) {
    if (o.keepStory) return;
    if (['P', 'K0', 'K1', 'K2', 'T1', 'C', 'F'].includes(id) && S.story.get().consultation !== 'not-started') { S.story.reset(); S.story.set({ consultation: 'not-started' }); }
    else if (['P', 'K0', 'K1', 'K2', 'T1', 'C', 'F'].includes(id) && !S.story.get().consultation) S.story.set({ consultation: 'not-started' });
  }

  DK.go = function (id, o = {}) {
    if (!SPEC[id]) id = 'P';
    DK.st.gen++; const prev = DK.st.scene; DK.st.scene = id; document.body.dataset.scene = id;
    S.scene.set(id === 'H' ? 'B' : id, { silent: true });
    S.timers.clear('desk-wait');
    if (DK.film && DK.film.on && !o.film) DK.film.stop(true);
    if (!o.keepStory) { if (['P', 'K0', 'K1', 'K2', 'T1', 'C', 'F'].includes(id)) DK.story = DK.freshStory(); if (DK.sheet) { DK.sheet.sending = null; S.timers.clear('desk-send'); } S.services.set('ecard', 'ok'); }
    if (DK.consult) DK.consult.halt();
    if (DK.sheet) DK.sheet.close(true);
    if (id === 'B' || id === 'H') DK.sheet.fastForwardSigned();
    if (id === 'F') { DK.story.simT = DK.consult.D.durationSec; }
    writeStory(id, o);
    S.capsule && S.capsule.endAmbient();
    S.mic.set('ready');
    apply(id, false);
    if (id === 'C' && DK.isArzt()) DK.consult.start({ t: o.t != null ? o.t : 0, instant: true });
    if (id === 'C' && !DK.isArzt()) DK.consult.startShadow();
    if (id === 'F') { DK.consult.renderAll(DK.story.simT); if (DK.isArzt()) DK.sheet.open({ instant: true }); else DK.consult.startShadow(true); }
    DK.setChips();
    DK.presenter && DK.presenter();
    if (id === 'T1') DK.later(700, () => S.intents.run('task', { simulate: true }));
  };

  DK.advance = async function (id, o = {}) {
    const prev = DK.st.scene;
    DK.st.gen++; const gen = DK.st.gen; DK.st.scene = id; document.body.dataset.scene = id;
    S.scene.set(id === 'H' ? 'B' : id, { silent: true });
    writeStory(id);
    if (DK.consult && prev === 'C' && id !== 'F') DK.consult.halt();
    DK.setChips();
    DK.presenter && DK.presenter();
    await apply(id, true, o);
    if (!DK.alive(gen)) return false;
    DK.setChips();
    return true;
  };

  /* ── cold open (first load only, ~1.8 s) ── */
  DK.coldOpen = async function () {
    DK.st.gen++; const gen = DK.st.gen;
    DK.st.scene = 'P'; document.body.dataset.scene = 'P'; S.scene.set('P', { silent: true });
    writeStory('P'); setPatient(null); S.chips([]);
    const wrap = S.capsule && S.capsule.wrap;
    if (wrap) { wrap.style.animationDelay = '60ms'; wrap.classList.remove('rise'); void wrap.offsetWidth; wrap.classList.add('rise'); }
    document.body.classList.add('dk-cold');
    const g = DK.geom();
    PRAXIS.forEach((id) => T.render(id, ''));
    const L = DK.layouts.P(g, (cid, w) => T.measure(cid, w));
    await DK.wait(560); if (!DK.alive(gen)) return;
    stageShow(true, L._stage, true);
    await DK.wait(420); if (!DK.alive(gen)) return;
    if (!navigator.userActivation || navigator.userActivation.hasBeenActive) S.sound.summon();
    const jobs = PRAXIS.map((id, i) => { const up = T.userPos(id); return T.summon(id, Object.assign({}, L[id], up || {}), i * 120); });
    T.setKey(null);
    await DK.wait(460); if (!DK.alive(gen)) return;
    DK.setChips(); T.renderTray();
    await Promise.all(jobs);
    document.body.classList.remove('dk-cold');
    try { sessionStorage.setItem('docline.v1.desk.opened', '1'); } catch (e) {}
    DK.presenter && DK.presenter();
  };

  /* ── restore from the Ablage (click on a thumbnail) ── */
  DK.restoreFromTray = function (id) {
    const c = T.cards[id]; if (!c) return;
    if (DK.st.scene === 'C' || DK.st.scene === 'F') { if (c.group !== 'demir') return; }
    if (c.group !== 'praxis' && c.group !== DK.st.patient) {
      /* spatial swap back to that patient's desk */
      if (c.group === 'demir') { DK.swapToDemir(id); return; }
      return;
    }
    if (c.group === 'praxis' && DK.st.patient) {
      S.notice({ text: 'Praxis-Karten erst ohne geöffneten Patienten', detail: 'Patientengebundene Karten und Praxisdaten teilen sich nie den Tisch.', tone: 'info', ms: 2600 });
      return;
    }
    const g = DK.geom(); const lay = (DK.layouts[DK.st.scene] || DK.layouts.K1)(g, (cid, w) => T.measure(cid, w));
    const up = T.userPos(id + (c.mode ? ':' + c.mode : ''));
    const p = Object.assign({}, lay[id] || { x: g.cx - c.w / 2, y: g.safeTop + 40, w: c.w }, up || {});
    T.restore(id, p, true).then(() => { T.setKey(id); T.renderTray(); });
    T.touch(id);
  };
  DK.swapToDemir = async function () {
    await DK.advance('B');
  };

  /* ── generic card summon outside the canonical flow (e.g. labs during the consultation) ── */
  DK.summonCard = async function (id, mode, slotScene) {
    const g = DK.geom();
    const c = T.render(id, mode != null ? mode : (T.cards[id] ? T.cards[id].mode : ''));
    const L = DK.layouts[slotScene || 'K1'](g, (cid, w) => T.measure(cid, w));
    const up = T.userPos(id + (c.mode ? ':' + c.mode : ''));
    const p = Object.assign({}, L[id], up || {});
    if (c.tier === 'shelf') await T.restore(id, p, true);
    else if (T.live(id)) { T.setTier(id, 'fg'); await T.morph(id, p); }
    else await T.summon(id, p, 0);
    T.fit(id, { noMove: !!up });
    T.setKey(id); T.touch(id); T.renderTray();
  };

  /* ── [data-act] delegation ── */
  const A = (DK.actions = {
    consult: () => S.intents.run('consult'),
    open: () => S.intents.run('open'),
    'focus-inbox': () => { if (!T.live('inbox')) return; T.setKey('inbox'); const el = T.cards.inbox.el; el.classList.remove('dk-pulse'); void el.offsetWidth; el.classList.add('dk-pulse'); },
    'inbox-group': () => S.notice({ text: 'Klinischer Posteingang ist nicht Teil dieses Konzepts', detail: 'Gezeigt werden Desk und Akte.', tone: 'info', ms: 2600 }),
    'inbox-row': (b) => { const it = D.clinicalInbox.top.find((x) => x.id === b.dataset.i); if (it && it.patient === P.name) S.intents.run('open'); else A['inbox-group'](); },
    na: () => S.notice({ text: 'Nicht Teil dieses Konzepts', detail: 'Gezeigt werden Desk und Akte.', tone: 'info', ms: 2400 }),
    q: (b) => { if (+b.dataset.i === 0) S.intents.run('open'); else S.notice({ text: 'Demo: nur Ali Demir ist ausgearbeitet', tone: 'info', ms: 2400 }); },
    'cave-none': () => { DK.story.cave = 'none'; ['anchor', 'next'].forEach((id) => T.cards[id] && T.cards[id].tier !== 'gone' && T.render(id)); S.notice({ text: 'CAVE: keine bekannten Allergien', detail: `${DK.short(P.cave.post.at)} · ${D.practice.doctor.short}`, tone: 'info', icon: 'shield', ms: 2200 }); },
    'cave-add': () => S.notice({ text: 'Allergie eintragen', detail: 'Erfassung mit Reaktion und Schweregrad in der Akte.', tone: 'info', ms: 2400 }),
    'open-befund': async () => { if (!T.live('labs')) { await S.intents.run('labs'); } A['lab-full'](); },
    'lab-full': () => labMode('full'),
    'lab-compact': () => labMode(''),
    vidieren: (b) => vidPanel(b),
    akte: () => {},
  });
  async function labMode(mode) {
    const c = T.cards.labs; if (!c) return;
    const oldH = c.el.offsetHeight, oldY = c.y;
    T.render('labs', mode);
    DK.story.labViewed = DK.story.labViewed || mode === 'full';
    T.setKey('labs');
    const f = T.fit('labs', { measureOnly: true });                      // cap to the free band, keep clear of chips + capsule
    T.setBox(c, { x: c.x, y: f.y, h: f.h });
    if (!DK.reduced()) {
      await DK.anim(c.el, [{ height: oldH + 'px', translate: `${c.x}px ${oldY}px` }, { height: c.el.offsetHeight + 'px', translate: `${c.x}px ${f.y}px` }], { spring: DK.spr.morph });
      DK.anim(c.el.querySelector('.dk-pad'), [{ opacity: 0 }, { opacity: 1 }], { ms: 220 });
    }
  }
  /* Vidieren = person + time, only from the full report (P6). Outcome owner follows the tier model:
     organisational follow-ups go to the assistant; an Überweisung is prepared for the doctor's signature (Tier 3). */
  const FOLLOW = [
    ['Rückruf', () => `Rückruf · Aufgabe an ${D.practice.assistant.short}`],
    ['Kontrolle', () => `Kontrolltermin · Aufgabe an ${D.practice.assistant.short}`],
    ['Überweisung', () => `Überweisung vorbereitet · Signatur ${D.practice.doctor.short}`],
    ['Befundbesprechung', () => `Befundbesprechung · Aufgabe an ${D.practice.assistant.short}`],
  ];
  function vidDone(action) {
    DK.story.vidiert = { at: D.now.time, by: D.practice.doctor.short, action: action || '' };
    labMode('full');
    ['neu', 'next', 'inbox'].forEach((id) => T.cards[id] && T.cards[id].tier !== 'gone' && T.render(id));
    T.renderTray();
    S.notice({ text: 'Befund vidiert', detail: action || `${D.practice.doctor.short} · ${D.now.time}`, tone: 'info', icon: 'check', ms: 2400 });
  }
  function vidPanel(btn) {
    const card = T.cards.labs; const box = card.el.querySelector('[data-vid]'); if (!box) return;
    const flagged = DK.lab.flagged() > 0;
    const grow = () => { const f = T.fit('labs'); const pad = card.el.querySelector('.dk-pad'); if (f.capped && pad) { const last = box.querySelector('.dk-vidp'); if (last) pad.scrollTo({ top: pad.scrollHeight, behavior: DK.reduced() ? 'auto' : 'smooth' }); } };
    box.innerHTML = `<div class="dk-vidp">
      <div class="dk-vidp-h"><span class="eyebrow">Vidieren · Befund ${DK.esc(DK.short(DK.lab.draw.date))} · ${DK.esc(D.practice.doctor.short)}</span><button type="button" class="dk-link" data-vcancel>Abbrechen</button></div>
      <div class="dk-seg2" role="group"><button type="button" data-v="none">Keine Aktion nötig</button><button type="button" data-v="act">Aktion nötig →</button></div>
      <div data-vbody></div></div>`;
    const acts = card.el.querySelector('[data-lab-actions]'); if (acts) acts.hidden = true;     // the panel is the task now
    const body = box.querySelector('[data-vbody]');
    box.querySelector('[data-vcancel]').onclick = () => { box.innerHTML = ''; if (acts) acts.hidden = false; T.fit('labs'); };
    grow();
    box.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => {
      box.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      if (b.dataset.v === 'none') {
        body.innerHTML = flagged ? `<div class="dk-reason-row"><label class="dk-reason-in"><span>Begründung · Pflicht bei auffälligem Wert</span><input type="text" placeholder="z. B. bekannt, Kontrolle bei nächster Konsultation" data-reason></label><button class="btn btn-primary btn-sm" type="button" data-vok disabled>Vidieren</button></div>` : `<button class="btn btn-primary btn-sm" type="button" data-vok>Vidieren</button>`;
        const inp = body.querySelector('[data-reason]'), ok = body.querySelector('[data-vok]');
        if (inp) { inp.focus({ preventScroll: true }); inp.oninput = () => (ok.disabled = inp.value.trim().length < 3); inp.onkeydown = (e) => { if (e.key === 'Enter' && !ok.disabled) ok.click(); }; }
        ok.onclick = () => vidDone('');
      } else {
        body.innerHTML = `<div class="dk-actpick">${FOLLOW.map(([x]) => `<button type="button" class="dk-mini-btn" data-follow="${x}">${x}</button>`).join('')}</div>`;
        body.querySelectorAll('[data-follow]').forEach((x) => (x.onclick = () => { const f = FOLLOW.find((r) => r[0] === x.dataset.follow); vidDone(f[1]()); }));
      }
      grow();
    }));
  }

  DK.bindCanvas = function (cv) {
    cv.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !cv.contains(b)) return;
      const f = A[b.dataset.act]; if (!f) return;
      if (b.tagName === 'A' && b.dataset.act === 'akte') return;          // real navigation (view transition over http)
      e.preventDefault(); f(b, e);
    });
    /* waiting-room hover popover (Anliegen never on the canvas itself) */
    let pop = null, pt = null;
    cv.addEventListener('pointerover', (e) => {
      const q = e.target.closest('.dk-q'); if (!q) return;
      clearTimeout(pt);
      const w = D.waiting[+q.dataset.i]; if (!w) return;
      const mins = DK.min(D.now.time) - DK.min(w.arrived);
      pop = S.popover(q, `<div class="dk-qpop" data-private><div class="dk-qpop-h"><b>${DK.esc(w.name)}</b><span class="tnum">${w.age} J.</span></div>
        <dl><dt>Anliegen</dt><dd>${DK.esc(w.anliegen)}</dd><dt>Ankunft</dt><dd class="tnum">${DK.segs([DK.esc(w.arrived), mins < 1 ? 'gerade eben' : `seit ${mins} Min`])}</dd><dt>Termin</dt><dd class="tnum">${w.termin ? DK.esc(w.termin) : 'ohne Termin'}</dd>
        <dt>e-card</dt><dd class="${w.ecard ? '' : 'dk-warn-t'}">${w.ecard ? 'gesteckt' : DK.segT(w.ecardNote || 'fehlt')}</dd></dl></div>`, { align: 'center', offset: 10 });
    });
    cv.addEventListener('pointerout', (e) => { const q = e.target.closest('.dk-q'); if (!q || (e.relatedTarget && q.contains(e.relatedTarget))) return; pt = setTimeout(() => { S.closePopover(); pop = null; }, 80); });
  };
})();
