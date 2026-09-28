/* Akte — boot: Shell, modes (#pre / #post from hash → story → default post), presenter, role, intents + chips, keys, pins. */
(function () {
  const D = window.DOCLINE, P = D.patient;
  Shell.init({ page: 'akte', center: 'search' });
  Shell.patient.set(P);

  const modeFromLoad = () => {
    const h = Shell.scene.get(); if (h === 'pre' || h === 'post') return h;
    const st = Shell.story.get(); if (st.consultation === 'not-started') return 'pre';
    return 'post';
  };
  function setMode(m) {
    AK.closeLabCard && AK.closeLabCard();
    AK.initMode(m); Shell.scene.set(m, { silent: true });
    document.getElementById('ak-main').scrollTop = 0; document.getElementById('ak-rail').scrollTop = 0;
    AK.render(); refreshChips(); AK.bannerSync(true); presenter();
  }
  AK.setMode = setMode;

  const presenter = () => Shell.presenter([
    { label: () => (innerWidth >= 1760 ? 'Vor Konsultation' : 'Vorher'), title: '09:45 · Patient im Wartezimmer', pressed: () => AK.S.mode === 'pre', onClick: () => AK.S.mode !== 'pre' && setMode('pre') },
    { label: () => (innerWidth >= 1760 ? 'Nach Konsultation' : 'Nachher'), title: '09:55 · nach der Konsultation 09:46–09:53', pressed: () => AK.S.mode === 'post', onClick: () => AK.S.mode !== 'post' && setMode('post') },
    { label: 'Assistenz', icon: 'users', title: 'Assistenz-Ansicht (Rolle wechseln)', pressed: () => !AK.isArzt(), onClick: () => Shell.set('role', AK.isArzt() ? 'assistenz' : 'arzt') },
  ]);
  AK.presenter = presenter;
  let wide = innerWidth >= 1760;
  addEventListener('resize', () => { if ((innerWidth >= 1760) !== wide) { wide = !wide; presenter(); } });

  Shell.bus.on('role', (r) => {
    const S = AK.S; S.role = r;
    if (!AK.kuerzel().some((k) => k.k === S.composer.k)) S.composer.k = AK.isArzt() ? 'dek' : 'not';
    S.vidOpen = false; S.editing = null; S.lane.open = false; AK.unstage(true);
    if (!AK.isArzt()) S.composer.k = 'not'; else if (S.composer.k === 'not' && !S.composer.text) S.composer.k = 'dek';
    AK.render(); refreshChips();
  });

  /* ── intents (capsule, chips, typed, push-to-talk) ── */
  const cap = () => Shell.capsule;
  Shell.intents.register([
    { id: 'drafts', utter: 'Entwürfe prüfen', roles: ['arzt'], match: ['entwurf', 'entwurfe', 'ki entw'], act: async (t) => {
      await cap().understand(t, { highlight: 'Entwürfe', intents: ['KI-Entwürfe', 'Dekurs · Status'], ms: 520 });
      AK.setView('kartei'); AK.toggleLane(true, { scroll: true }); cap().idle(); } },
    { id: 'vid', utter: 'Befund 25.09. vidieren', roles: ['arzt'], match: ['vidier'], act: async (t) => {
      if (AK.S.vid) return cap().result('Befund 25.09. ist bereits vidiert', { sub: `${AK.S.vid.by} · ${AK.S.vid.at}` });
      await cap().understand(t, { highlight: 'vidieren', intents: ['Vidieren', `Laborbefund ${AK.fmtDay(AK.latestDraw().date)}`], ms: 520 });
      AK.openVid(); cap().idle(); } },
    { id: 'labs', utter: 'Zeig Blutbefunde', match: ['blutbefund', 'blutwert', 'labor', 'werte', 'ferritin', 'vergleich'], act: async (t) => {
      await cap().understand(t, { highlight: 'Blutbefunde', intents: ['Laborverlauf', `${D.labs.draws.length} Befunde`], ms: 520 });
      AK.openLabCard(null, 'all'); cap().result(`Blutbefunde · ${D.labs.draws.map((d) => d.date.slice(0, 6)).join(' / ')}`, { sub: 'über der Akte · verschiebbar' }); } },
    { id: 'lens', utter: 'Nur Rücken', match: ['rucken', 'kreuzschmerz', 'm54', 'lws', 'nur ruck'], act: async (t) => {
      await cap().understand(t, { highlight: 'Rücken', intents: ['Problem-Linse', `${P.problems.find((p) => p.code === 'M54.5').code} ${AK.problemLabel('M54.5')}`], ms: 520 });
      AK.setView('kartei'); AK.setProblem('M54.5');
      cap().result(`Linse: ${AK.problemLabel('M54.5')} · M54.5`, { sub: `${document.querySelectorAll('#ak-tl .ak-row').length} Einträge` }); } },
    { id: 'rez', utter: 'Rezept Pantoprazol', roles: ['arzt'], match: ['rezept', 'pantoprazol', 'panto'], act: async (t) => {
      await cap().understand(t, { highlight: 'Pantoprazol', intents: ['e-Rezept', 'Pantoprazol 20 mg'], ms: 520 });
      cap().idle(); AK.prefill('rez', 'pantoprazol 20'); } },
    { id: 'dictate', utter: 'Diktat', roles: ['arzt'], match: ['diktat', 'diktier'], act: async () => { cap().idle(); AK.dictate(); } },
    { id: 'all', utter: 'Alle Einträge', match: ['alle eintrag', 'filter aus', 'alles zeigen'], act: async () => { AK.S.filters = { types: null, problem: 'all', onlyOpen: false, q: '' }; AK.render(['toolbar', 'view']); cap().result('Alle Einträge'); } },
  ]);

  function refreshChips() {
    const S = AK.S, post = S.mode === 'post', list = [];
    if (post && AK.lanePending()) list.push({ label: 'Entwürfe prüfen', icon: 'stars', intent: 'drafts' });
    if (!S.vid) list.push({ label: `Befund ${AK.fmtDay(AK.latestDraw().date)} vidieren`, icon: 'check', intent: 'vid' });
    list.push({ label: 'Blutbefunde zeigen', icon: 'flask', intent: 'labs' });
    list.push({ label: 'Nur Rücken', icon: 'filter', intent: 'lens' });
    if (!post) list.push({ label: 'Rezept Pantoprazol', icon: 'pill', intent: 'rez' });
    if (post && S.later && AK.unsignedKinds().length && AK.isArzt()) list.unshift({ label: `${AK.unsignedKinds().length} ${AK.unsignedKinds().length === 1 ? 'Dokument' : 'Dokumente'} signieren`, icon: 'signature', run: () => AK.signLater(AK.unsignedKinds()[0]) });
    Shell.chips(list.slice(0, 4));
  }
  AK.refreshChips = refreshChips;

  /* ── keys (single letters are ignored in fields by the shell; keyboard moves never animate) ── */
  const onRow = () => { const a = document.activeElement; return AK.S.view === 'kartei' && (!a || a === document.body || !(a.closest && a.closest('.sh-pop, .sh-capzone, .ak-lcard, #ak-staged'))); };
  Shell.keys.bind('n', (e) => { e.preventDefault(); AK.focusComposer(); }); Shell.keys.bind('N', (e) => { e.preventDefault(); AK.focusComposer(); });
  Shell.keys.bind('/', (e) => { e.preventDefault(); AK.openSearch(); });
  Shell.keys.bind('e', () => { if (AK.isArzt() || AK.lanePending()) AK.toggleLane(undefined, { kbd: true, scroll: true }); }); Shell.keys.bind('E', () => AK.toggleLane(undefined, { kbd: true, scroll: true }));
  ['j', 'ArrowDown'].forEach((k) => Shell.keys.bind(k, (e) => { if (!onRow()) return; e.preventDefault(); AK.moveFocus(1); }));
  ['k', 'ArrowUp'].forEach((k) => Shell.keys.bind(k, (e) => { if (!onRow()) return; e.preventDefault(); AK.moveFocus(-1); }));
  /* Enter on the focused row — also after a re-render dropped DOM focus to <body> (the .is-focus mark survives) */
  Shell.keys.bind('Enter', (e) => {
    const a = document.activeElement;
    const f = a && a.matches && a.matches('#ak-tl [data-nav]') ? a : (!a || a === document.body ? AK.$('#ak-tl .is-focus') : null);
    if (!f || AK.S.view !== 'kartei') return; e.preventDefault(); AK.activateFocus();
  });
  Shell.onEscEmpty(() => {
    const S = AK.S;
    if (S.focusId || AK.$('#ak-tl .is-focus')) { AK.$$('#ak-tl .is-focus').forEach((x) => x.classList.remove('is-focus')); S.focusId = null; document.activeElement && document.activeElement.blur(); return; }
    if (S.lane.open) { AK.toggleLane(false, { kbd: true }); return; }
    if (AK.filtersActive() || S.filters.onlyOpen || S.filters.q) { S.filters = { types: null, problem: 'all', onlyOpen: false, q: '' }; S.searchOpen = false; AK.render(['toolbar', 'view']); return; }
    if (S.view !== 'kartei') { AK.setView('kartei'); return; }
    AK.closeAkte();
  });
  window.addEventListener('hashchange', () => { const h = Shell.scene.get(); if ((h === 'pre' || h === 'post') && h !== AK.S.mode) setMode(h); });

  /* ── pins ── */
  const pins = (window.DOCLINE_PINS && window.DOCLINE_PINS.akte) || [];
  Shell.pins.set(pins);
  Shell.pins.onJump((sc) => setMode(sc === 'pre' ? 'pre' : 'post'));

  /* ── boot ── */
  AK.initMode(modeFromLoad());
  Shell.scene.set(AK.S.mode, { silent: true });
  const boot = () => { AK.render(); refreshChips(); presenter(); AK.bannerSync(true); document.body.classList.add('ak-ready'); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
})();
