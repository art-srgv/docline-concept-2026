/* Docline shell v3 — shared chrome + interaction primitives. Classic script (no modules), IIFE global `Shell`.
   Load order on every page: data.js → icons.js → shell.js → ui.js → page scripts.

   FROZEN API (pages may use only this; never query .sh-* elements directly):
   Shell.init({ page:'desk'|'akte'|'hub', context: string | { crumbs:[{label,href}] }, center:'patient'|'search', presenter:[btn…] })
   Shell.patient.set(p|null)                 identity-only pill in the top bar (single source of truth: who am I acting on)
   Shell.mic.set('off'|'ready'|'command'|'recording', { time, onPause, onStop })
   Shell.services.set(id, 'ok'|'warn', detail)
   Shell.capsule.{ idle(), typing(), listen(text,{cps}) → Promise<text>, understand(text, { highlight, intents:[…], ms }) → Promise,
                   clarify({ question, hint, options:[{title,meta,badge}] }) → Promise<index|-1>, confirm({ html, width, height, bind(el,done) }) → Promise<any>,
                   result(text, { sub, ms }), error(text,{ms}), ambient({ label, time, actions:[{label,icon,primary,onClick}] }) | endAmbient(),
                   setLevel(0..1), state, gen }
   Shell.undo({ text, seconds, onUndo, onCommit })   Tier-1 receipt bubble that pinches off the capsule
   Shell.notice({ text, detail, tone:'ok'|'warn'|'ai'|'info', icon, ms })
   Shell.chips([{ label, icon, intent | run }])      suggestion chips above the capsule (hidden unless idle/ambient)
   Shell.intents.register([{ id, utter, match:[RegExp|string], roles:['arzt','assistenz'], act: async (text) => {} }])
   Shell.intents.run(idOrText)                        chips, typed text, push-to-talk and greeting tokens all route here
   Shell.popover(anchorEl, htmlOrNode, { align:'right'|'left'|'center', offset }) → { el, close }
   Shell.layers.push({ close }) → pop()               Esc closes the top layer; Shell.onEscEmpty(fn) for page-level Esc
   Shell.keys.bind(key, fn, { allowInInput })         single-letter keys ignored in inputs / with modifiers
   Shell.scene.{ get(), set(id, { silent }), on(fn) } hash-synced (desk.html#K1); Shell.story.{ get(), set(patch), reset() } (sessionStorage)
   Shell.settings (read) · Shell.set(key, value) · Shell.bus.on('settings' | 'role' | 'scene' | 'pins', fn)
   Shell.pins.{ set(list), setScene(id), toggle(on?), open(id), onJump(fn) }
   Shell.motion.{ spring(duration,bounce) → {easing,ms}, animate(el, keyframes, { duration, bounce, delay, easing, ms }) → Promise, reduced }
   Shell.fmt.{ num(v,dec), val(v,dec,unit) }   de-AT with narrow no-break space before units
   Shell.sound.{ listen, end, summon, success, warn }    Shell.timers.{ after(ms,fn,scope), clear(scope) }
   Shell.dragging = bool (pages set it while dragging; disables push-to-talk)
   Shell.h(html) · Shell.esc(str) · Shell.sleep(ms) · Shell.norm(str) · Shell.announce(text) · Shell.edge(on) */
