/* Docline UI — shared clinical components (pure HTML-string renderers + a few behaviours). Global `UI`.
   Used by desk.js and akte.js so both screens read as ONE system. Styles in ui.css.

   UI.avatar(initials, { size, tone })                          → round initials
   UI.identity(p, { compact })                                   → eyebrow identity row "● ALI DEMIR · *11.10.1976" (on every patient-bound card)
   UI.chip(text, { tone:'warn'|'danger'|'ok'|'ai'|'accent'|'rec'|'', icon })
   UI.flag('H'|'L'|'HH'|'LL')                                    → square letter badge (flag ≠ trend)
   UI.trend(delta, dec)                                          → "↘ −0,8" text (never a filled triangle)
   UI.state(kind, detail)   kinds: 'unreviewed' Ungeprüft · 'discussed' Im Gespräch besprochen · 'reviewed' Vidiert · 'draft' KI-Entwurf ·
                            'corrected' korrigiert · 'pending' Nacherfassung offen · 'held' reserviert · 'signed' signiert · 'sent' übermittelt · 'loop' offene Schleife
   UI.tier(n)                                                    → 1 Automatisch · 2 Entwurf · 3 Signatur
   UI.prov(kind)                                                 → field provenance: gehört · aus Akte · abgeleitet (Prüfen) · Standard · nicht gehört
   UI.type(k)                                                    → Kartei type cell (greyscale: mono Kürzel + word)
   UI.aiText(text, { support:[{span,prov,note}] })               → AI ink (stitched rail, italic, KI label, flagged spans)
   UI.sparkline(series, { refMin, refMax, w, h })                → inline SVG
   UI.labCompare(analytes, { dates })                            → multi-analyte chart normalised to each reference band (+ exact table)
   UI.labTable(values)                                           → compact values table rows [name, value, unit, ref, flag]
   UI.medRow(m, { post })                                        → medication row with status stepper (Anfrage→…→eingelöst)
   UI.hint(hint, { resolved })                                   → inline non-blocking clinical hint
   UI.hold(el, { ms, onDone })                                   → turns a .hold button into seal-and-send (pointer + Enter/Space hold)
   UI.val(v, dec, unit)                                          → de-AT value with narrow no-break space */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = (n, s = 14) => window.ICON(n, { size: s });
  const num = (v, dec = 0) => new Intl.NumberFormat('de-AT', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
  const val = (v, dec, unit) => `<span class="tnum u-nbsp">${num(v, dec)}${unit ? ' ' + esc(unit) : ''}</span>`;
  const K = () => (window.DOCLINE.kuerzel || []);

  const UI = {
    val, num,
    avatar(ini, o = {}) { return `<span class="ui-av ${o.tone || ''}" style="--s:${o.size || 28}px">${esc(ini)}</span>`; },
    identity(p, o = {}) { return `<div class="ui-id ${o.compact ? 'compact' : ''}" data-private><span class="ui-id-av">${esc(p.initials)}</span><span>${esc(p.name)}</span><span class="sep">·</span><span class="tnum">*${esc(p.dob)}</span></div>`; },
    chip(text, o = {}) { return `<span class="chip ${o.tone ? 'chip-' + o.tone : ''}">${o.icon ? I(o.icon, 13) : ''}${esc(text)}</span>`; },
    flag(f) { return f ? `<span class="ui-flag ${/L/.test(f) ? 'low' : 'high'} ${f.length > 1 ? 'crit' : ''}" title="${/L/.test(f) ? 'unter' : 'über'} Referenzbereich">${esc(f)}</span>` : ''; },
    trend(delta, dec = 1) { if (delta == null || Math.abs(delta) < Math.pow(10, -dec) / 2) return '<span class="ui-trend">→ unverändert</span>'; return `<span class="ui-trend">${delta < 0 ? '↘' : '↗'} ${delta < 0 ? '−' : '+'}${num(Math.abs(delta), dec)}</span>`; },
    state(kind, detail) {
      const M = {
        unreviewed: ['warn', 'alert', 'Ungeprüft'], discussed: ['warn', 'message', 'Im Gespräch besprochen · Vidierung offen'], reviewed: ['', 'check', 'Vidiert'],
        draft: ['ai', 'sparkles', 'KI-Entwurf'], corrected: ['', 'history', 'korrigiert'], pending: ['warn', 'clock', 'Nacherfassung offen'], held: ['accent', 'lock', 'reserviert'],
        signed: ['', 'signature', 'signiert'], sent: ['ok', 'check', 'übermittelt'], loop: ['warn', 'link', 'offene Schleife'],
      };
      const [tone, icon, label] = M[kind] || ['', 'info', kind];
      return `<span class="ui-state ${tone}">${I(icon, 12)}<span>${esc(label)}${detail ? ` <span class="d">· ${esc(detail)}</span>` : ''}</span></span>`;
    },
    tier(n) { const L = { 1: ['Automatisch', 'undo'], 2: ['Entwurf', 'sparkles'], 3: ['Signatur', 'signature'] }[n] || ['', 'info']; return `<span class="ui-tier t${n}">${I(L[1], 12)}${L[0]}</span>`; },
    prov(kind) {
      const M = { 'gehört': ['heard', 'quote', 'gehört'], 'aus Akte': ['record', 'file', 'aus Akte'], 'abgeleitet': ['derived', 'alert', 'Prüfen'], 'Standard': ['default', 'settings', 'Standard'], 'nicht gehört': ['unheard', 'alert', 'nicht gehört'] };
      const [c, ic, l] = M[kind] || ['default', 'info', kind]; return `<span class="ui-prov ${c}">${I(ic, 11)}${esc(l)}</span>`;
    },
    type(k) { const t = K().find((x) => x.k === k) || { k, label: k }; return `<span class="ui-type ${t.doctorOnly ? 'clin' : ''}"><span class="k">${esc(t.k)}</span><span class="l">${esc(t.label)}</span></span>`; },
    aiText(text, o = {}) {
      let out = esc(text);
      (o.support || []).forEach((s) => { const i = text.indexOf(s.span); if (i >= 0) out = esc(text.slice(0, i)) + `<mark class="ui-unheard" title="${esc(s.note || '')}">${esc(s.span)}</mark>` + esc(text.slice(i + s.span.length)); });
      return `<div class="ui-ink"><span class="ui-ki">KI</span><span class="t">${out}</span></div>`;
    },
    sparkline(series, o = {}) {
      const w = o.w || 84, h = o.h || 24, vs = series.map((s) => s.v); if (!vs.length) return '';
      const lo = Math.min(...vs, o.refMin != null ? o.refMin : Infinity), hi = Math.max(...vs, o.refMax != null ? o.refMax : -Infinity), pad = (hi - lo) * 0.15 || 1;
      const y = (v) => h - 3 - ((v - (lo - pad)) / (hi - lo + 2 * pad)) * (h - 6); const x = (i) => (series.length === 1 ? w / 2 : 3 + (i / (series.length - 1)) * (w - 6));
      const band = (o.refMin != null || o.refMax != null) ? `<rect x="0" y="${y(o.refMax != null ? o.refMax : hi + pad)}" width="${w}" height="${Math.max(0, y(o.refMin != null ? o.refMin : lo - pad) - y(o.refMax != null ? o.refMax : hi + pad))}" class="band"/>` : '';
      const pts = series.map((s, i) => `${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join(' ');
      const last = series[series.length - 1];
      return `<svg class="ui-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${band}<polyline points="${pts}"/>${series.map((s, i) => `<circle cx="${x(i)}" cy="${y(s.v)}" r="${i === series.length - 1 ? 2.6 : 1.6}" class="${s.flag ? 'flag' : ''} ${i === series.length - 1 ? 'last' : ''}"/>`).join('')}</svg>`;
    },
    /* Relative multigraph: each analyte mapped to its own reference band (band = 0..1). Time-proportional x axis. */
    labCompare(analytes, o = {}) {
      const dates = o.dates || ['17.04.2026', '14.08.2026', '25.09.2026'];
      const toT = (d) => { const [dd, mm, yy] = d.split('.').map(Number); return Date.UTC(yy, mm - 1, dd); };
      const t0 = toT(dates[0]), t1 = toT(dates[dates.length - 1]);
      const W = 100, yMin = -0.55, yMax = 1.9; const yp = (r) => (1 - (r - yMin) / (yMax - yMin)) * 100; const xp = (d) => 4 + ((toT(d) - t0) / (t1 - t0)) * 92;
      /* below the band a value sits at least as far down as its relative shortfall (Ferritin 22 of 30 → −27 %), so a flagged low
         is never drawn on top of an in-range neighbour near the band's lower edge */
      const rel = (a, v) => { const lo = a.refMin != null ? a.refMin : 0, hi = a.refMax, r = (v - lo) / (hi - lo); return v < lo && lo > 0 ? Math.min(r, v / lo - 1) : r; };
      const lines = analytes.map((a) => {
        const pts = a.series.map((s) => [xp(s.d), yp(Math.max(yMin + .05, Math.min(yMax - .05, rel(a, s.v))))]);
        const flagged = a.series.some((s) => s.flag && s.d === dates[dates.length - 1]);
        const lab = pts[pts.length - 1];
        return { a, pts, flagged, lab };
      });
      const svg = `<svg class="ui-compare" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="${yp(1)}" width="100" height="${yp(0) - yp(1)}" class="band"/>
        ${lines.map((l) => l.pts.length > 1 ? `<polyline class="${l.flagged ? 'flag' : ''}" points="${l.pts.map((p) => p.join(',')).join(' ')}" vector-effect="non-scaling-stroke"/>` : '').join('')}
      </svg>`;
      /* label de-collision: keep ≥ 13px between right-hand labels (plot height 150px) */
      const H = o.height || 150, gap = 13 / H * 100;
      const order = [...lines].sort((a, b) => a.lab[1] - b.lab[1]);
      order.forEach((l, i) => { l.ly = l.lab[1]; if (i > 0 && l.ly - order[i - 1].ly < gap) l.ly = order[i - 1].ly + gap; });
      const over = order.length ? order[order.length - 1].ly - 98 : 0; if (over > 0) order.forEach((l) => (l.ly -= over));
      const dots = lines.map((l) => l.pts.map((p, i) => `<i class="ui-dot ${l.flagged && i === l.pts.length - 1 ? 'flag' : ''} ${i === l.pts.length - 1 && l.a.series[i].isNew ? 'new' : ''}" style="left:${p[0]}%;top:${p[1]}%"></i>`).join('') +
        `<span class="ui-lbl ${l.flagged ? 'flag' : ''}" style="left:${Math.min(l.lab[0], 97)}%;top:${l.ly}%">${esc(l.a.key)}</span>`).join('');
      const axis = dates.map((d) => `<span style="left:${xp(d)}%">${esc(d.slice(0, 6))}</span>`).join('');
      return `<div class="ui-cmp"><div class="ui-cmp-plot">${svg}${dots}<span class="ui-refl">Referenzbereich</span></div><div class="ui-cmp-axis">${axis}</div></div>`;
    },
    labTable(rows, o = {}) {
      return `<table class="ui-labs"><thead><tr><th>Analyt</th><th class="r">Wert</th><th>Referenz</th><th>Flag</th>${o.trend ? '<th>Verlauf</th>' : ''}</tr></thead><tbody>${rows.map((r) =>
        `<tr class="${r.flag ? 'is-flag' : ''}"><td>${esc(r.name)}</td><td class="r">${r.flag ? '<b>' : ''}${val(r.v, r.dec, r.unit)}${r.flag ? '</b>' : ''}</td><td class="ref tnum">${esc(r.ref)}</td><td>${UI.flag(r.flag)}</td>${o.trend ? `<td>${r.series ? UI.sparkline(r.series, { refMin: r.refMin, refMax: r.refMax, w: 64, h: 20 }) : ''}</td>` : ''}</tr>`).join('')}</tbody></table>`;
    },
    medRow(m, o = {}) {
      const ext = m.status === 'extern';
      const steps = m.chain ? m.chain.steps.map((s, i) => `<i class="${i <= (o.post ? m.chain.post : m.chain.pre) ? 'on' : ''}" title="${esc(s)}"></i>`).join('') : '';
      return `<div class="ui-med ${ext ? 'ext' : ''} ${o.post && m.post ? 'stopped' : ''}">
        <div class="nm"><b>${esc(m.name)}</b> <span class="tnum">${esc(m.strength)}</span></div>
        <div class="dose tnum">${esc(o.post && m.post ? m.post : m.dose)}</div>
        <div class="meta">${ext ? `${I('database', 11)} ${esc(m.source)}` : `seit ${esc(m.since)}${m.indication ? ' · ' + esc(m.indication) : ''}`}</div>
        ${steps ? `<div class="ui-steps" title="${esc(m.chain.steps.join(' → '))}">${steps}<span>${esc(o.post ? m.lastRx.post : m.lastRx.pre)}</span></div>` : ''}
      </div>`;
    },
    hint(hn, o = {}) {
      if (o.resolved) return `<div class="ui-hint resolved">${I('check-circle', 14)}<span><b>NSAR-Hinweis erledigt</b> — ${esc(hn.resolvedPost)}</span></div>`;
      return `<div class="ui-hint">${I('alert', 15)}<div><b>${esc(hn.text)}</b><div class="d">${esc(hn.relevance)} ${esc(hn.decision)}</div></div></div>`;
    },
    /* seal-and-send hold button: <button class="hold"><span class="hold-l">Label</span></button> */
    hold(btn, o = {}) {
      const ms = o.ms || 900; if (!btn.querySelector('.hold-fill')) { const lab = btn.innerHTML; btn.innerHTML = `<span class="hold-base">${lab}</span><span class="hold-fill" aria-hidden="true"><span>${lab}</span></span>`; }
      const fill = btn.querySelector('.hold-fill'); let anim = null, doneFlag = false;
      const start = (e) => { if (btn.disabled || doneFlag) return; if (e && e.repeat) return; btn.classList.add('holding'); anim = fill.animate([{ clipPath: 'inset(0 100% 0 0 round 999px)' }, { clipPath: 'inset(0 0% 0 0 round 999px)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
        anim.finished.then(() => { if (doneFlag) return; doneFlag = true; btn.classList.remove('holding'); btn.classList.add('done'); o.onDone && o.onDone(); }).catch(() => {}); };
      const cancel = () => { if (doneFlag || !anim) return; btn.classList.remove('holding'); const a = anim; anim = null; a.pause(); fill.animate([{ clipPath: getComputedStyle(fill).clipPath }, { clipPath: 'inset(0 100% 0 0 round 999px)' }], { duration: 250, easing: 'cubic-bezier(0.23,1,0.32,1)', fill: 'forwards' }); a.cancel(); };
      btn.addEventListener('pointerdown', start); ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, cancel));
      btn.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(e); } });
      btn.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') cancel(); });
      return { reset() { doneFlag = false; btn.classList.remove('done', 'holding'); fill.getAnimations().forEach((a) => a.cancel()); } };
    },
  };
  window.UI = UI;
})();
