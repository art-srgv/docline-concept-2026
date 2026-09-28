/* Desk boot — Shell.init, intents (all routes: chips, typed, push-to-talk), presenter extras (scene jumps, Film, consultation
   controls, reset), Film autoplay (~75 s, English captions, any key/click stops), role switch, hash deep links. */
(function () {
  const DK = window.DK, D = DK.D, P = DK.P, S = window.Shell, T = DK.table;
  const I = DK.I, esc = DK.esc;

  S.init({ page: 'desk', center: 'patient', presenter: [] });
  /* earcons wait for the first gesture: a deep-linked beat (T1) plays silently instead of the browser's autoplay warning */
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive && S.settings.sound) {
    S.settings.sound = false;
    const on = () => { S.settings.sound = true; removeEventListener('pointerdown', on, true); removeEventListener('keydown', on, true); };
    addEventListener('pointerdown', on, true); addEventListener('keydown', on, true);
  }
  const canvas = document.getElementById('canvas');
  T.init(canvas); DK.bindCanvas(canvas); DK.consult.bindEvidence(canvas);
  S.pins.set((window.DOCLINE_PINS && window.DOCLINE_PINS.desk) || []);
  S.pins.onJump((sc) => DK.go(sc));

  /* ── intents ── */
  const spoken = (text, id) => !!text && text !== id;
  const und = (text, id, o) => (spoken(text, id) ? S.capsule.understand(text, o) : Promise.resolve());
  const inConsult = () => DK.st.scene === 'C';
  const others = D.patients.filter((p) => p.name !== P.name);
  const otherNamed = (text) => { const n = S.norm(text); return others.find((p) => n.includes(S.norm(p.name)) || (p.name.split(' ')[1] !== P.lastName && n.includes(S.norm(p.name.split(' ')[1])))); };

  async function guardConsult() {
    const v = await S.capsule.confirm({
      width: 780, height: 64,
      html: `<div class="dk-idc"><span class="dk-idc-l">${I('alert', 16)}<span>Konsultation <b data-private>${esc(P.name)}</b> läuft · beenden &amp; zur Freigabe?</span></span><span class="dk-idc-a"><button type="button" class="cbtn" data-no>Weiter mithören</button><button type="button" class="cbtn primary" data-ok>Beenden &amp; Freigabe</button></span></div>`,
      bind(box, done) { box.querySelector('[data-ok]').onclick = () => done(true); box.querySelector('[data-no]').onclick = () => done(false); },
    });
    if (v) { S.capsule.busy = false; S.intents.run('end'); } else S.capsule.idle();
  }
  async function clarifyDemir() {
    const opts = D.patients.filter((p) => p.name.endsWith(P.lastName));
    const i = await S.capsule.clarify({ question: 'Welcher Demir?', hint: 'Klicken, Zahl drücken oder sagen', options: opts.map((p) => ({ title: p.name, meta: `*${p.dob} · ${p.age} J. · ${p.carrier} · ${p.context}`, badge: p.name === P.name ? 'geöffnet' : '' })) });
    if (i < 0) { S.capsule.idle(); return; }
    if (opts[i].name !== P.name) { S.capsule.idle(); S.notice({ text: 'Demo: nur Ali Demir ist ausgearbeitet', detail: `${opts[i].name} bleibt geschlossen.`, tone: 'info', ms: 2600 }); }
    else S.capsule.result(`${P.name} · *${P.dob} bleibt geöffnet`, { ms: 1600 });
  }
  async function openCore(text, id) {
    await und(text, id, { highlight: 'Herrn Demir', intents: ['Akte öffnen', `${P.name} · *${P.dob}`] });
    DK.st.cmd++;
    DK.st.chipExtra = { scene: 'K0', list: [{ label: 'Anderer Demir?', icon: 'help', run: clarifyDemir }] };
    const r = DK.advance('K0');
    S.capsule.result(`${P.name} · *${P.dob} geöffnet`, { sub: 'im Wartezimmer', ms: 2300 });
    await r;
    T.drift();
  }

  S.intents.register([
    { id: 'task', utter: D.tier1.utter, match: ['aufgabe', 'rückruf', 'zurückrufen'], act: async (text) => {
      const u = und(text, 'task', { highlight: 'Frau Kern', intents: ['Aufgabe', 'an S. Wagner', 'Rückruf Fr. Kern'], ms: 900 });
      await u;
      DK.st.cmd++;
      const back = DK.st.scene === 'P' || DK.st.scene === 'T1';
      if (back) S.scene.set('T1', { silent: true });
      S.capsule.idle();
      const fin = () => { if (back && (DK.st.scene === 'P' || DK.st.scene === 'T1')) { DK.st.scene = 'P'; S.scene.set('P', { silent: true }); } };
      S.undo({ text: D.tier1.receipt.replace(/\b(Fr|Hr|Dr|S)\. /g, '$1.\u00a0'), seconds: D.tier1.undoSec || 8, onUndo: fin, onCommit: fin });
    } },
    { id: 'next', utter: 'Nächster Patient', match: ['nächster patient', 'nächste patientin', 'hofbauer'], act: async (text) => {
      if (inConsult()) return guardConsult();
      await und(text, 'next', { highlight: 'Nächster Patient', intents: ['Karin Hofbauer', 'nur Rezept'] });
      if (!DK.st.patient) { S.capsule.result('Kein Patient geöffnet', { ms: 1600 }); return; }
      DK.st.cmd++;
      await DK.advance('H');
      S.notice({ text: 'Demo endet hier — Karin Hofbauer ist nicht ausgearbeitet', detail: 'Ali Demirs Karten liegen in seiner Ablage-Gruppe.', tone: 'info', ms: 4200 });
    } },
    { id: 'end', utter: 'Konsultation beenden', match: ['beenden', 'fertig', 'freigabe'], roles: ['arzt'], act: async (text) => {
      if (DK.st.scene === 'F') { if (!DK.sheet.isOpen() && !DK.story.sent) DK.sheet.open(); return; }
      if (!inConsult()) { S.capsule.error('Keine Konsultation läuft'); return; }
      await und(text, 'end', { highlight: 'beenden', intents: ['Mitschrift beenden', 'Freigabe'], ms: 400 });
      DK.st.cmd++;
      DK.consult.stopCapture();
      await DK.advance('F');
      DK.sheet.open();
    } },
    { id: 'new', utter: 'Was ist neu bei Herrn Demir?', match: ['was ist neu', 'neu bei', 'neues'], act: async (text) => {
      if (inConsult()) { await und(text, 'new', { highlight: 'neu', intents: ['Neu seit ' + DK.sinceLast()] }); DK.st.cmd++; return DK.summonCard('neu', '', 'C'); }
      if (!DK.st.patient || DK.st.patient !== 'demir') return openCore(text, 'new');
      await und(text, 'new', { highlight: 'neu bei Herrn Demir', intents: ['Neu seit ' + DK.sinceLast(), P.name], ms: 480 });
      DK.st.cmd++; await DK.summonCard('neu', '', 'K0'); T.drift();
    } },
    { id: 'labs', utter: 'Letzte 3 Blutbefunde vergleichen', match: ['blutbefund', 'labor', 'vergleich', 'werte', 'ferritin', 'crp', 'blutbild'], act: async (text) => {
      await und(text, 'labs', { highlight: 'Letzte 3 Blutbefunde', intents: ['Labor · letzte 3 Befunde', P.name], ms: 480 });
      if (DK.st.patient !== 'demir') { await openCore(null, 'labs'); await DK.wait(900); }
      DK.st.cmd++;
      const s = DK.st.scene;
      if (s === 'K0') await DK.advance('K1');
      else await DK.summonCard('labs', T.cards.labs ? T.cards.labs.mode : '', s === 'C' ? 'C' : 'K1');
      T.drift();
    } },
    { id: 'meds', utter: 'Was nimmt er aktuell?', match: ['nimmt', 'medikation', 'medikamente', 'tabletten'], act: async (text) => {
      await und(text, 'meds', { highlight: 'nimmt er aktuell', intents: ['Medikation', 'inkl. ELGA e-Medikation'], ms: 480 });
      if (DK.st.patient !== 'demir') { await openCore(null, 'meds'); await DK.wait(900); }
      DK.st.cmd++;
      const s = DK.st.scene;
      if (s === 'K1') await DK.advance('K2');
      else await DK.summonCard('meds', '', s === 'C' ? 'C' : 'K0');
      T.drift();
    } },
    { id: 'consult', utter: 'Konsultation starten', match: ['konsultation', 'starten', 'mitschrift'], roles: ['arzt'], act: async (text) => {
      if (inConsult() || DK.st.scene === 'F') { S.capsule.result('Konsultation läuft bereits', { ms: 1400 }); return; }
      if (DK.st.patient === 'hofbauer') { S.notice({ text: 'Demo: nur Ali Demir ist ausgearbeitet', tone: 'info', ms: 2400 }); return; }
      await und(text, 'consult', { highlight: 'Konsultation starten', intents: ['Konsultation', P.name], ms: 500 });
      if (DK.st.patient !== 'demir') { DK.st.cmd++; DK.advance('K0'); await DK.wait(760); }
      const v = await DK.consult.identity();
      if (v === null || v === undefined) { S.capsule.idle(); return; }
      if (v === false) { S.capsule.idle(); S.notice({ text: 'Bitte den Patienten im Raum öffnen', detail: 'Mitschrift startet erst nach bestätigter Identität.', tone: 'info', ms: 2600 }); return; }
      DK.st.cmd++;
      DK.story = Object.assign(DK.freshStory(), { cave: DK.story.cave });
      S.capsule.idle();
      const ok = DK.advance('C');
      await DK.wait(DK.reduced() ? 0 : 620);
      if (DK.st.scene !== 'C') return;
      DK.consult.start({ t: 0 });
      await ok;
    } },
    { id: 'tidy', utter: 'Räum auf', match: ['räum auf', 'aufräumen', 'ordnen', 'räum'], act: async (text) => {
      await und(text, 'tidy', { highlight: 'Räum auf', intents: ['Aufräumen'], ms: 400 });
      DK.st.cmd++; S.capsule.idle(); await T.tidy();
    } },
    { id: 'open', utter: 'Öffne Herrn Demir', match: ['demir', 'akte', 'öffne', 'öffnen'], act: async (text) => {
      const other = text && otherNamed(text);
      if (inConsult()) return guardConsult();
      if (other) { await und(text, 'open', { highlight: other.name.split(' ')[1], intents: ['Akte öffnen', other.name] }); S.capsule.idle(); S.notice({ text: 'Demo: nur Ali Demir ist ausgearbeitet', detail: `${other.name} · *${other.dob}`, tone: 'info', ms: 2600 }); return; }
      if (DK.st.patient === 'demir' && DK.st.scene !== 'H') {
        await und(text, 'open', { highlight: 'Herrn Demir', intents: [`${P.name} · *${P.dob}`] });
        if (T.cards.anchor) { T.setTier('anchor', 'fg'); T.setKey('anchor'); }
        S.capsule.result(`${P.name} ist geöffnet`, { ms: 1400 }); return;
      }
      if (DK.st.patient === 'hofbauer') { await DK.advance('B'); S.capsule.result(`${P.name} · *${P.dob} geöffnet`, { sub: 'Karten aus seiner Ablage', ms: 2000 }); return; }
      return openCore(text, 'open');
    } },
  ]);

  /* live transcript: the capsule grows with the words instead of cutting the sentence with an ellipsis */
  (() => {
    const el = S.capsule && S.capsule.el; if (!el) return;
    const fit = (tx) => {
      const cw = parseFloat(el.style.getPropertyValue('--cw')) || el.offsetWidth;
      const room = tx.clientWidth + (cw - el.getBoundingClientRect().width);        // text room once the width transition lands
      const over = tx.scrollWidth - room; if (over <= 0) return;
      el.style.setProperty('--cw', Math.min(innerWidth - 300, Math.ceil(cw + over + 8)) + 'px');
    };
    const TX = { listening: '[data-tx]', understanding: '[data-utx]' };
    new MutationObserver(() => requestAnimationFrame(() => { const q = TX[el.dataset.state]; const tx = q && el.querySelector(q); if (tx) fit(tx); }))
      .observe(el, { childList: true, characterData: true, subtree: true });   /* words and intent tokens, only in the two states that show them */
  })();

  const baseSetChips = DK.setChips;
  DK.setChips = (extra) => {
    const x = DK.st.chipExtra && DK.st.chipExtra.scene === DK.st.scene ? DK.st.chipExtra.list : null;
    baseSetChips(extra || x);
    /* with „Anderer Demir?“ in front, the row would reach under the patient card on 1440-class widths: the lab chip says it shorter */
    if (x && !extra && innerWidth < 1520) S.chips([...x, ...(DK.CHIPS.K0 ? DK.CHIPS.K0() : []).map((c) => (c.intent === 'labs' ? Object.assign({}, c, { label: 'Blutbefunde vergleichen' }) : c))]);
  };

  /* ── presenter extras ── */
  const SCENES = [['P', 'P', 'Praxis · Kaltstart'], ['K0', 'K', 'Patient geöffnet'], ['K1', 'Labor', 'Blutbefunde vergleichen'], ['K2', 'Medikation', 'Was nimmt er aktuell?'], ['C', 'Konsultation', 'Mitschrift läuft'], ['F', 'Freigabe', 'Signieren & senden'], ['B', 'Bericht', 'Konsultationsbericht']];
  function openDirector(btn) {
    const cur = DK.st.scene === 'T1' ? 'P' : DK.st.scene === 'H' ? 'B' : DK.st.scene;
    const pop = S.popover(btn, `<div class="dk-dir">
      <div class="pop-lbl">Szene springen</div>
      <div class="dk-dir-grid">${SCENES.map(([id, s, l]) => `<button type="button" data-sc="${id}" aria-current="${cur === id}"><b>${esc(s)}</b><span>${esc(l)}</span></button>`).join('')}</div>
      <div class="dk-dir-row"><button type="button" class="dk-dir-film" data-film>${I('play', 14)}<span><b>Film</b> · ganze Geschichte, ~75 s</span></button></div>
      <div class="dk-dir-row"><button type="button" data-cold>${I('sparkles', 14)}<span>Kaltstart zeigen</span></button><button type="button" data-reset>${I('undo', 14)}<span>Zurücksetzen</span></button></div>
    </div>`, { align: 'left', offset: 10 });
    pop.el.querySelectorAll('[data-sc]').forEach((b) => (b.onclick = () => { pop.close(); DK.go(b.dataset.sc); }));
    pop.el.querySelector('[data-film]').onclick = () => { pop.close(); DK.film.start(); };
    pop.el.querySelector('[data-cold]').onclick = () => { pop.close(); T.clearUser(); Object.keys(T.cards).forEach((id) => T.remove(id)); T.renderTray(); DK.story = DK.freshStory(); S.capsule.endAmbient(); S.mic.set('ready'); DK.coldOpen(); };
    pop.el.querySelector('[data-reset]').onclick = () => { pop.close(); reset(); };
  }
  function reset() { S.store.clear(); S.story.reset(); try { sessionStorage.removeItem('docline.proto.desk.opened'); } catch (e) {} location.href = location.pathname + '?fresh'; }
  /* secondary presenter row (same "Konzept" material): Film + consultation controls — the shell pill has room for one extra button at 1512 px */
  const pres2 = S.h('<div class="dk-pres2" role="toolbar" aria-label="Konzept-Steuerung"></div>');
  document.body.appendChild(pres2);
  pres2.addEventListener('click', (e) => { const b = e.target.closest('[data-p2]'); if (!b) return; const k = b.dataset.p2, st = DK.story;
    if (k === 'film') DK.film.on ? DK.film.stop() : DK.film.start();
    if (k === 'pause') DK.consult.pause(!st.paused);
    if (k === 'speed') DK.consult.speed(st.speed >= 2 ? 1 : 2);
    if (k === 'end') DK.consult.toEnd();
    DK.presenter(); });
  /* one light "Konzept" pill. Film sits in the pill itself so nothing stacks over the patient
     card's bottom-left corner; the second row appears only while the Film runs or during the consultation (its controls). */
  DK.presenter = () => {
    const s = DK.st.scene, st = DK.story;
    const inC = s === 'C' && DK.isArzt() && !DK.film.on;
    const extra = [{ label: 'Szenen', icon: 'layout', title: 'Szene springen · Film · Zurücksetzen', onClick: (b) => openDirector(b) }];
    /* narrow laptops: Film stays in „Szenen“ so the pill ends before the capsule */
    if (!DK.film.on && !inC && innerWidth >= 1500) extra.push({ label: innerWidth < 1560 ? 'Film' : 'Film · ~75 s', icon: 'play', title: 'Ganze Geschichte automatisch (~75 s), englische Untertitel', onClick: () => DK.film.start() });
    /* the role switch (§ 9 MABG) as in the Akte presenter — same setting as the avatar menu */
    extra.push({ label: innerWidth < (s === 'C' || s === 'F' ? 1500 : 1400) ? '' : 'Assistenz', icon: 'users', title: 'Assistenz-Ansicht (Rolle wechseln)', pressed: () => !DK.isArzt(), onClick: () => S.set('role', DK.isArzt() ? 'assistenz' : 'arzt') });
    S.presenter(extra);
    pres2.innerHTML = DK.film.on
      ? `<span class="tag">Film</span><span class="dk-p2-live"><i></i>läuft · Taste oder Klick stoppt</span><button type="button" class="pbtn" data-p2="film">${I('stop', 13)}Stopp</button>`
      : inC
        ? `<span class="tag">Konsultation</span><button type="button" class="pbtn" data-p2="pause" aria-pressed="${!!st.paused}">${I(st.paused ? 'play' : 'pause', 13)}${st.paused ? 'Weiter' : 'Pause'}</button><button type="button" class="pbtn" data-p2="speed" aria-pressed="${st.speed >= 2}">2×</button><button type="button" class="pbtn" data-p2="end">${I('skip', 13)}Zum Ende</button>`
        : '';
  };

  /* ── Film: hands-free story with one-line English captions ── */
  const film = (DK.film = { on: false, gen: 0 });
  const cap = (text, ms = 3600) => S.notice({ text, tone: 'ai', icon: 'play', ms });
  film.start = async function () {
    const g = ++film.gen; film.on = true; document.body.classList.add('dk-film');
    const alive = () => film.on && film.gen === g;
    const w = async (ms) => { await DK.wait(ms); return alive(); };
    const until = async (fn, max = 60000) => { const t0 = performance.now(); while (!fn()) { if (!(await w(120)) || performance.now() - t0 > max) return false; } return alive(); };
    S.services.set('ecard', 'ok');
    T.clearUser(); Object.keys(T.cards).forEach((id) => T.remove(id)); T.renderTray();
    DK.story = DK.freshStory(); S.capsule.endAmbient(); S.mic.set('ready'); S.patient.set(null); DK.st.patient = null;
    DK.presenter();
    await DK.coldOpen(); if (!alive()) return;
    cap('Monday, 09:45. The desk shows three things: who is next, what waits for you, the waiting room.', 4200);
    if (!(await w(4400))) return;
    cap('Say it or tap a suggestion. Docline opens the patient and briefs itself.', 3600);
    await S.intents.run('open', { simulate: true }); if (!(await w(1600))) return;
    cap('Iron deficiency, two NSAIDs, reflux: connected before anyone asks.', 3600);
    if (!(await w(3600))) return;
    S.intents.run('labs', { simulate: true }); if (!(await until(() => DK.st.scene === 'K1'))) return;
    cap('What you ask for lands centre stage. Values, trend and source together.', 3600);
    if (!(await w(3900))) return;
    S.intents.run('meds', { simulate: true }); if (!(await until(() => DK.st.scene === 'K2'))) return;
    cap('Over-the-counter ibuprofen from ELGA e-Medikation: a quiet hint, not a pop-up.', 3400);
    if (!(await w(3400))) return;
    S.intents.run('consult', { simulate: true });
    if (!(await until(() => S.capsule.state === 'confirm'))) return;
    cap('Identity confirmed in one line. Consent was recorded at check-in.', 2600);
    if (!(await w(1500))) return;
    DK.consult._idFin && DK.consult._idFin(true);
    if (!(await until(() => DK.st.scene === 'C' && DK.consult.raf))) return;
    DK.consult.speed(2.4);
    if (!(await until(() => DK.story.simT >= 50))) return;
    cap('Facts lift off the transcript into “Erkannt”. Each one stays traceable.', 3600);
    if (!(await until(() => DK.story.simT >= 150))) return;
    cap('Orders become prepared objects. Nothing executes during the consultation.', 3600);
    if (!(await until(() => DK.story.simT >= 333))) return;
    DK.consult.speed(0.25);
    cap('One real ambiguity: “nächsten Dienstag”. One tap fixes appointment and sick note together.', 4200);
    if (!(await w(2600))) return;
    DK.consult.choose('next');
    if (!(await w(900))) return;
    DK.consult.speed(2.4);
    if (!(await until(() => DK.story.simT >= 372))) return;
    S.intents.run('end', { simulate: true });
    if (!(await until(() => DK.sheet.isOpen()))) return;
    cap('Freigabe: drafts on the left, legal acts on the right. Only uncertain fields need a decision.', 4200);
    if (!(await w(2200))) return;
    const pick = async (k, v) => { const b = DK.sheet.el && DK.sheet.el.querySelector(`[data-ch="${k}"] [data-v="${v}"]`); if (b) b.click(); return w(650); };
    const f = DK.act('rezept').fields.find((x) => x.label === 'Packung'), u = DK.act('eaum').fields.find((x) => x.label === 'Ursache'), a = DK.act('eaum').fields.find((x) => x.label === 'Ausgehzeiten');
    if (!(await pick('packung', f.choose[0]))) return;
    { const fr = DK.sheet.el && DK.sheet.el.querySelector('[data-frag]'); if (fr) fr.click(); if (!(await w(650))) return; }
    if (!(await pick('ursache', u.choose[0]))) return; if (!(await pick('ausgang', a.choose[0]))) return;
    cap('Seal and send with one hold. In production: Touch ID, Windows Hello or o-card PIN.', 3400);
    if (!(await w(900))) return;
    const hb = DK.sheet.el && DK.sheet.el.querySelector('[data-hold]'); if (hb) hb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    if (!(await until(() => DK.sheet.sending))) return;
    cap('Five seconds to stop the transmission. No fake undo once it has left.', 3800);
    if (!(await until(() => DK.st.scene === 'B'))) return;
    if (!(await w(900))) return;
    cap('The report: what went out, what the front desk does next, what waits in the Akte.', 4200);
    if (!(await w(4600))) return;
    cap('End of film — continue in the Akte, or press “Szenen” to jump anywhere.', 3600);
    film.stop(true);
  };
  film.stop = function (quiet) {
    if (!film.on) return; film.on = false; film.gen++; document.body.classList.remove('dk-film');
    if (!quiet) S.notice({ text: 'Film gestoppt', tone: 'info', ms: 1600 });
    if (DK.story.speed && DK.story.speed !== 1) DK.consult.speed(1);
    DK.presenter();
  };
  const stopOnUser = (e) => { if (!film.on || !e.isTrusted) return; if (e.target && e.target.closest && e.target.closest('.sh-presenter, .dk-pres2')) return; film.stop(); };
  document.addEventListener('keydown', stopOnUser, true);
  document.addEventListener('pointerdown', stopOnUser, true);

  /* ── keys ── */
  S.keys.bind('Enter', () => {
    if (document.activeElement && document.activeElement !== document.body) return;
    if (!DK.isArzt() || S.capsule.busy || S.capsule.state !== 'idle') return;
    if (['P', 'K0', 'K1', 'K2'].includes(DK.st.scene)) S.intents.run('consult');
  });

  /* ── role switch re-renders the current scene ── */
  S.bus.on('role', () => {
    const s = DK.st.scene, t = DK.story.simT;
    if (s === 'F' && DK.sheet.isOpen()) DK.sheet.close(true);
    DK.go(s === 'T1' ? 'P' : s, { keepStory: true, t });
    T.refresh();
  });

  /* ── hash deep links ── */
  window.addEventListener('hashchange', () => { const h = S.scene.get(); if (h && h !== DK.st.scene) DK.go(h, { t: +(S.scene.param('t') || 0) }); });
  window.addEventListener('resize', () => { clearTimeout(DK._rz); DK._rz = setTimeout(() => { if (['P', 'K0', 'K1', 'K2', 'B', 'H', 'C'].includes(DK.st.scene) && !DK.film.on) DK.go(DK.st.scene, { keepStory: true, t: DK.story.simT }); }, 240); });

  const boot = () => {
    const h = S.scene.get();
    if (new URLSearchParams(location.search).has('fresh')) { try { sessionStorage.removeItem('docline.proto.desk.opened'); } catch (e) {} }
    let opened = false; try { opened = sessionStorage.getItem('docline.proto.desk.opened') === '1'; } catch (e) {}
    if (h && DK.SPEC[h]) DK.go(h, { t: +(S.scene.param('t') || 0) });
    else if (!opened) DK.coldOpen();
    else DK.go('P');
    DK.presenter();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
})();