(function () {
  const D = window.DOCLINE, ICON = window.ICON, html = document.documentElement;
  const h = (s) => { const t = document.createElement('template'); t.innerHTML = String(s).trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  const PREFIX = 'docline.v1.';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {} },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch (e) {} },
  };
  const L = {}; const bus = { on(e, f) { (L[e] = L[e] || []).push(f); }, off(e, f) { L[e] = (L[e] || []).filter((x) => x !== f); }, emit(e, d) { (L[e] || []).forEach((f) => { try { f(d); } catch (err) { console.error(err); } }); } };

  /* timers (scoped, cleared on scene change) */
  const T = {};
  const timers = {
    after(ms, fn, scope = 'scene') { const id = setTimeout(() => { T[scope] = (T[scope] || []).filter((x) => x !== id); fn(); }, ms); (T[scope] = T[scope] || []).push(id); return id; },
    clear(scope = 'scene') { (T[scope] || []).forEach(clearTimeout); T[scope] = []; },
  };

  /* number formatting (de-AT) */
  const fmt = {
    num(v, dec = 0) { return new Intl.NumberFormat('de-AT', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v); },
    val(v, dec, unit) { return fmt.num(v, dec) + (unit ? ' ' + unit : ''); },
  };

  /* ── settings (role, pins, scene are never persisted) ── */
  const qs = new URLSearchParams(location.search);
  if (qs.has('fresh')) { store.clear(); try { sessionStorage.removeItem(PREFIX + 'story'); } catch (e) {} }
  const settings = Object.assign({ theme: 'night', glass: 'tinted', privacy: false, reduceMotion: false, sound: true, realVoice: true }, store.get('settings', {}));
  settings.role = 'arzt';
  settings.theme = 'day';   /* single light theme */

  if (qs.get('role') === 'assistenz') settings.role = 'assistenz';
  if (qs.get('glass')) settings.glass = qs.get('glass');
  function apply() {
    html.dataset.theme = settings.theme; html.dataset.glass = settings.glass; html.dataset.role = settings.role;
    if (document.body) { document.body.classList.toggle('reduce-motion', !!settings.reduceMotion); document.body.classList.toggle('privacy', !!settings.privacy); }
  }
  apply();
  function set(key, value) {
    const run = () => {
      settings[key] = value;
      const { role, ...persist } = settings; store.set('settings', persist);
      apply(); renderRight(); renderPresenter(); bus.emit('settings', { key, value, settings }); if (key === 'role') bus.emit('role', value);
    };
    if ((key === 'theme' || key === 'glass') && document.startViewTransition && !reduced()) document.startViewTransition(run); else run();
  }
  function reduced() { return !!settings.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ── motion: spring → CSS linear() (Apple duration/bounce) ── */
  const springCache = {};
  function spring(duration = 0.45, bounce = 0.1) {
    const key = duration + '|' + bounce; if (springCache[key]) return springCache[key];
    const w = (2 * Math.PI) / duration, z = Math.max(0.05, 1 - bounce);
    const pts = []; let t = 0, settle = duration; const dt = duration / 40;
    for (let i = 0; i < 400; i++) {
      t = i * dt; let x;
      if (z < 1) { const wd = w * Math.sqrt(1 - z * z); x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); }
      else x = 1 - Math.exp(-w * t) * (1 + w * t);
      pts.push(+x.toFixed(4));
      if (i > 20 && Math.abs(1 - x) < 0.001) { settle = t; break; }
    }
    pts[pts.length - 1] = 1;
    const ok = window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)');
    return (springCache[key] = { easing: ok ? `linear(${pts.join(', ')})` : 'cubic-bezier(0.23, 1, 0.32, 1)', ms: Math.round(settle * 1000) });
  }
  function animate(el, kf, o = {}) {
    if (!el || !el.animate) return Promise.resolve();
    if (reduced()) {
      const a = kf[0], b = kf[kf.length - 1];
      return el.animate([{ opacity: a.opacity != null ? a.opacity : 1 }, { opacity: b.opacity != null ? b.opacity : 1 }], { duration: 120, easing: 'ease-out', fill: o.fill || 'both', delay: o.delay || 0 }).finished.catch(() => {});
    }
    const s = o.easing ? { easing: o.easing, ms: o.ms || 240 } : spring(o.duration || 0.45, o.bounce == null ? 0.1 : o.bounce);
    return el.animate(kf, { duration: o.ms || s.ms, easing: s.easing, fill: o.fill || 'both', delay: o.delay || 0 }).finished.catch(() => {});
  }

  /* ── earcons ── */
  let actx = null;
  function tone(freqs, o = {}) {
    if (!settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime + 0.01;
      freqs.forEach((f, i) => {
        const osc = actx.createOscillator(), g = actx.createGain(), st = t0 + i * (o.step || 0.06), du = o.dur || 0.12;
        osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, st); if (o.slide) osc.frequency.exponentialRampToValueAtTime(f * o.slide, st + du);
        g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(o.gain || 0.04, st + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, st + du);
        osc.connect(g).connect(actx.destination); osc.start(st); osc.stop(st + du + 0.02);
      });
    } catch (e) {}
  }
  const sound = {
    listen: () => tone([587, 880], { step: 0.07, dur: 0.14, gain: 0.035 }), end: () => tone([880, 660], { step: 0.05, dur: 0.1, gain: 0.025 }),
    summon: () => tone([420], { dur: 0.1, slide: 1.5, gain: 0.025, type: 'triangle' }), success: () => tone([523.25, 659.25, 783.99], { step: 0.08, dur: 0.22, gain: 0.035 }),
    warn: () => tone([392, 330], { step: 0.1, dur: 0.16, gain: 0.03, type: 'triangle' }),
  };

  /* ── story (cross-screen) ── */
  const story = {
    get() { try { return JSON.parse(sessionStorage.getItem(PREFIX + 'story') || 'null') || {}; } catch (e) { return {}; } },
    set(p) { const n = Object.assign(story.get(), p); try { sessionStorage.setItem(PREFIX + 'story', JSON.stringify(n)); } catch (e) {} return n; },
    reset() { try { sessionStorage.removeItem(PREFIX + 'story'); } catch (e) {} },
  };

  /* ── scene (hash) ── */
  const sceneL = [];
  const scene = {
    get() { return (location.hash || '').replace(/^#/, '').split('&')[0] || ''; },
    param(k) { const m = (location.hash || '').match(new RegExp('[#&]' + k + '=([^&]+)')); return m ? decodeURIComponent(m[1]) : null; },
    set(id, o = {}) { const url = '#' + id; if (location.hash !== url) history.replaceState(null, '', url); timers.clear('scene'); if (!o.silent) { sceneL.forEach((f) => f(id)); bus.emit('scene', id); } pins.setScene(id); },
    on(f) { sceneL.push(f); },
  };

  /* ── DOM ── */
  let page = 'desk', top, dock, sub, capzone, chipsEl, capwrap, capEl, edgeEl, noticesEl, liveEl, presEl, presExtra = [];
  const svc = {}; (D.services || []).forEach((s) => (svc[s.id] = Object.assign({}, s)));
  let mic = { state: 'ready' };

  function init(o = {}) {
    page = o.page || 'desk'; presExtra = o.presenter || [];
    document.body.classList.add('pg-' + page); apply();
    if (!document.querySelector('.ambient')) document.body.prepend(h('<div class="ambient" aria-hidden="true"></div>'));
    const NAV = [
      { id: 'desk', label: 'Desk', icon: 'desk', href: 'desk.html' }, { id: 'heute', label: 'Heute', icon: 'today', div: true },
      { id: 'akte', label: 'Patienten', icon: 'users', href: 'akte.html', div: true }, { id: 'termine', label: 'Termine', icon: 'calendar', div: true },
      { id: 'abr', label: 'Abrechnung', icon: 'euro' },
    ];
    const navHTML = page === 'hub' ? '' : `<nav class="sh-nav" aria-label="Hauptnavigation">${NAV.map((it) => `<a class="sh-navi" ${it.href ? `href="${it.href}"` : 'href="#" data-na'} ${it.id === page ? 'aria-current="page"' : ''}>${ICON(it.icon, { size: 17 })}<span>${it.label}</span></a>${it.div ? '<i class="sh-navdiv" aria-hidden="true"></i>' : ''}`).join('')}</nav>`;
    top = h(`<header class="sh-top" role="banner"><div class="sh-left"><a class="sh-wordmark" href="desk.html" aria-label="Docline Desk">D<span class="sh-o" aria-hidden="true"></span>cline</a><span class="sh-sep"></span><span class="sh-context"></span></div><div class="sh-center">${navHTML}</div><div class="sh-right"></div></header>`);
    document.body.appendChild(top);
    top.addEventListener('click', (e) => { const a = e.target.closest('[data-na]'); if (!a) return; e.preventDefault(); notice({ text: 'Nicht Teil dieses Konzepts', detail: 'Gezeigt werden Desk (Screen 1) und Akte (Screen 2).', tone: 'info', ms: 2600 }); });
    sub = h('<div class="sh-sub"></div>'); if (page !== 'hub') document.body.appendChild(sub);
    const ctx = top.querySelector('.sh-context');
    if (o.context && o.context.crumbs) ctx.innerHTML = o.context.crumbs.map((c) => (c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<b>${esc(c.label)}</b>`)).join(' <span aria-hidden="true">/</span> ');
    else ctx.textContent = o.context || `${D.practice.name}\u00a0\u00a0·\u00a0\u00a0${D.practice.room}`;   // two spaces either side of the dot
    if (o.center === 'search') sub.innerHTML = `<button class="sh-search" type="button" data-search>${ICON('search', { size: 15 })}<span>Patient, Befund oder Befehl …</span><span class="kbd">⌘K</span></button>`;
    else patientSet(null);
    const sb = sub.querySelector('[data-search]'); if (sb) sb.onclick = () => Shell.capsule.typing();

    if (page !== 'hub') {
      capzone = h('<div class="sh-capzone"><div class="sh-chips" role="toolbar" aria-label="Vorschläge"></div></div>');
      chipsEl = capzone.querySelector('.sh-chips');
      capwrap = h('<div class="sh-capwrap" data-state="idle"></div>'); capEl = h(capsuleHTML()); capwrap.appendChild(capEl); capzone.appendChild(capwrap);
      document.body.appendChild(capzone);
      Shell.capsule = new Capsule(capEl, capwrap);
    }
    edgeEl = h('<div class="sh-edge" aria-hidden="true"></div>'); document.body.appendChild(edgeEl);
    noticesEl = h('<div class="sh-notices" aria-live="polite"></div>'); document.body.appendChild(noticesEl);
    liveEl = h('<div class="sr-only" aria-live="polite"></div>'); document.body.appendChild(liveEl);
    document.body.appendChild(h(`<div class="sh-privacy">${ICON('eye-off', { size: 14 })} Sichtschutz · Namen verborgen</div>`));
    document.body.appendChild(h(`<div class="sh-small"><h2>Docline ist als Desktop-Konzept gebaut.</h2><p>Bitte am Mac oder PC ab 1100 px Breite öffnen — dort läuft der Prototyp mit Sprache, Karten und Freigabe.</p><a class="btn btn-primary" href="index.html">Konzept ansehen</a></div>`));
    document.body.appendChild(h('<div class="sh-dim" aria-hidden="true"></div>'));
    document.body.appendChild(h('<div class="sh-spot" aria-hidden="true"></div>'));
    renderRight(); renderPresenter(); bindKeys();
  }

  /* ── patient pill ── */
  let currentPatient = null;
  function patientSet(p) {
    currentPatient = p; if (!top) return;
    const c = sub; if (!c || c.querySelector('[data-search]')) return;
    c.innerHTML = p
      ? `<a class="sh-patient enter" href="akte.html" title="Akte öffnen" data-private><span class="av" ${p.photo ? `style="background-image:url('${p.photo}')"` : ''}>${p.photo ? '' : esc(p.initials)}</span><span class="nm">${esc(p.name)}</span><span class="dob">*${esc(p.dob)}${p.age ? ` (${p.age})` : ''}</span></a>`
      : `<div class="sh-patient is-empty"><span>Kein Patient</span><span class="sep">·</span><span>Praxis</span></div>`;
  }

  /* ── right cluster ── */
  function renderRight() {
    if (!top) return;
    const r = top.querySelector('.sh-right'); const warn = Object.values(svc).find((s) => s.state !== 'ok');
    const isA = settings.role === 'arzt', person = isA ? D.practice.doctor : D.practice.assistant;
    r.innerHTML = `<button class="sh-svc" type="button" data-svc aria-label="Externe Dienste${warn ? ': Störung' : ': alle bereit'}">${Object.values(svc).map((s) => `<i class="${s.state !== 'ok' ? 'warn' : ''}"></i>`).join('')}${warn ? `<span class="lbl">${esc(warn.label)} gestört</span>` : ''}</button>
      ${page !== 'hub' ? micHTML() : ''}
      ${page !== 'hub' ? `<button class="sh-circle sh-inbox" type="button" data-inbox aria-label="Posteingang · 25 neu">${ICON('inbox', { size: 19 })}<span class="badge">25</span></button>` : ''}
      <button class="sh-avatar ${isA ? '' : 'assist'}" type="button" data-me aria-label="${esc(person.name)} · ${isA ? 'Arzt' : 'Assistenz'} · Einstellungen" ${isA && person.photo ? `style="background-image:url('${person.photo}')"` : ''}>${isA && person.photo ? '' : person.initials}</button>`;
    r.querySelector('[data-svc]').onclick = (e) => openServices(e.currentTarget);
    r.querySelector('[data-me]').onclick = (e) => openSettings(e.currentTarget);
    const ib = r.querySelector('[data-inbox]'); if (ib) ib.onclick = () => notice({ text: 'Posteingang ist nicht Teil dieses Konzepts', detail: 'Klinische Entscheidungen stehen auf dem Desk unter „Wartet auf Sie“.', tone: 'info', ms: 2800 });
    bindMic();
  }
  function micHTML() {
    const s = mic.state;
    if (s === 'recording') return `<span class="sh-mic" data-state="recording" role="status"><span class="sq" aria-hidden="true"></span>Mitschrift <span>${esc(mic.time || '00:00')}</span><button class="mb" type="button" data-mp aria-label="Mitschrift pausieren">${ICON('pause', { size: 12 })}</button><button class="mb" type="button" data-ms aria-label="Mitschrift beenden">${ICON('stop', { size: 12 })}</button></span>`;
    if (s === 'command') return `<span class="sh-mic" data-state="command" role="status">${ICON('mic', { size: 14 })}Hört zu</span>`;
    if (s === 'off') return `<span class="sh-mic" data-state="off">${ICON('mic-off', { size: 14 })}Mikro aus</span>`;
    return `<button class="sh-mic sh-circle" type="button" data-state="ready" data-micbtn title="Zum Sprechen ${isMac() ? '⌥' : 'Alt'} halten" aria-label="Mikrofon bereit · ${isMac() ? '⌥' : 'Alt'} halten">${ICON('mic', { size: 19 })}</button>`;
  }
  function bindMic() { if (!top) return; const m = top.querySelector('.sh-mic'); if (!m) return; if (m.matches('[data-micbtn]')) m.onclick = () => ptt.start('click'); const a = m.querySelector('[data-mp]'), b = m.querySelector('[data-ms]'); if (a && mic.onPause) a.onclick = mic.onPause; if (b && mic.onStop) b.onclick = mic.onStop; }
  function micSet(state, o = {}) { mic = Object.assign({}, o, { state }); if (!top) return; const old = top.querySelector('.sh-mic'); if (!old) return; old.replaceWith(h(micHTML())); bindMic(); }
  function svcSet(id, state, detail) { if (!svc[id]) return; svc[id].state = state; if (detail) svc[id].detail = detail; renderRight(); }
  const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  /* ── popovers + Esc layers ── */
  const layerStack = []; let escEmpty = null;
  const layers = { push(l) { layerStack.push(l); return () => layers.remove(l); }, remove(l) { const i = layerStack.indexOf(l); if (i >= 0) layerStack.splice(i, 1); }, top() { return layerStack[layerStack.length - 1]; } };
  let pop = null;
  function closePop() { if (!pop) return; pop.el.remove(); document.removeEventListener('pointerdown', pop.outside, true); layers.remove(pop.layer); pop = null; }
  function popover(anchor, content, o = {}) {
    closePop();
    const el = h('<div class="sh-pop" role="dialog"></div>'); if (typeof content === 'string') el.innerHTML = content; else el.appendChild(content);
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight;
    let left = o.align === 'left' ? r.left : o.align === 'center' ? r.left + r.width / 2 - w / 2 : r.right - w; left = Math.max(12, Math.min(left, innerWidth - w - 12));
    let t = r.bottom + (o.offset || 8); if (t + hh > innerHeight - 12) { t = r.top - hh - (o.offset || 8); el.style.transformOrigin = 'bottom center'; }
    el.style.left = left + 'px'; el.style.top = Math.max(12, t) + 'px';
    const outside = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closePop(); };
    setTimeout(() => document.addEventListener('pointerdown', outside, true));
    const layer = { close: closePop }; layers.push(layer);
    pop = { el, outside, layer }; return { el, close: closePop };
  }
  function openServices(a) {
    const warn = Object.values(svc).find((s) => s.state !== 'ok');
    popover(a, `<div style="width:340px"><div class="pop-sec"><div class="pop-lbl">Externe Dienste</div>${Object.values(svc).map((s) => `<div class="pop-row"><span class="grow"><b style="font-weight:600">${esc(s.label)}</b><div class="sub">${esc(s.detail)}</div></span><span class="svc-state ${s.state !== 'ok' ? 'warn' : ''}">${s.state === 'ok' ? 'bereit' : 'gestört'}</span></div>`).join('')}</div>
      ${warn ? `<div class="pop-sec"><div class="pop-lbl">Was jetzt?</div><div class="pop-note"><b style="color:var(--text-1)">${esc(warn.label)} gestört — kein Problem des Patienten.</b><br>Behandlung läuft weiter. Übermittlungen werden automatisch nachgeholt und bis dahin als offene Nacherfassung geführt.</div></div>`
             : '<div class="pop-note">Immer sichtbar statt Admin-Seite: Wer um 07:30 weiß, dass das e-card-System hängt, erfährt es nicht erst um 08:05 mit Patient im Raum.</div>'}</div>`);
  }
  function segHTML(key, opts) { return `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-set="${key}" data-val="${v}" aria-pressed="${settings[key] === v}">${l}</button>`).join('')}</div>`; }
  function wirePop(p) {
    p.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-set]'); if (b) { set(b.dataset.set, b.dataset.val); p.el.querySelectorAll(`[data-set="${b.dataset.set}"]`).forEach((x) => x.setAttribute('aria-pressed', x === b)); return; }
      const t = e.target.closest('[data-toggle]'); if (t) { const k = t.dataset.toggle; set(k, !settings[k]); t.setAttribute('aria-checked', !!settings[k]); return; }
      const r = e.target.closest('[data-reset]'); if (r) { store.clear(); story.reset(); location.href = location.pathname + '?fresh'; }
    });
  }
  function openMe(a) {
    const d = D.practice.doctor, s = D.practice.assistant;
    wirePop(popover(a, `<div style="width:300px"><div class="pop-sec"><div class="pop-row" style="padding:4px 0"><span class="grow"><b style="font-weight:650">${esc(settings.role === 'arzt' ? d.name : s.name)}</b><div class="sub">${settings.role === 'arzt' ? 'Arzt · ' + d.fach : 'Ordinationsassistenz'} · ${esc(D.practice.room)}</div></span></div></div>
      <div class="pop-sec"><div class="pop-lbl">Rolle (Demo)</div>${segHTML('role', [['arzt', 'Arzt'], ['assistenz', 'Assistenz']])}<div class="pop-note" style="padding-left:0">Klinische Aktionen fehlen in der Assistenz-Ansicht — nicht ausgegraut (§ 9 MABG).</div></div></div>`));
  }
  function openSettings(a) {
    wirePop(popover(a, `<div style="width:320px">
      <div class="pop-sec"><div class="pop-row" style="padding:2px 0 6px"><span class="grow"><b style="font-weight:600">${esc(settings.role === 'arzt' ? D.practice.doctor.name : D.practice.assistant.name)}</b><div class="sub">${settings.role === 'arzt' ? 'Arzt · ' + D.practice.doctor.fach : 'Ordinationsassistenz'} · ${esc(D.practice.room)}</div></span></div>
        <div class="pop-lbl">Rolle (Demo)</div>${segHTML('role', [['arzt', 'Arzt'], ['assistenz', 'Assistenz']])}<div class="pop-note" style="padding-left:0">Klinische Aktionen fehlen in der Assistenz-Ansicht — nicht ausgegraut (§ 9 MABG).</div></div>
      <div class="pop-sec"><div class="pop-lbl">Glas</div>${segHTML('glass', [['clear', 'Klar'], ['tinted', 'Getönt'], ['solid', 'Solide']])}<div class="pop-note" style="padding-left:0">Wirkt nur auf Bedienelemente. Klinische Werte stehen immer auf fast deckenden Flächen. Eigene Einstellung, weil Safari „Transparenz reduzieren“ nicht an Webseiten weitergibt.</div></div>
      <div class="pop-sec">
        <div class="pop-row"><span class="grow">Sichtschutz<div class="sub">Namen verbergen · Taste S</div></span><button class="switch" role="switch" data-toggle="privacy" aria-checked="${!!settings.privacy}"></button></div>
        <div class="pop-row"><span class="grow">Bewegung reduzieren</span><button class="switch" role="switch" data-toggle="reduceMotion" aria-checked="${!!settings.reduceMotion}"></button></div>
        <div class="pop-row"><span class="grow">Töne</span><button class="switch" role="switch" data-toggle="sound" aria-checked="${!!settings.sound}"></button></div>
        ${voice.ok ? `<div class="pop-row"><span class="grow">Echte Spracheingabe (Demo)<div class="sub">${isMac() ? '⌥' : 'Alt'} halten und frei sprechen · de-AT</div></span><button class="switch" role="switch" data-toggle="realVoice" aria-checked="${!!settings.realVoice}"></button></div>` : '<div class="pop-note">Echte Spracheingabe: in Chrome/Safari über http(s) verfügbar. Hier simuliert über Vorschläge.</div>'}
        <div class="pop-row" data-reset style="cursor:pointer"><span class="grow">Demo zurücksetzen</span>${ICON('undo', { size: 15 })}</div>
      </div></div>`));
  }

  /* ── presenter pill (pitch layer) ── */
  function renderPresenter() {
    if (page === 'hub') return;
    if (!presEl) { presEl = h('<div class="sh-presenter" role="toolbar" aria-label="Konzept-Steuerung"></div>'); document.body.appendChild(presEl); }
    presEl.innerHTML = `<span class="tag">Konzept</span>
      <a class="pbtn" href="index.html" title="Konzept & Begründung">${ICON('sparkles', { size: 13 })}Konzept</a>
      <button class="pbtn" type="button" data-why aria-pressed="${pins.on}">${ICON('help', { size: 13 })}Warum?</button>
      ${presExtra.map((b, i) => `<button class="pbtn" type="button" data-px="${i}" ${b.pressed ? `aria-pressed="${!!b.pressed()}"` : ''} title="${esc(b.title || '')}">${b.icon ? ICON(b.icon, { size: 13 }) : ''}${esc(typeof b.label === 'function' ? b.label() : b.label)}</button>`).join('')}`;
    presEl.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => set('theme', b.dataset.t)));
    presEl.querySelector('[data-why]').onclick = () => pins.toggle();
    presEl.querySelectorAll('[data-px]').forEach((b) => (b.onclick = (e) => { presExtra[+b.dataset.px].onClick(e.currentTarget); renderPresenter(); }));
  }
  function presenter(list) { presExtra = list || []; renderPresenter(); }

  /* ── notices ── */
  function notice(o) {
    if (!noticesEl) return;
    const el = h(`<div class="sh-notice" role="status"><span class="ni ${o.tone || ''}">${ICON(o.icon || (o.tone === 'ok' ? 'check' : o.tone === 'warn' ? 'alert' : o.tone === 'ai' ? 'sparkles' : 'info'), { size: 13 })}</span><span><b style="font-weight:600">${esc(o.text)}</b>${o.detail ? ` <span class="d">${esc(o.detail)}</span>` : ''}</span></div>`);
    noticesEl.appendChild(el); el.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.23,1,0.32,1)' });
    announce(o.text + (o.detail ? '. ' + o.detail : ''));
    setTimeout(() => { el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 180, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => el.remove()); }, o.ms || 3200);
  }
  function announce(t) { if (!liveEl) return; liveEl.textContent = ''; setTimeout(() => (liveEl.textContent = t), 30); }

  /* ── capsule ── */
  const ticks = () => { let s = ''; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; s += `<line data-i="${i}" x1="${16 + Math.cos(a) * 11}" y1="${16 + Math.sin(a) * 11}" x2="${16 + Math.cos(a) * 13}" y2="${16 + Math.sin(a) * 13}"/>`; } return s; };
  function capsuleHTML() {
    const k = isMac() ? '⌥' : 'Alt';
    return `<div class="sh-capsule" data-state="idle" role="group" aria-label="Sprach- und Befehlsleiste">
      <div class="cl cl-idle"><button class="orb" type="button" data-orb aria-label="Sprechen (${k} halten)"><svg viewBox="0 0 32 32" aria-hidden="true">${ticks()}</svg><span class="core"></span></button><span class="cap-ph" data-open>Fragen oder anweisen …</span><span class="cap-hints"><span class="ckbd">${k}</span> halten <span class="ckbd">${isMac() ? '⌘K' : 'Strg K'}</span></span></div>
      <div class="cl cl-type"><span class="orb" aria-hidden="true"><svg viewBox="0 0 32 32">${ticks()}</svg><span class="core"></span></span><input type="text" data-input placeholder="Befehl oder Frage tippen · Enter" aria-label="Befehl eingeben" autocomplete="off"><span class="ckbd">Esc</span></div>
      <div class="cl cl-listen"><span class="orb" aria-hidden="true"><svg viewBox="0 0 32 32">${ticks()}</svg><span class="core"></span></span><span class="cap-tx" data-tx></span><span class="cap-meta">Loslassen zum Senden</span></div>
      <div class="cl cl-und"><span class="orb" aria-hidden="true"><svg viewBox="0 0 32 32">${ticks()}</svg><span class="core"></span></span><span class="cap-tx" data-utx></span><span class="intents" data-intents></span></div>
      <div class="cl cl-clar" data-clar></div>
      <div class="cl cl-conf" data-conf></div>
      <div class="cl cl-res"><span class="okr">${ICON('check', { size: 15 })}</span><span class="res-tx" data-res></span></div>
      <div class="cl cl-err"><span class="ei">${ICON('alert', { size: 18 })}</span><span class="res-tx" data-err style="font-size:14px"></span></div>
      <div class="cl cl-amb"><span class="orb" aria-hidden="true"><svg viewBox="0 0 32 32">${ticks()}</svg><span class="core"></span></span><span class="amb"><span class="meter">${'<i></i>'.repeat(5)}</span><span data-amb></span></span><span data-ambact style="display:flex;gap:6px"></span></div>
    </div>`;
  }
  const SZ = { idle: [548, 53], typing: [560, 56], listening: [660, 62], understanding: [660, 62], result: [540, 56], error: [640, 56], ambient: [620, 56] };
  class Capsule {
    constructor(el, wrap) {
      this.el = el; this.wrap = wrap; this.state = 'idle'; this.gen = 0; this.level = 0; this.raf = null; this.busy = false; this._amb = null;
      el.querySelector('[data-orb]').addEventListener('click', () => ptt.start('click'));
      el.querySelector('[data-open]').addEventListener('click', () => this.typing());
      const inp = el.querySelector('[data-input]');
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && inp.value.trim()) { const v = inp.value.trim(); inp.value = ''; intents.run(v); }
        if (e.key === 'Escape') { e.stopPropagation(); inp.value = ''; this.idle(); }
      });
    }
    setState(s, size) {
      this.state = s; this.el.dataset.state = s; this.wrap.dataset.state = s;
      const [w, hh] = size || SZ[s] || SZ.idle; this.el.style.setProperty('--cw', Math.min(w, innerWidth - 260) + 'px'); this.el.style.setProperty('--ch', hh + 'px');
      chipsEl.classList.toggle('is-hidden', !(s === 'idle' || s === 'ambient'));
      document.body.classList.toggle('is-listening', s === 'listening');
      if (s === 'listening' || s === 'ambient') this.loop(); else this.stopLoop();
    }
    idle() { this.gen++; edge(false); if (mic.state === 'command') micSet('ready'); if (this._amb) { this.setState('ambient'); this.renderAmb(); } else this.setState('idle'); }
    typing() { this.setState('typing'); const i = this.el.querySelector('[data-input]'); setTimeout(() => i.focus(), 60); }
    setLevel(v) { this.level = v; }
    loop() {
      if (this.raf) return; let t = 0;
      const lines = [...this.el.querySelectorAll('.orb line')]; const bars = [...this.el.querySelectorAll('.meter i')];
      const f = () => {
        t++;
        const base = this.state === 'listening' ? (this._speaking ? 0.85 : 0.18) : (this._amb ? (this._ambLevel != null ? this._ambLevel : 0.4) : 0);
        lines.forEach((l, i) => { const v = Math.max(0, Math.min(1, base * (0.4 + 0.6 * Math.abs(Math.sin(t / 6 + i * 0.9))) + (Math.random() - 0.5) * 0.2 * base)); const a = (i % 24) / 24 * Math.PI * 2; const r2 = 13 + v * 3; l.setAttribute('x2', 16 + Math.cos(a) * r2); l.setAttribute('y2', 16 + Math.sin(a) * r2); });
        bars.forEach((b, i) => b.style.setProperty('--h', Math.max(0.1, Math.min(1, base * (0.5 + 0.5 * Math.abs(Math.sin(t / 5 + i * 1.7))))).toFixed(2)));
        if (edgeEl) edgeEl.style.setProperty('--thick', (2 + base * 3 * (0.6 + 0.4 * Math.abs(Math.sin(t / 7)))).toFixed(1) + 'px');
        this.raf = requestAnimationFrame(f);
      };
      this.raf = requestAnimationFrame(f);
    }
    stopLoop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; this.el.querySelectorAll('.orb line').forEach((l, i) => { const a = (i % 24) / 24 * Math.PI * 2; l.setAttribute('x2', 16 + Math.cos(a) * 13); l.setAttribute('y2', 16 + Math.sin(a) * 13); }); }
    /* simulated speech: types the utterance as a live transcript. Resolves with the text (or null if superseded). */
    async listen(text, o = {}) {
      const g = ++this.gen; const cps = o.cps || 24;
      this.setState('listening'); edge(true); micSet('command'); sound.listen();
      const tx = this.el.querySelector('[data-tx]'); tx.innerHTML = '<span class="caret"></span>';
      await sleep(reduced() ? 30 : 340); if (g !== this.gen) return null;
      this._speaking = true;
      for (let i = 1; i <= text.length; i++) { if (g !== this.gen) { this._speaking = false; return null; } tx.innerHTML = esc(text.slice(0, i)) + '<span class="caret"></span>'; if (!reduced() && !this._ff) await sleep(1000 / cps + (text[i - 1] === ' ' ? 26 : 0)); }
      this._speaking = false; this._ff = false;
      await sleep(reduced() ? 30 : 360); if (g !== this.gen) return null;
      tx.textContent = text; edge(false); sound.end(); micSet(this._amb ? 'recording' : 'ready', this._amb ? this._amb.mic || {} : {});
      this._last = text; return text;
    }
    fastForward() { this._ff = true; }
    /* heard → understood: the transcript stays, the key span is highlighted, other words fade, tokens appear */
    async understand(text, o = {}) {
      const g = this.gen; text = text || this._last || '';
      this.setState('understanding');
      const u = this.el.querySelector('[data-utx]'); const box = this.el.querySelector('[data-intents]'); box.innerHTML = '';
      const hl = o.highlight; let htmlTx = esc(text);
      if (hl && text.toLowerCase().includes(hl.toLowerCase())) { const i = text.toLowerCase().indexOf(hl.toLowerCase()); htmlTx = `<span class="w">${esc(text.slice(0, i))}</span><mark>${esc(text.slice(i, i + hl.length))}</mark><span class="w">${esc(text.slice(i + hl.length))}</span>`; }
      else htmlTx = `<span class="w">${esc(text)}</span>`;
      u.innerHTML = htmlTx; u.classList.remove('hl', 'fade');
      await sleep(reduced() ? 0 : 60); u.classList.add('hl'); await sleep(reduced() ? 0 : 220); u.classList.add('fade');
      for (const it of (o.intents || [])) { if (g !== this.gen) return; await sleep(reduced() ? 0 : 140); box.appendChild(h(`<span class="intent enter">${esc(it)}</span>`)); }
      await sleep(reduced() ? 60 : (o.ms || 700));
    }
    clarify({ question, hint, options }) {
      return new Promise((resolve) => {
        const g = ++this.gen; const box = this.el.querySelector('[data-clar]');
        box.innerHTML = `<div class="clq">${ICON('help', { size: 17 })}<span>${esc(question)}</span><span class="muted">${esc(hint || 'Klicken, Zahl drücken oder sagen')}</span></div><div class="clo" role="listbox">${options.map((op, i) => `<button type="button" role="option" data-i="${i}" class="${i === 0 ? 'is-active' : ''}"><span class="n">${i + 1}</span><span><div class="t" data-private>${esc(op.title)}</div><div class="m">${esc(op.meta || '')}</div></span>${op.badge ? `<span class="b">${esc(op.badge)}</span>` : ''}</button>`).join('')}</div>`;
        this.setState('clarify', [660, 82 + options.length * 64]);
        let act = 0; const btns = [...box.querySelectorAll('button')];
        const done = (i) => { document.removeEventListener('keydown', key, true); layers.remove(layer); if (g === this.gen) resolve(i); };
        const layer = { close: () => { done(-1); this.idle(); } }; layers.push(layer);
        btns.forEach((b) => (b.onclick = () => done(+b.dataset.i)));
        const key = (e) => {
          if (/^[1-9]$/.test(e.key) && +e.key <= options.length) { e.preventDefault(); done(+e.key - 1); }
          else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('is-active', i === act)); }
          else if (e.key === 'Enter') { e.preventDefault(); done(act); }
        };
        document.addEventListener('keydown', key, true);
      });
    }
    /* free-form expanded content inside the capsule (page supplies html + binder) */
    confirm({ html: body, width = 660, height = 200, bind }) {
      return new Promise((resolve) => {
        const g = ++this.gen; const box = this.el.querySelector('[data-conf]'); box.innerHTML = body;
        this.setState('confirm', [width, height]);
        const done = (v) => { layers.remove(layer); if (g === this.gen) resolve(v); };
        const layer = { close: () => { done(null); this.idle(); } }; layers.push(layer);
        bind && bind(box, done);
      });
    }
    async result(text, o = {}) {
      const g = ++this.gen; this.setState('result');
      this.el.querySelector('[data-res]').innerHTML = esc(text) + (o.sub ? `<small>${esc(o.sub)}</small>` : '');
      announce(text); await sleep(reduced() ? 500 : (o.ms || 2200)); if (g === this.gen && this.state === 'result') this.idle();
    }
    async error(text, o = {}) {
      const g = ++this.gen; this.setState('error'); this.el.querySelector('[data-err]').textContent = text; announce(text); sound.warn();
      await sleep(o.ms || 3200); if (g === this.gen && this.state === 'error') this.idle();
    }
    ambient(o) { this._amb = o; this.renderAmb(); this.setState('ambient'); }
    updateAmbient(patch) { if (!this._amb) return; Object.assign(this._amb, patch); this.renderAmb(); }
    renderAmb() {
      const o = this._amb; if (!o) return;
      this.el.querySelector('[data-amb]').innerHTML = o.label || '';
      const a = this.el.querySelector('[data-ambact]'); a.innerHTML = '';
      (o.actions || []).forEach((x) => { const b = h(`<button class="cbtn ${x.primary ? 'primary' : ''}" type="button">${x.icon ? ICON(x.icon, { size: 13 }) : ''}${esc(x.label)}</button>`); b.onclick = x.onClick; a.appendChild(b); });
    }
    endAmbient() { this._amb = null; this.idle(); }
  }

  /* ── Tier-1 undo bubble ── */
  let undoEl = null;
  function undo(o) {
    if (!capwrap) return;
    if (undoEl) undoEl.remove();
    const sec = o.seconds || 8, C = 2 * Math.PI * 16;
    undoEl = h(`<div class="sh-undo enter open" role="status"><span class="ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,.14)"/><circle data-arc cx="18" cy="18" r="16" stroke="#f2f4f8" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>${ICON('undo', { size: 14 })}</span><span class="tx">${esc(o.text)}</span><button class="cbtn" type="button" data-u>Rückgängig</button></div>`);
    capwrap.appendChild(undoEl);
    const arc = undoEl.querySelector('[data-arc]'); const el = undoEl;
    const anim = arc.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: C }], { duration: sec * 1000, easing: 'linear', fill: 'forwards' });
    setTimeout(() => el.classList.remove('open'), 2600);
    const finish = (undone) => { anim.cancel(); el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-40px) scale(.6)' }], { duration: 260, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => el.remove()); if (undoEl === el) undoEl = null; if (undone) { o.onUndo && o.onUndo(); notice({ text: 'Rückgängig gemacht', tone: 'info', ms: 1800 }); } else o.onCommit && o.onCommit(); };
    el.querySelector('[data-u]').onclick = () => finish(true);
    anim.finished.then(() => { if (el.isConnected) finish(false); }).catch(() => {});
    sound.success(); announce(o.text);
  }

  /* ── edge light ── */
  function edge(on) { if (!edgeEl) return; if (reduced()) on = false; edgeEl.classList.toggle('is-on', !!on); edgeEl.classList.toggle('is-off', !on); }

  /* ── intents + chips ── */
  let intentList = [];
  const intents = {
    register(list) { intentList = list || []; },
    find(idOrText) { const byId = intentList.find((i) => i.id === idOrText); if (byId) return byId; const n = norm(idOrText); return intentList.find((it) => allowed(it) && (it.match || []).some((m) => (m instanceof RegExp ? m.test(n) : n.includes(norm(m))))); },
    async run(idOrText, o = {}) {
      const cap = Shell.capsule; if (!cap) return;
      const it = intents.find(idOrText);
      if (!it || !allowed(it)) {
        missCount++; const ex = chipList[0] ? (intents.find(chipList[0].intent) || {}).utter || chipList[0].label : 'Öffne Herrn Demir';
        return cap.error(missCount > 1 ? `Nicht verstanden: „${idOrText}“ — bitte einen Vorschlag antippen` : `Nicht verstanden — z. B. „${ex}“`);
      }
      missCount = 0; if (cap.busy) return; cap.busy = true;
      try { if (o.simulate) { const r = await cap.listen(it.utter || it.label || idOrText); if (r === null) return; } await it.act(o.simulate ? (it.utter || '') : idOrText); }
      catch (e) { console.error(e); }
      finally { cap.busy = false; if (!['result', 'clarify', 'confirm', 'ambient', 'error'].includes(cap.state)) cap.idle(); }
    },
  };
  let missCount = 0;
  const allowed = (it) => !it.roles || it.roles.includes(settings.role);
  let chipList = [];
  function chips(list) {
    chipList = (list || []).filter((c) => { const it = c.intent ? intents.find(c.intent) : null; return !it || allowed(it); });
    if (!chipsEl) return; chipsEl.innerHTML = '';
    chipList.forEach((c, i) => { const b = h(`<button class="sh-chip enter" type="button" style="animation-delay:${i * 45}ms">${ICON(c.icon || 'mic', { size: 14 })}<span>${esc(c.label)}</span></button>`); b.onclick = () => runChip(c); chipsEl.appendChild(b); });
  }
  function runChip(c) { if (c.run) { const cap = Shell.capsule; if (cap.busy) return; cap.busy = true; Promise.resolve(c.run()).finally(() => { cap.busy = false; if (!['result', 'clarify', 'confirm', 'ambient'].includes(cap.state)) cap.idle(); }); return; } intents.run(c.intent, { simulate: true }); }

  /* ── real voice (Web Speech API; opt-in demo; hidden on file://) ── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voice = { ok: !!SR && location.protocol !== 'file:', rec: null, active: false };
  function realStart() {
    if (!voice.ok || !settings.realVoice || voice.active) return false;
    const cap = Shell.capsule; const rec = new SR(); voice.rec = rec; voice.active = true; cap.gen++;
    rec.lang = 'de-AT'; rec.interimResults = true; rec.continuous = false;
    let fin = ''; cap.setState('listening'); edge(true); micSet('command'); sound.listen(); cap._speaking = true;
    const tx = cap.el.querySelector('[data-tx]'); tx.innerHTML = '<span class="caret"></span>';
    rec.onresult = (e) => { let s = ''; for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; fin = s; tx.innerHTML = esc(s) + '<span class="caret"></span>'; };
    rec.onerror = () => {};
    rec.onend = () => { voice.active = false; cap._speaking = false; edge(false); micSet(cap._amb ? 'recording' : 'ready', cap._amb ? cap._amb.mic || {} : {}); if (fin.trim()) { cap._last = fin.trim(); tx.textContent = fin; sound.end(); intents.run(fin.trim()); } else cap.idle(); };
    try { rec.start(); } catch (e) { voice.active = false; return false; }
    return true;
  }
  function realStop() { if (voice.rec && voice.active) { try { voice.rec.stop(); } catch (e) {} } }

  /* ── push-to-talk: ⌥/Alt pressed ALONE and held ≥ 200 ms, outside text fields, not while dragging ── */
  let pttHandler = null;
  const ptt = {
    timer: null, armed: false,
    start(src) {
      const cap = Shell.capsule; if (!cap || cap.busy) { if (cap && cap.state === 'listening') cap.fastForward(); return; }
      if (pttHandler) return pttHandler(src);
      if (realStart()) return;
      if (chipList[0]) runChip(chipList[0]);
    },
  };
  function onPTT(fn) { pttHandler = fn; }
  const inField = () => { const a = document.activeElement; return !!a && (/INPUT|TEXTAREA|SELECT/.test(a.tagName) || a.isContentEditable); };

  /* ── keys ── */
  const binds = [];
  const keys = { bind(key, fn, o = {}) { binds.push({ key, fn, o }); } };
  function onEscEmpty(fn) { escEmpty = fn; }
  function bindKeys() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Alt') { if (e.repeat || inField() || Shell.dragging) return; clearTimeout(ptt.timer); ptt.armed = true; ptt.timer = setTimeout(() => { if (ptt.armed) { ptt.armed = false; ptt.start('key'); } }, 200); return; }
      if (ptt.armed) { ptt.armed = false; clearTimeout(ptt.timer); }                      // any other key cancels (e.g. ⌥L = @)
      if (e.key === 'Escape') {
        const l = layers.top(); if (l) { e.preventDefault(); l.close(); return; }
        if (pins.on) { pins.toggle(false); return; }
        if (Shell.capsule && ['typing', 'error', 'result', 'understanding'].includes(Shell.capsule.state)) { Shell.capsule.idle(); return; }
        if (escEmpty && !inField()) escEmpty(); return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); Shell.capsule && Shell.capsule.typing(); return; }
      if (inField() || e.metaKey || e.ctrlKey || e.altKey) { binds.filter((b) => b.o.allowInInput && b.key === e.key).forEach((b) => b.fn(e)); return; }
      if (e.key === ' ' && (document.activeElement === document.body || !document.activeElement)) { e.preventDefault(); ptt.start('space'); return; }
      if (e.key === '?') { e.preventDefault(); pins.toggle(); return; }
      if (e.key === 'P' && e.shiftKey) { e.preventDefault(); document.body.classList.toggle('presenter-hidden'); return; }
      if (e.key === 's' || e.key === 'S') { set('privacy', !settings.privacy); return; }
      if (pins.on && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); pins.step(e.key === 'ArrowRight' ? 1 : -1); return; }
      binds.filter((b) => b.key === e.key).forEach((b) => b.fn(e));
    });
    document.addEventListener('keyup', (e) => { if (e.key === 'Alt') { ptt.armed = false; clearTimeout(ptt.timer); realStop(); } if (e.key === ' ') realStop(); });
    document.addEventListener('pointerdown', () => { if (ptt.armed) { ptt.armed = false; clearTimeout(ptt.timer); } }, true);
    window.addEventListener('blur', () => { ptt.armed = false; clearTimeout(ptt.timer); realStop(); });
  }

  /* ── pins ── */
  const IMG = { 'before/sprachstart.webp': [2000, 1090], 'before/karteikarte.webp': [2000, 1094] };
  const pins = {
    all: [], list: [], on: false, sceneId: '', layer: null, card: null, active: -1, raf: null, jumpFn: null,
    set(list) { this.all = list || []; this.filter(); if (this.on) this.render(); },
    setScene(id) { this.sceneId = id; this.filter(); if (this.on) this.render(); },
    onJump(fn) { this.jumpFn = fn; },
    filter() { this.list = this.all.filter((p) => !p.scenes || p.scenes.includes(this.sceneId) || p.scenes.includes('*')); },
    toggle(force) { this.on = typeof force === 'boolean' ? force : !this.on; document.body.classList.toggle('pins-on', this.on); renderPresenter(); if (this.on) this.render(); else this.clear(); bus.emit('pins', this.on); },
    clear() { cancelAnimationFrame(this.raf); if (this.layer) this.layer.remove(); this.layer = null; this.closeCard(); const s = document.querySelector('.sh-spot'); if (s) s.classList.remove('has-target'); },
    render() {
      this.clear(); this.layer = h('<div class="sh-pins" aria-label="Begründungen"></div>');
      this.list.forEach((p, i) => { const b = h(`<button class="pin" type="button" style="animation-delay:${i * 30}ms" aria-label="Begründung ${i + 1}: ${esc(p.title)}">${i + 1}</button>`); b.onclick = (e) => { e.stopPropagation(); this.open(i); }; p._el = b; this.layer.appendChild(b); });
      const other = this.all.filter((p) => !this.list.includes(p) && p.scenes && p.scenes[0]);
      if (other.length && this.jumpFn) { const sc = other[0].scenes[0]; const b = h(`<button class="pin-more" type="button">+${other.length} weitere Begründungen in anderen Szenen →</button>`); b.onclick = () => this.jumpFn(sc); this.layer.appendChild(b); }
      document.body.appendChild(this.layer);
      const tick = () => { this.position(); this.raf = requestAnimationFrame(tick); }; tick();
    },
    target(p) { return [...document.querySelectorAll(p.target)].find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }); },
    position() {
      this.list.forEach((p) => { if (!p._el) return; const t = this.target(p); if (!t) { p._el.style.display = 'none'; return; }
        const r = t.getBoundingClientRect(), a = p.anchor || 'tl', off = p.offset || [0, 0];
        const x = (a.includes('r') ? r.right - 12 : a === 'c' ? r.left + r.width / 2 : r.left + 12) + off[0], y = (a.includes('b') ? r.bottom - 12 : a === 'c' ? r.top + r.height / 2 : r.top + 12) + off[1];
        p._el.style.display = ''; p._el.style.left = x + 'px'; p._el.style.top = y + 'px'; });
      const spot = document.querySelector('.sh-spot'); const p = this.list[this.active];
      if (spot && p) { const t = this.target(p); if (t) { const r = t.getBoundingClientRect(); Object.assign(spot.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' }); spot.classList.add('has-target'); } else spot.classList.remove('has-target'); }
      if (this.card) this.place();
    },
    open(i) {
      this.closeCard(); this.active = i; const p = this.list[i]; if (!p) return;
      this.list.forEach((q, j) => q._el && q._el.classList.toggle('is-active', j === i));
      let before = '';
      if (p.before) {
        const b = p.before, sz = IMG[b.img] || [2000, 1100], w = Math.min(99.9, b.w), hh = Math.min(99.9, b.h);
        const ar = (w * sz[0]) / (hh * sz[1]);
        before = `<div class="pin-before" style="aspect-ratio:${ar.toFixed(3)};background-image:url('${b.img}');background-size:${(100 / w) * 100}% auto;background-position:${(b.x / (100 - w)) * 100}% ${(b.y / (100 - hh)) * 100}%"></div><div class="pin-cap">${esc(b.caption || '')}</div>`;
      }
      const card = h(`<div class="pin-card" role="dialog" aria-label="${esc(p.title)}"><h4><span>#${i + 1}</span>${esc(p.title)}</h4>${before}
        <div class="pin-k">Problem</div><p>${p.problem}</p><div class="pin-k decision">Decision</div><p>${p.decision}</p>${p.why ? `<div class="pin-k">Why</div><p>${p.why}</p>` : ''}
        ${p.sources && p.sources.length ? `<div class="pin-src">${p.sources.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`).join('')}</div>` : ''}
        <div class="pin-nav"><button type="button" data-p>← Zurück</button><span>${i + 1} / ${this.list.length} · Esc</span><button type="button" data-n>Weiter →</button></div></div>`);
      card.querySelector('[data-p]').onclick = () => this.step(-1); card.querySelector('[data-n]').onclick = () => this.step(1);
      document.body.appendChild(card); this.card = card; this.place();
      const t = this.target(p) || document.querySelector(p.target); if (t) { const r = t.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 20) t.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
      this._layer = { close: () => this.closeCard() }; layers.push(this._layer);
      this._out = (e) => { if (!card.contains(e.target) && !e.target.closest('.pin')) this.closeCard(); }; setTimeout(() => document.addEventListener('pointerdown', this._out, true));
    },
    place() { const p = this.list[this.active]; if (!p || !p._el || !this.card) return; const r = p._el.getBoundingClientRect(), w = this.card.offsetWidth, hh = this.card.offsetHeight;
      let left = r.right + 14; if (left + w > innerWidth - 16) left = r.left - w - 14; if (left < 16) left = Math.max(16, Math.min(innerWidth - w - 16, r.left - w / 2));
      this.card.style.left = left + 'px'; this.card.style.top = Math.max(16, Math.min(r.top - 20, innerHeight - hh - 16)) + 'px'; },
    step(d) { if (!this.list.length) return; this.open(((this.active < 0 ? -1 : this.active) + d + this.list.length) % this.list.length); },
    openById(id) { const i = this.list.findIndex((p) => p.id === id); if (i >= 0) { if (!this.on) this.toggle(true); this.open(i); } },
    closeCard() { if (this.card) this.card.remove(); this.card = null; this.active = -1; document.removeEventListener('pointerdown', this._out, true); if (this._layer) layers.remove(this._layer); this.list.forEach((q) => q._el && q._el.classList.remove('is-active')); const s = document.querySelector('.sh-spot'); if (s) s.classList.remove('has-target'); },
  };

  /* cross-document / theme view transitions reject with AbortError when skipped — harmless, keep the console clean */
  window.addEventListener('unhandledrejection', (e) => { if (e.reason && e.reason.name === 'AbortError') e.preventDefault(); });

  window.Shell = {
    init, h, esc, sleep, norm, store, bus, timers, fmt, sound, story, scene, layers, keys, onEscEmpty, popover, closePopover: closePop, notice, undo, chips, intents, presenter, pins,
    edge, announce, onPTT, set, settings, voice,
    patient: { set: patientSet, get: () => currentPatient }, mic: { set: micSet, get: () => mic.state }, services: { set: svcSet },
    motion: { spring, animate, get reduced() { return reduced(); } }, dragging: false, capsule: null, isMac,
  };
})();
