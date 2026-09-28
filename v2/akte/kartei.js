/* Akte — Kartei timeline: quarter dividers → contact-day plates → rows (96 | text | status | 140).
   Today: KI lane (self-flagged span, drying ink) + system receipts. Befund 25.09.: full values + Vidieren. No delete anywhere. */
(function () {
  const { D, esc, I } = AK; const P = D.patient, A = AK.A;
  const DOC = D.practice.doctor;

  /* ── helpers ── */
  const hl = (text) => {
    const q = AK.S.filters.q; const t = esc(text); if (!q || q.trim().length < 2) return t;
    const nq = Shell.norm(q); const plain = String(text);
    // umlaut-insensitive: walk words, highlight those whose normalized form contains the query
    return plain.split(/(\s+)/).map((w) => (/\s+/.test(w) ? w : (Shell.norm(w).includes(nq) ? `<mark>${esc(w)}</mark>` : esc(w)))).join('');
  };
  const rowSearch = (r) => [AK.curText(r), r.detail, r.system, r.by, AK.kLabel(r.k)].filter(Boolean).join(' ');
  function visible(r) {
    const f = AK.S.filters;
    if (f.types && !f.types.includes(r.k)) return false;
    if (f.problem !== 'all' && !AK.matchesProblem(rowSearch(r), f.problem)) return false;
    if (f.onlyOpen && !AK.isOpenRow(r)) return false;
    if (f.q && f.q.trim().length >= 2 && !Shell.norm(rowSearch(r)).includes(Shell.norm(f.q))) return false;
    return true;
  }
  /* type cell: same anatomy as UI.type (mono Kürzel + word), word shortened where the 96 px column needs it */
  const SHORT = { ueb: 'Überw.', au: 'eAUM', kom: 'Komm.', vit: 'Vital', ana: 'Anamn.' };
  const typeCell = (k, r) => {
    if (k === 'cave') return `<span class="ui-type clin" title="CAVE (Allergien)"><span class="k">cav</span><span class="l">CAVE</span></span>`;
    if (k === 'lab') return `<span class="ui-type" title="Laborbefund"><span class="k">lab</span><span class="l">Befund</span></span>`;
    const t = D.kuerzel.find((x) => x.k === k) || { k, label: k };
    const full = AK.kLabel(k);
    const word = r && r.state === 'request' ? 'Anfrage' : (k === 'ana' && r && r.by === D.practice.assistant.short ? 'Angabe' : (SHORT[k] || t.label));
    return `<span class="ui-type ${t.doctorOnly ? 'clin' : ''}" title="${esc(k)} · ${esc(full)}"><span class="k">${esc(k)}</span><span class="l">${esc(word)}</span></span>`;
  };
  function wdiff(a, b) {
    const X = a.split(' '), Y = b.split(' '); let i = 0; while (i < X.length && i < Y.length && X[i] === Y[i]) i++;
    let j = 0; while (j < X.length - i && j < Y.length - i && X[X.length - 1 - j] === Y[Y.length - 1 - j]) j++;
    return { pre: X.slice(0, i).join(' '), o: X.slice(i, X.length - j).join(' '), n: Y.slice(i, Y.length - j).join(' '), suf: X.slice(X.length - j).join(' ') };
  }
  const TYPE_PREFIX = { rez: /^e-Rezept\s+/, ueb: /^Überweisung\s+/ };
  const canEdit = (r) => !r.receipt && !r.unsigned && !r.lab && (AK.isArzt() || r.by === D.practice.assistant.short);
  const STORNO_S = 5;

  /* ── row ── */
  function statusCell(r) {
    const S = AK.S, st = S.storno[r.id];
    if (st && st.phase === 'sending') {
      /* hold-before-send for the storno (an external act): drains, stoppable, no fake undo afterwards */
      const left = Math.max(0, Math.ceil(STORNO_S - (Date.now() - st.start) / 1000));
      return `<span class="ak-stn-send" data-stn><span class="fill" data-stn-fill aria-hidden="true"></span><span class="l">Storno wird übermittelt in <b class="tnum" data-stn-n>${left}</b> s</span><button type="button" data-act="stn-stop">Stopp</button></span>`;
    }
    if (st) return `<span class="ak-stn">${AK.lbl(I('x', 12), `storniert <span class="tnum">${esc(st.at)}</span>`)}</span>`;
    if (r.state === 'unsigned') return `<span class="ak-uns">${I('signature', 12)}Signatur offen</span>`;
    const c = AK.corrChain(r).length;
    const out = [];
    /* both dates: the day group is the date it is FOR; the badge carries when it was written (date + time) */
    if (r.nachtrag) out.push(`<span class="ak-badge" title="Nachtrag für ${esc(r.nachtrag.for)} · erfasst ${esc(AK.today)} ${esc(r.time)} · Grund: ${esc(r.nachtrag.reason)}"><span>Nachtrag · erfasst <span class="tnum">${esc(AK.todayShort)} ${esc(r.time)}</span></span></span>`);
    if (r.state === 'sent') out.push(`<span class="ak-sent">${I('check', 13)}übermittelt</span>`);
    else if (r.state === 'pending') out.push(window.UI.state('pending'));
    else if (r.state === 'done') out.push(`<span class="ak-done">${I('check', 13)}${esc(r.doneLabel || 'erledigt')}</span>`);
    else if (r.state === 'request') out.push(`<span class="ak-done">${I('clock', 13)}wartet auf ${esc(DOC.short)}</span>`);
    if (r.loop) out.push(window.UI.state('loop', 'kein Rückbefund'));
    if (c) out.push(`<button type="button" class="ak-corr" data-act="hist" title="Korrigiert — Original ansehen">${I('history', 12)}korrigiert</button>`);
    if (r.ai) out.push(`<span class="ak-aiprov" title="KI-Entwurf aus Mitschrift ${esc(D.consultation.start)}–${esc(D.consultation.end)} · geprüft und übernommen: ${esc(DOC.short)} ${esc(r.ai.at)}${r.ai.edited ? ' (bearbeitet)' : ''} · maschinenlesbar gekennzeichnet">${I('sparkles', 12)}</span>`);
    return out.join('');
  }
  function actsHTML(r) {
    const S = AK.S; if (S.storno[r.id]) return S.storno[r.id].phase === 'sending' ? '' : `<button type="button" data-act="hist">Verlauf</button>`;
    const b = [];
    if (r.unsigned && AK.isArzt()) b.push(`<button type="button" data-act="sign-later" data-k="${r.unsigned}" class="is-pri">${I('signature', 13)}Jetzt signieren</button>`);
    if (r.receipt === 'rez' && AK.isArzt() && r.state === 'sent') b.push(`<button type="button" data-act="rez-storno" title="Storno möglich, solange nicht eingelöst">Stornieren <span class="q">· solange nicht eingelöst</span></button>`);
    if (canEdit(r)) b.push(`<button type="button" data-act="edit">Korrigieren</button>`);
    b.push(`<button type="button" data-act="hist">Verlauf</button>`);
    if (!r.receipt && !r.unsigned && (AK.isArzt() || r.by === D.practice.assistant.short)) b.push(`<button type="button" class="ak-more" data-act="more" aria-label="Weitere Aktionen">${I('more', 15)}</button>`);
    return b.join('');
  }
  function histHTML(r) {
    const S = AK.S, chain = AK.corrChain(r), st = AK.isStorno(r.id) ? S.storno[r.id] : null;
    const who = (n) => `${esc(n)} <span class="r">(${esc((AK.people[n] || {}).role || '')})</span>`;
    const dayDate = r.dayDate || AK.today;
    const lines = [];
    if (r.ai) lines.push(`<div class="ak-h-l">${I('sparkles', 12)}<span>KI-Entwurf aus Mitschrift <span class="tnum">${esc(D.consultation.start)}–${esc(D.consultation.end)}</span> → übernommen${r.ai.edited ? ' (bearbeitet)' : ''} · ${who(DOC.short)} <span class="tnum">${esc(r.ai.at)}</span> · Kennzeichnung bleibt maschinenlesbar</span></div>`);
    else lines.push(`<div class="ak-h-l">${I('pen', 12)}<span>Erstellt <span class="tnum">${esc(dayDate)} · ${esc(r.time)}</span> · ${who(r.by)}${r.receipt ? ' · Docline im Auftrag' : ''}</span></div>`);
    if (r.nachtrag) lines.push(`<div class="ak-h-l">${I('clock', 12)}<span>Nachtrag für <span class="tnum">${esc(r.nachtrag.for)}</span> · erfasst <span class="tnum">${esc(AK.today)} ${esc(r.time)}</span> · Grund: ${esc(r.nachtrag.reason)}</span></div>`);
    if (chain.length) {
      /* the original stays readable, then every correction step with its own diff, reason, person and time (oldest first) */
      const diff = (d) => [esc(d.pre), d.o ? `<del>${esc(d.o)}</del>` : '', d.n ? `<ins>${esc(d.n)}</ins>` : '', esc(d.suf)].filter(Boolean).join(' ');
      lines.push(`<div class="ak-h-o is-orig"><span class="lbl">Original</span><span>${esc(chain[0].from)}</span></div>`);
      chain.forEach((c, i) => {
        lines.push(`<div class="ak-h-l">${I('history', 12)}<span>${chain.length > 1 ? `<span class="tnum">${i + 1}.</span> ` : ''}Korrigiert <span class="tnum">${esc(c.at)}</span> · ${who(c.by)} · Grund: ${esc(c.reason)}</span></div>
          <div class="ak-h-o"><span class="lbl">Änderung</span><span>${diff(wdiff(c.from, c.to))}</span></div>`);
      });
    }
    if (st) lines.push(`<div class="ak-h-l">${I('x', 12)}<span>Storniert <span class="tnum">${esc(AK.today)} ${esc(st.at)}</span> · ${who(st.by)} · Grund: ${esc(st.reason)} · bleibt in der Kartei sichtbar</span></div>`);
    if (r.more) lines.push(`<div class="ak-h-l">${I('info', 12)}<span>${esc(r.more)}</span></div>`);
    return `<div class="ak-hist">${lines.join('')}</div>`;
  }
  function editHTML(r) {
    const cur = AK.curText(r);
    return `<div class="ak-row is-editing" data-row="${r.id}">
      <div class="ak-tc">${typeCell(r.k)}</div>
      <div class="ak-edit">
        <textarea class="ak-in ak-edit-t" data-edit-t rows="2">${esc(cur)}</textarea>
        <input class="ak-in" data-edit-r placeholder="Grund der Korrektur (Pflicht)" autocomplete="off">
        <div class="ak-edit-f"><span class="ak-note">${I('history', 12)}Original bleibt sichtbar · Korrektur mit Grund, Person und Zeit</span><span class="grow"></span>
          <button class="btn btn-ghost btn-sm" type="button" data-act="edit-cancel">Abbrechen</button><button class="btn btn-primary btn-sm" type="button" data-act="edit-save" disabled>Korrektur speichern</button></div>
      </div><div class="ak-meta"></div></div>`;
  }
  function rowHTML(r, day) {
    const S = AK.S; if (S.editing === r.id) return editHTML(r);
    const text = AK.curText(r);
    const exp = !!S.expanded[r.id], st = AK.isStorno(r.id), sending = S.storno[r.id] && S.storno[r.id].phase === 'sending';
    const one = !!(r.receipt || r.unsigned);
    /* history rows: the system line runs inline after the text (the type word already lives in the 96 px column) */
    const shown = one || !r.system ? text : String(text).replace(TYPE_PREFIX[r.k] || /^$/, '');
    /* an open loop names „kein Rückbefund“ in its pill — the row text does not repeat it */
    const sysText = r.loop && r.system ? String(r.system).replace(/\s*·\s*kein Rückbefund$/, '') : r.system;
    const sys = sysText ? `&nbsp;<span class="ak-d ak-sys-in">·&nbsp;${AK.nb(hl(sysText))}</span>` : '';
    return `<div class="ak-row ${one ? 'is-rcpt' : ''} ${exp ? 'is-exp' : ''} ${st ? 'is-storno' : ''} ${sending ? 'is-stn-send' : ''} ${r.unsigned ? 'is-unsigned' : ''} ${r.fresh ? 'is-fresh' : ''} ${r.ai ? 'is-ai' : ''}" data-row="${r.id}" data-nav tabindex="-1">
      <div class="ak-tc">${typeCell(r.k, r)}</div>
      <div class="ak-tx" data-act="expand">
        <div class="ak-t ${one ? 'one' : ''}">${AK.nb(hl(shown))}${r.detail && one ? `&nbsp;<span class="ak-d">·&nbsp;${AK.nb(hl(r.detail))}</span>` : ''}${sys}</div>
        ${r.ai ? `<div class="ak-prov">KI-Entwurf → übernommen${r.ai.edited ? ' (bearbeitet)' : ''} · ${esc(DOC.short)} <span class="tnum">${esc(r.ai.at)}</span></div>` : ''}
        ${exp || S.hist === r.id ? histHTML(Object.assign({ dayDate: day.date.replace(/^[A-Za-z]{2} /, '') }, r)) : ''}
      </div>
      <div class="ak-st-c">${statusCell(r)}</div>
      <div class="ak-meta"><span class="ak-mt tnum">${r.nachtrag ? '' : `${esc(r.time || '')}${r.by ? ' · ' : ''}`}${r.by ? esc(r.by) : ''}</span><div class="ak-acts">${actsHTML(r)}</div></div>
    </div>`;
  }

  /* ── KI lane ── */
  function laneHTML() {
    const S = AK.S, L = S.lane; if (S.mode !== 'post') return '';
    const drafts = A.kartei.drafts.filter((d) => L.drafts[d.k].state !== 'taken');
    if (!drafts.length) return '';
    const pending = drafts.filter((d) => L.drafts[d.k].state === 'pending');
    const names = pending.map((d) => AK.kLabel(d.k)).join(', ');
    const f = S.filters;
    if (f.types && !pending.some((d) => f.types.includes(d.k))) return '';
    if (f.q && f.q.trim().length >= 2 && !pending.some((d) => Shell.norm(L.drafts[d.k].text).includes(Shell.norm(f.q)))) return '';
    if (!L.open) {
      if (!pending.length) return '';
      return `<div class="ak-lane" data-lane><button type="button" class="ak-lane-row" data-act="lane" data-nav tabindex="-1">
        <span class="ak-tc"><span class="ak-lane-ic">${I('sparkles', 14)}</span></span>
        <span class="ak-lane-t"><b>${pending.length} KI-Entwürfe</b> aus Konsultation <span class="tnum">${esc(D.consultation.start)}</span> · ${esc(names)}</span>
        <span class="ak-lane-go">${AK.isArzt() ? `Prüfen <span class="kbd">E</span>` : `Wartet auf Freigabe durch ${esc(DOC.short)}`}</span></button></div>`;
    }
    const arzt = AK.isArzt();
    const flagDraft = A.kartei.drafts.find((d) => d.support && d.support.length);
    const rows = drafts.map((d) => {
      const st = L.drafts[d.k]; const k = d.k;
      if (st.state === 'discarded') return `<div class="ak-draft is-disc" data-draft="${k}"><div class="ak-tc">${typeCell(k)}</div><div class="ak-dtx"><span class="ak-note"><span>${AK.kLabel(k)}-Entwurf verworfen · ${AK.nb(esc(DOC.short))} <span class="tnum">${esc(st.at)}</span> · nicht in der Kartei</span></span></div><div class="ak-meta">${arzt ? `<button type="button" class="ak-lnk" data-act="d-undo" data-k="${k}">Wiederherstellen</button>` : ''}</div></div>`;
      if (L.editing === k) return `<div class="ak-draft is-edit" data-draft="${k}"><div class="ak-tc">${typeCell(k)}</div><div class="ak-dtx"><textarea class="ak-in ak-edit-t" data-dedit rows="3">${esc(st.text)}</textarea>
        <div class="ak-dacts"><button class="btn btn-primary btn-sm" type="button" data-act="d-edit-ok" data-k="${k}">Fertig</button><button class="btn btn-ghost btn-sm" type="button" data-act="d-edit-x">Abbrechen</button></div></div><div class="ak-meta"></div></div>`;
      const sup = k === (flagDraft && flagDraft.k) && !L.flag ? d.support : [];
      let ink = window.UI.aiText(st.text, { support: sup });
      if (L.flag === 'kept' && flagDraft && k === flagDraft.k) ink = ink.replace(esc(flagDraft.support[0].span), `<span class="ak-kept" title="beibehalten · ${esc(DOC.short)}">${esc(flagDraft.support[0].span)}</span>`);
      const needFlag = flagDraft && k === flagDraft.k && !L.flag;
      const note = flagDraft && k === flagDraft.k && L.flag ? `<span class="ak-note">${I(L.flag === 'removed' ? 'x' : 'check', 12)}„${esc(flagDraft.support[0].span)}“ ${L.flag === 'removed' ? 'entfernt' : 'beibehalten'}</span>` : (needFlag ? `<span class="ak-note warn">${I('alert', 12)}${arzt ? '1 Stelle nicht im Gespräch gehört — antippen' : `1 Stelle nicht im Gespräch gehört · prüft ${esc(DOC.short)}`}</span>` : '');
      return `<div class="ak-draft ${arzt ? '' : 'is-ro'}" data-draft="${k}"><div class="ak-tc">${typeCell(k)}</div>
        <div class="ak-dtx">${ink}
          <div class="ak-dacts">${arzt ? `<button class="btn btn-secondary btn-sm" type="button" data-act="d-take" data-k="${k}" ${needFlag ? 'disabled title="Markierte Stelle zuerst prüfen"' : ''}>Übernehmen</button>
            <button class="btn btn-ghost btn-sm" type="button" data-act="d-edit" data-k="${k}">Bearbeiten</button>
            <button class="btn btn-ghost btn-sm" type="button" data-act="d-disc" data-k="${k}">Verwerfen</button>` : ''}${note}</div>
          <div class="ak-prov ak-dry-prov">KI-Entwurf → übernommen${st.edited || (L.flag === 'removed' && flagDraft && k === flagDraft.k) ? ' (bearbeitet)' : ''} · ${esc(DOC.short)} <span class="tnum">${esc(AK.clock())}</span></div>
        </div>
        <div class="ak-meta"><span class="ak-mt tnum">Entwurf · ${esc(D.consultation.end)}</span></div></div>`;
    }).join('');
    return `<div class="ak-lane is-open" data-lane>
      <div class="ak-lane-h"><span class="ak-tc"><span class="ak-lane-ic">${I('sparkles', 14)}</span></span>
        <span class="ak-lane-t"><b>KI-Entwürfe</b> · aus Mitschrift <span class="tnum">${esc(D.consultation.start)}–${esc(D.consultation.end)}</span> · Nur geprüft in die Kartei</span>
        <button type="button" class="ak-lnk" data-act="lane">Einklappen</button></div>
      ${rows}
      ${laneFoot() ? `<div class="ak-lane-f" data-lane-f>${laneFoot()}</div>` : ''}</div>`;
  }
  function laneFoot() {
    const S = AK.S, L = S.lane; const pending = A.kartei.drafts.filter((d) => L.drafts[d.k].state === 'pending');
    if (!AK.isArzt()) return `<span class="ak-note">${I('clock', 12)}Wartet auf Freigabe durch ${esc(DOC.short)} · Entwürfe sind noch nicht Teil der Kartei</span>`;
    if (!pending.length) return '';
    const unseen = pending.filter((d) => !L.seen[d.k]);
    const flagOpen = pending.some((d) => d.support && d.support.length) && !L.flag;
    const why = flagOpen ? 'Markierte Stelle prüfen' : unseen.length ? `${unseen.map((d) => AK.kLabel(d.k)).join(', ')} ansehen` : '';
    return `<span class="ak-note">${why ? `${I('info', 12)}Noch offen: ${esc(why)}` : `${I('check', 12)}Alle Entwürfe gelesen · Übernahme mit Ihrem Namen und Zeitstempel`}</span><span class="grow"></span>
      <button class="btn btn-primary btn-sm" type="button" data-act="lane-take" ${why ? 'disabled' : ''}>Übernehmen (${pending.length})</button>`;
  }
  const refreshFoot = () => { const f = AK.$('[data-lane-f]'); if (f) f.innerHTML = laneFoot(); };

  /* ── day plates ── */
  function todayHead() {
    const S = AK.S, pre = S.mode === 'pre', cons = D.consultation, ap = P.appointment;
    if (pre) return `<header class="ak-dh"><span class="ak-dh-today">Heute</span><span class="ak-dh-date tnum">${esc(D.now.weekday.slice(0, 2))} ${esc(D.now.date)}</span><span class="ak-dh-meta">Termin <span class="tnum">${esc(ap.time)}</span> <i class="sep">·</i> im Wartezimmer seit <span class="tnum ak-wait">${esc(ap.arrived)}</span></span><span class="grow"></span>
      ${S.added.some((r) => r.day === 'today' && r.k === 'dia') ? `<span class="ak-dh-kg"><span>Kontaktgrund <span class="tnum">${esc(S.added.find((r) => r.day === 'today' && r.k === 'dia').code || '')}</span></span></span>` : ''}</header>`;
    const hd = (A.leistungen.result.match(/Kontaktgrund ([A-Z][0-9.]+)/) || [])[1] || P.problems[1].code;
    const sec = P.problems.map((p) => p.code).filter((c) => c !== hd);
    const amb = AK.ambiguity(); const tt = (A.termin.title.match(/\d{2}:\d{2}/) || [''])[0];
    const kind = (A.termin.title.split(' · ').pop()) || 'Kontrolle';
    return `<header class="ak-dh"><span class="ak-dh-today">Heute</span><span class="ak-dh-date tnum">${esc(D.now.weekday.slice(0, 2))} ${esc(D.now.date)}</span>
      <span class="ak-dh-meta">Konsultation <span class="tnum">${esc(cons.start)}–${esc(cons.end)}</span> <i class="sep">·</i> ${AK.who(DOC.short)} <i class="sep">·</i> ${esc(P.fall.code)}</span><span class="grow"></span>
      ${!AK.removed('termin') ? `<span class="ak-plan" data-target="termin" title="${esc(A.termin.detail)}">${AK.lbl(I('calendar', 13), `${esc(kind)} <span class="tnum">${esc(amb.label)} ${esc(tt)}</span>`)}</span>` : ''}
      <span class="ak-dh-kg" title="ICD-10 je Kontakttag · erster Code = Hauptdiagnose"><span>Kontaktgrund <span class="tnum">${esc(hd)}</span> <span class="hd">(HD)</span>${sec.length ? ` · <span class="tnum">${sec.join(' · ')}</span>` : ''}</span></span>
      <span class="ak-dh-kg">${AK.removed('leistungen') ? 'Leistungen offen' : `<span>Leistungen <span class="tnum">${esc(A.leistungen.title.split(' ')[0])}</span></span>${I('check', 12)}`}</span></header>`;
  }
  function dayHead(d) {
    const icd = d.icd ? `<span class="ak-dh-kg" title="Kontaktgrund (ICD-10) · erster Code = Hauptdiagnose"><span>Kontaktgrund <span class="tnum">${d.icd.join(' · ')}</span></span></span>` : '';
    const lei = d.leistungen ? `<span class="ak-dh-kg"><span>Leistungen <span class="tnum">${d.leistungen}</span></span></span>` : '';
    return `<header class="ak-dh"><span class="ak-dh-date tnum">${esc(d.date)}</span><span class="ak-dh-kind">${esc(d.title)}</span>
      <span class="ak-dh-meta">${d.by ? AK.who(d.by) : ''}${d.duration ? ` <i class="sep">·</i> ${esc(d.duration)}` : ''}${d.kind === 'konsultation' ? ` <i class="sep">·</i> ${esc(P.fall.code)}` : ''}</span><span class="grow"></span>${icd}${lei}</header>`;
  }
  function labState() {
    const S = AK.S;
    if (S.vid) return window.UI.state('reviewed', `${S.vid.by} · ${S.vid.at}`);
    return S.mode === 'pre' ? window.UI.state('unreviewed') : window.UI.state('discussed', AK.discussedAt);
  }
  function labDay(d) {
    const S = AK.S, draw = AK.draw(d.drawId), rows = AK.labRows(draw), latest = draw.id === AK.latestDraw().id;
    const f = S.filters;
    const vis = (!f.types || f.types.includes('lab')) && (f.problem === 'all' || AK.matchesProblem('labor ferritin', f.problem)) && (!f.onlyOpen || (latest && !S.vid))
      && (!f.q || f.q.trim().length < 2 || Shell.norm('laborbefund labor ' + rows.map((r) => r.name).join(' ')).includes(Shell.norm(f.q)));
    if (!vis) return '';
    const [src, dup] = draw.source.split(' — ');
    if (latest) {
      const ord = draw.ordered.split(' · '), drawn = draw.drawn.split(' · '), rec = draw.received.split(' · ');
      const arzt = AK.isArzt();
      const focal = S.mode === 'pre' && !S.vid;
      return `<article class="ak-day ak-lab ak-solo ${focal ? 'ak-focal' : ''}" data-day="${d.id}" data-target="befund">
        <header class="ak-dh ak-dh-lab" data-nav tabindex="-1" data-act="lab-open">
          <span class="ak-dh-date tnum">${esc(d.date)}</span><span class="ak-dh-kind">${esc(d.title)}</span><span class="ak-dh-meta" title="${esc(dup || '')}">${esc(src)}</span><span class="grow"></span>
          ${labState()}${!S.vid && arzt && !S.vidOpen ? `<button class="btn btn-secondary btn-sm" type="button" data-act="vid">${I('check', 14)}Vidieren</button>` : ''}${!arzt && !S.vid ? `<span class="ak-assign">zugewiesen: ${esc(DOC.short)}</span>` : ''}
        </header>
        <div class="ak-labbody"><div class="ak-tc">${typeCell('lab')}</div><div class="ak-labtbl">${window.UI.labTable(rows, { trend: true })}</div>
          <div class="ak-labfoot tnum">angeordnet ${esc(ord[1] || '')} ${esc(ord[0])} · abgenommen ${esc(AK.fmtDay(drawn[0]))} ${esc(drawn[1] || '')} · eingegangen ${esc(AK.fmtDay(rec[0]))} ${esc(rec[1] || '')}${dup ? ` · ${esc(dup)}` : ''}</div></div>
        ${S.vidOpen && !S.vid ? vidHTML() : ''}${S.vid ? `<div class="ak-vid-done"><div class="ak-tc"></div><div class="ak-note">${AK.lbl(I('check', 12), `Vidiert · ${esc(S.vid.outcome)} · ${AK.nb(esc(S.vid.by))} <span class="tnum">${esc(S.vid.at)}</span>`)}</div></div>` : ''}
      </article>`;
    }
    /* an already-vidierter Befund is a true one-liner: date · Laborbefund · values · vidiert — click (or ↵) opens the full table */
    const exp = !!AK.S.expanded[d.id];
    const one = rows.map((r) => `<span class="k">${esc(AK.short(r.key))}</span> <span class="tnum">${window.UI.num(r.v, r.dec)}</span>${r.flag ? ' ' + window.UI.flag(r.flag) : ''}`).join('<span class="sep">·</span>');
    const rv = draw.reviewed;
    return `<article class="ak-day ak-lab is-compact ${exp ? 'is-exp' : ''}" data-day="${d.id}">
      <div class="ak-dh ak-lab-one" data-row="${d.id}" data-nav tabindex="-1" data-act="expand" title="${esc(draw.source)}">
        <span class="ak-dh-date tnum">${esc(d.date)}</span><span class="ak-dh-kind">${esc(d.title)}</span>
        <span class="ak-lab-vals">${one}</span><span class="grow"></span>
        <span class="ak-done">${AK.lbl(I('check', 13), `vidiert <span class="tnum">${esc(AK.fmtDay(rv.at.split(' · ')[0]))}</span>${rv.outcome && rv.outcome !== 'Keine Aktion nötig' ? ` · ${esc(rv.outcome)}` : ''}`)}</span>
        <span class="ak-mt tnum">${esc(rv.at.split(' · ')[1] || '')} · ${esc(rv.by)}</span>
      </div>
      ${exp ? `<div class="ak-labbody is-in"><div class="ak-tc">${typeCell('lab')}</div><div class="ak-labtbl">${window.UI.labTable(rows, { trend: true })}</div>
        <div class="ak-labfoot tnum">${esc(src)} · vidiert ${esc(rv.at)} · ${esc(rv.by)}${rv.outcome ? ` · ${esc(rv.outcome)}` : ''}</div></div>` : ''}
    </article>`;
  }

  /* Vidieren panel — only from the full report (all values visible above) */
  function vidHTML() {
    const S = AK.S, pre = S.mode === 'pre';
    const flagged = AK.labRows(AK.latestDraw()).filter((r) => r.flag).map((r) => `${r.key} ${r.flag}`).join(', ');
    if (!pre) {
      const ueb = A.ueberweisung.type + ' ' + A.ueberweisung.title.split(' · ')[0];
      const uebSt = AK.unsignedKinds().includes('ueb') ? 'vorbereitet · Signatur offen' : 'erstellt';
      return `<div class="ak-vid" data-vid><div class="ak-tc"><span class="eyebrow">Vidieren</span></div>
        <div class="ak-vid-b">
          <div class="ak-vid-l"><span class="ak-vid-k">Ergebnis</span><span class="ak-vid-v">${AK.lbl(I('message', 14), `Im Gespräch besprochen · <span class="tnum">${esc(AK.discussedAt)}</span>`)}</span></div>
          <div class="ak-vid-l"><span class="ak-vid-k">Aktion</span><span class="ak-vid-v">${I('send', 14)}${esc(ueb)} (${uebSt})</span></div>
          <div class="ak-vid-f"><span class="ak-note">Vorausgefüllt aus der Konsultation · Abschluss mit Ihrem Namen</span><span class="grow"></span>
            <button class="btn btn-ghost btn-sm" type="button" data-act="vid-x">Abbrechen</button>
            <button class="btn btn-primary btn-sm" type="button" data-act="vid-ok" data-autofocus>Vidieren <span class="ak-kbd-in">↵</span></button></div>
        </div></div>`;
    }
    const ch = S.vidChoice;
    const TASKS = [['Rückruf', D.practice.assistant.short], ['Kontrolle', D.practice.assistant.short], ['Überweisung', DOC.short], ['Befundbesprechung', DOC.short]];
    return `<div class="ak-vid" data-vid><div class="ak-tc"><span class="eyebrow">Vidieren</span></div>
      <div class="ak-vid-b">
        <div class="seg ak-seg-w" role="group"><button type="button" data-act="vid-c" data-c="none" aria-pressed="${ch === 'none'}">Keine Aktion nötig</button><button type="button" data-act="vid-c" data-c="act" aria-pressed="${ch === 'act'}">Aktion nötig →</button></div>
        ${ch === 'none' ? `<label class="ak-fl"><span>Begründung — Pflicht bei auffälligem Wert (${esc(flagged)})</span><input class="ak-in" data-vid-r value="${esc(S.vidReason)}" placeholder="z. B. bekannt, wird bei Konsultation besprochen" autocomplete="off"></label>` : ''}
        ${ch === 'act' ? `<div class="ak-vid-tasks">${TASKS.map(([t, o]) => `<button type="button" class="ak-opt ${S.vidTask === t ? 'is-on' : ''}" data-act="vid-t" data-t="${t}" data-o="${esc(o)}"><b>${t}</b><span>→ ${esc(o)}</span></button>`).join('')}</div>` : ''}
        <div class="ak-vid-f"><span class="ak-note">${ch ? (ch === 'none' ? 'Ferritin unter Referenz — Begründung wird mit dem Befund gespeichert' : 'Wird als Aufgabe unter „Offen“ angelegt') : 'Befund schließen: Ergebnis wählen'}</span><span class="grow"></span>
          <button class="btn btn-ghost btn-sm" type="button" data-act="vid-x">Abbrechen</button>
          <button class="btn btn-primary btn-sm" type="button" data-act="vid-ok" ${(ch === 'none' && S.vidReason.trim().length >= 3) || (ch === 'act' && S.vidTask) ? '' : 'disabled'}>${ch === 'act' ? 'Vidieren & Aufgabe anlegen' : 'Vidieren'}</button></div>
      </div></div>`;
  }

  function dayHTML(d) {
    if (d.kind === 'labor') return labDay(d);
    const rows = (d.rows || []).filter(visible);
    if (d.id === 'today') {
      const lane = laneHTML();
      const f = AK.S.filters, filtering = f.types || f.problem !== 'all' || f.onlyOpen || (f.q && f.q.trim().length >= 2);
      if (filtering && !rows.length && !lane) return '';
      if (AK.S.mode === 'pre' && !rows.length) return `<article class="ak-day ak-today-pre ak-solo" data-day="today">${todayHead()}</article>`;
      return `<article class="ak-day ak-today ak-solo" data-day="today">${todayHead()}<div class="ak-rows">${lane}${rows.map((r) => rowHTML(r, d)).join('')}</div></article>`;
    }
    if (!rows.length) return '';
    return `<article class="ak-day" data-day="${d.id}">${dayHead(d)}<div class="ak-rows">${rows.map((r) => rowHTML(r, d)).join('')}</div></article>`;
  }

  function filterLine() {
    const f = AK.S.filters; const bits = [];
    if (f.problem !== 'all') bits.push(`Linse ${esc(AK.problemLabel(f.problem))} · ${esc(f.problem)}`);
    if (f.types) bits.push(`${f.types.length} Eintragsarten`);
    if (f.onlyOpen) bits.push('Nur Offene');
    if (f.q && f.q.trim().length >= 2) bits.push(`Suche „${esc(f.q)}“`);
    if (!bits.length) return '';
    return `<div class="ak-fline"><span>${I('filter', 13)}${bits.join(' · ')}</span><span class="n tnum" data-fcount></span><button class="ak-lnk" type="button" data-act="f-clear">Alle Einträge zeigen</button></div>`;
  }

  /* ── render ── */
  let io = null;
  function render() {
    const root = document.getElementById('ak-tl'); if (!root) return;
    const qs = AK.quarters();
    const latestLab = AK.latestDraw().id;
    const html = qs.map((q) => {
      /* today and the open Befund stand as their own cards; every other contact day of the quarter shares one card */
      let days = [], run = [];
      const flush = () => { if (run.length) { days.push(`<div class="ak-qcard">${run.join('')}</div>`); run = []; } };
      q.days.forEach((d) => { const h = dayHTML(d); if (!h) return; if (d.id === 'today' || (d.kind === 'labor' && d.drawId === latestLab)) { flush(); days.push(h); } else run.push(h); });
      flush();
      if (!days.length) return '';
      const cnt = q.days.filter((d) => d.kind !== 'labor' && d.id !== 'today').length + (q === qs[0] && AK.S.mode === 'post' ? 1 : 0);
      const sum = q === qs[0] ? `${esc(P.fall.code)} seit ${AK.fmtDay(P.fall.since)} · ${cnt} Kontakte` : esc(q.summary);
      return `<div class="ak-qd"><span class="q">${esc(q.quarter)}</span><span class="s">${sum}</span><i></i></div>${days.join('')}`;
    }).join('');
    root.innerHTML = filterLine() + (html || `<div class="ak-empty">${I('search', 18)}<b>Keine Einträge für diese Auswahl</b><button class="ak-lnk" type="button" data-act="f-clear">Alle Einträge zeigen</button></div>`);
    /* count what is shown: rows + the KI lane + the open Befund block (same units as „Nur Offene (n)“) */
    const fc = root.querySelector('[data-fcount]'); if (fc) { const n = root.querySelectorAll('.ak-row, .ak-lab-one, [data-lane], .ak-dh-lab').length; fc.textContent = `${n} Treffer`; }
    post(root);
  }
  AK.on('timeline', render);

  function post(root) {
    /* fresh rows: 180 ms ease-out insert */
    root.querySelectorAll('.is-fresh').forEach((el) => {
      const hgt = el.offsetHeight; el.style.overflow = 'hidden';
      el.animate([{ height: '0px', opacity: 0 }, { height: hgt + 'px', opacity: 1 }], { duration: Shell.motion.reduced ? 1 : 180, easing: 'cubic-bezier(0.23,1,0.32,1)' }).finished.then(() => { el.style.overflow = ''; AK.flash(el); });
      const id = el.dataset.row; AK.allRows().forEach((r) => { if (r.id === id) r.fresh = false; }); AK.S.added.forEach((r) => { if (r.id === id) r.fresh = false; });
    });
    /* lane: mark drafts seen once scrolled into view */
    if (io) io.disconnect();
    const L = AK.S.lane;
    if (L.open && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { const k = en.target.dataset.draft; if (!L.seen[k]) { L.seen[k] = true; refreshFoot(); } } }), { root: document.getElementById('ak-main'), threshold: 0.55 });
      root.querySelectorAll('.ak-draft[data-draft]').forEach((n) => io.observe(n));
    }
    if (AK.S.vidOpen) { const b = root.querySelector('[data-vid] [data-autofocus]') || root.querySelector('[data-vid-r]'); b && b.focus({ preventScroll: true }); }
    if (AK.S.editing) { const t = root.querySelector('[data-edit-t]'); if (t) { t.focus({ preventScroll: true }); t.setSelectionRange(t.value.length, t.value.length); } }
    if (AK.S.focusId) {
      const f = root.querySelector(`[data-row="${AK.S.focusId}"]`);
      if (f) { f.classList.add('is-focus'); const a = document.activeElement; if (!a || a === document.body) f.focus({ preventScroll: true }); }
    }
    /* storno hold-before-send: drain the bar for the remaining time */
    root.querySelectorAll('[data-stn-fill]').forEach((fill) => {
      const id = fill.closest('[data-row]').dataset.row, st = AK.S.storno[id]; if (!st) return;
      const done = Math.min(1, (Date.now() - st.start) / (STORNO_S * 1000));
      fill.animate([{ transform: `scaleX(${1 - done})` }, { transform: 'scaleX(0)' }], { duration: Math.max(1, (1 - done) * STORNO_S * 1000), easing: 'linear', fill: 'forwards' });
    });
  }

  /* ── lane actions ── */
  AK.toggleLane = (force, o = {}) => {
    const L = AK.S.lane; if (!AK.lanePending() && !L.open) return;
    L.open = typeof force === 'boolean' ? force : !L.open; render();
    const lane = AK.$('[data-lane]');
    if (L.open && lane && !o.kbd && !Shell.motion.reduced) AK.$$('.ak-draft', lane).forEach((el, i) => Shell.motion.animate(el, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 0.4, bounce: 0.1, delay: i * 40 }));
    if (L.open && o.scroll) AK.after(() => AK.scrollTo(AK.$('[data-day="today"]'), { offset: 56, instant: o.kbd }));
  };
  function takeDrafts(keys) {
    const L = AK.S.lane; const at = AK.clock();
    const flagDraft = A.kartei.drafts.find((d) => d.support && d.support.length);
    keys.forEach((k) => {
      const el = AK.$(`.ak-draft[data-draft="${k}"]`); if (!el) return;
      el.classList.add('is-drying'); const ink = el.querySelector('.ui-ink'); ink && ink.classList.add('dry');
    });
    Shell.sound.success();
    setTimeout(() => {
      keys.forEach((k) => { const d = L.drafts[k]; d.state = 'taken'; d.at = at; if (flagDraft && k === flagDraft.k && L.flag === 'removed') d.edited = true; });
      const edited = keys.filter((k) => L.drafts[k].edited).length;
      AK.log(`${keys.length === 1 ? 'KI-Entwurf ' + AK.kLabel(keys[0]) : keys.length + ' KI-Entwürfe (' + keys.map(AK.kLabel).join(', ') + ')'} übernommen${edited ? ` · ${edited} bearbeitet` : ''}`);
      if (!AK.lanePending()) L.open = false;
      AK.render(); AK.refreshChips && AK.refreshChips();
      keys.forEach((k) => AK.flash(AK.$(`[data-row="t-ai-${k}"]`)));
    }, Shell.motion.reduced ? 50 : 1100);
  }
  function flagPop(mark) {
    const fd = A.kartei.drafts.find((d) => d.support && d.support.length); const s = fd.support[0];
    /* offer the claimed source only when a past entry really contains the word — never point at a row that does not */
    const src = AK.allRows().find((r) => !/^(t-|n-)/.test(String(r.id)) && AK.curText(r).includes(s.span));
    const pop = Shell.popover(mark, `<div class="ak-pop" style="width:340px"><div class="ak-flag-h">${I('alert', 15)}<b>Nicht im Gespräch gehört</b></div>
      <p class="ak-flag-p">„${esc(s.span)}“ — ${esc(s.note)}</p>
      <div class="ak-pop-f">${src ? `<button class="ak-lnk" type="button" data-src>Quelle ansehen</button><span class="grow"></span>` : ''}<button class="btn btn-secondary btn-sm" type="button" data-f="kept">Beibehalten</button><button class="btn btn-primary btn-sm" type="button" data-f="removed">Entfernen</button></div></div>`, { align: 'left' });
    pop.el.onclick = (e) => {
      if (e.target.closest('[data-src]')) { pop.close(); AK.goTarget(`[data-row="${src.id}"]`); return; }
      const b = e.target.closest('[data-f]'); if (!b) return; pop.close();
      const L = AK.S.lane; L.flag = b.dataset.f;
      if (L.flag === 'removed') { const d = L.drafts[fd.k]; d.text = d.text.replace(new RegExp(',?\\s*' + s.span.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), ''); d.edited = true; }
      render();
    };
  }

  /* ── Vidieren ── */
  AK.openVid = (o = {}) => {
    if (!AK.isArzt() || AK.S.vid) return;
    AK.setView('kartei'); AK.S.vidOpen = true; AK.S.vidChoice = null; AK.S.vidTask = null; render();
    AK.after(() => { const t = AK.$('[data-day="d-2509"]'); AK.scrollTo(t, { offset: 56, instant: o.kbd }); });
  };
  function vidDone() {
    const S = AK.S, pre = S.mode === 'pre'; const at = AK.clock();
    let outcome;
    if (!pre) outcome = `Im Gespräch besprochen (${AK.discussedAt}) · Aktion: ${A.ueberweisung.type} ${A.ueberweisung.title.split(' · ')[0]}${AK.unsignedKinds().includes('ueb') ? ' (Signatur offen)' : ''}`;
    else if (S.vidChoice === 'none') outcome = `Keine Aktion nötig — ${S.vidReason.trim()}`;
    else {
      const b = AK.$(`[data-act="vid-t"][data-t="${S.vidTask}"]`); const owner = b ? b.dataset.o : DOC.short;
      outcome = `Aktion: ${S.vidTask} → ${owner}`;
      const task = { id: 'task-' + Date.now(), text: `${S.vidTask}: Laborbefund ${AK.fmtDay(AK.latestDraw().date)} · Ferritin L`, owner, state: 'Offen', due: owner === DOC.short ? 'bei Konsultation' : 'heute', clinical: owner === DOC.short, fresh: true };
      S.tasks.unshift(task);
      /* one undo for the whole act: the Befund must never name an action that no longer exists */
      Shell.undo({ text: `Vidiert · Aufgabe an ${owner} · ${S.vidTask}`, seconds: 6, onUndo: () => {
        S.tasks = S.tasks.filter((t) => t !== task); S.vid = null; S.vidOpen = false; AK.unlog(S._vidLog);
        AK.render(); AK.refreshChips && AK.refreshChips(); AK.after(() => AK.flash(AK.$('[data-day="d-2509"]'))); } });
    }
    S.vid = { by: DOC.short, at, outcome }; S.vidOpen = false;
    S._vidLog = AK.log(`Laborbefund ${AK.fmtDay(AK.latestDraw().date)} vidiert · ${outcome}`);
    Shell.sound.success();
    AK.render(); AK.refreshChips && AK.refreshChips();
    AK.after(() => AK.flash(AK.$('[data-day="d-2509"]')));
  }

  /* ── corrections / storno ── */
  function findRow(id) { return AK.allRows().find((r) => r.id === id); }
  function stornoPop(anchor, r, rez) {
    const pop = Shell.popover(anchor, rez
      ? `<div class="ak-pop" style="width:340px"><div class="pop-lbl">e-Rezept stornieren</div><p class="ak-flag-p">Storno wird an das e-card-System übermittelt — möglich, solange das e-Rezept nicht eingelöst ist. 5 s zum Stoppen, danach endgültig. Der Eintrag bleibt sichtbar.</p><div class="ak-pop-f"><button class="btn btn-ghost btn-sm" type="button" data-x>Abbrechen</button><button class="btn btn-primary btn-sm" type="button" data-ok>Stornieren</button></div></div>`
      : `<div class="ak-pop" style="width:360px"><div class="pop-lbl">Stornieren — falscher Patient</div><p class="ak-flag-p">Der Eintrag bleibt durchgestrichen sichtbar (mit Grund, Person, Zeit) und wird aus Abrechnung und Übermittlungen genommen. Nichts wird gelöscht.</p>
        <label class="ak-fl"><span>Grund</span><input class="ak-in" data-r value="falscher Patient" autocomplete="off"></label><div class="ak-pop-f"><button class="btn btn-ghost btn-sm" type="button" data-x>Abbrechen</button><button class="btn btn-primary btn-sm" type="button" data-ok>Stornieren</button></div></div>`, { align: 'right' });
    pop.el.querySelector('[data-x]').onclick = pop.close;
    pop.el.querySelector('[data-ok]').onclick = () => {
      const S = AK.S; const inp = pop.el.querySelector('[data-r]'); const reasonIn = inp ? inp.value.trim() : ''; pop.close();
      if (rez) {
        S.storno[r.id] = { phase: 'sending', start: Date.now(), reason: 'e-Rezept-Storno an e-card-System übermittelt', by: AK.me() };
        render(); runStorno(r.id); return;
      }
      const reason = reasonIn || 'falscher Patient';
      S.storno[r.id] = { phase: 'done', reason, at: AK.clock(), by: AK.me() };
      const lg = AK.log(`Eintrag storniert · ${reason}`); render(); AK.render(['rail', 'toolbar']);
      Shell.undo({ text: 'Eintrag storniert · bleibt sichtbar', seconds: 6, onUndo: () => { delete S.storno[r.id]; AK.unlog(lg); render(); AK.render(['rail', 'toolbar']); } });
    };
  }
  function runStorno(id) {
    const S = AK.S, st = S.storno[id]; if (!st || st.phase !== 'sending') return;
    const left = Math.max(0, STORNO_S - (Date.now() - st.start) / 1000);
    const n = AK.$(`[data-row="${id}"] [data-stn-n]`); if (n) n.textContent = Math.ceil(left);
    if (left <= 0) {
      st.phase = 'done'; st.at = AK.clock(); AK.log('e-Rezept storniert · Storno an e-card-System übermittelt'); Shell.sound.success();
      render(); AK.render(['rail', 'toolbar']); if (S.view !== 'kartei') AK.render(['view']);
      AK.after(() => AK.flash(AK.$(`[data-row="${id}"]`))); return;
    }
    Shell.timers.after(200, () => runStorno(id), 'storno');
  }
  function stopStorno(id) {
    const S = AK.S; if (!S.storno[id] || S.storno[id].phase !== 'sending') return;
    delete S.storno[id]; Shell.timers.clear('storno'); AK.log('e-Rezept-Storno gestoppt · nicht übermittelt · e-Rezept gültig');
    render(); AK.render(['rail']);
    Shell.notice({ text: 'Storno gestoppt', detail: 'Nichts übermittelt · e-Rezept bleibt gültig', tone: 'info', ms: 2200 });
  }

  function morePop(anchor, r) {
    const pop = Shell.popover(anchor, `<div class="ak-menu" style="width:280px">
      <button type="button" data-m="storno">${I('x', 15)}<span>Stornieren — falscher Patient<small>Bleibt sichtbar · nicht löschbar</small></span></button>
      <button type="button" data-m="copy">${I('file', 15)}<span>Text kopieren</span></button></div>`);
    pop.el.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; pop.close(); if (b.dataset.m === 'storno') stornoPop(anchor, r, false); else { try { navigator.clipboard.writeText(r.text); } catch (err) {} Shell.notice({ text: 'Text kopiert', tone: 'info', ms: 1600 }); } };
  }

  /* ── delegation ── */
  const tl = () => document.getElementById('ak-view');
  document.getElementById('ak-view').addEventListener('click', (e) => {
    if (!document.getElementById('ak-tl')) return;
    const mark = e.target.closest('.ui-unheard'); if (mark && AK.isArzt()) { flagPop(mark); return; }
    const b = e.target.closest('[data-act]'); if (!b || !document.getElementById('ak-tl').contains(b)) return;
    const a = b.dataset.act; const rowEl = b.closest('[data-row]'); const id = rowEl && rowEl.dataset.row; const S = AK.S;
    if (a === 'expand') { if (window.getSelection && String(window.getSelection()).length) return; if (e.target.closest('button, a, input, textarea, mark')) return; S.expanded[id] = !S.expanded[id]; render(); return; }
    if (a === 'hist') { S.expanded[id] = true; render(); return; }
    if (a === 'edit') { S.editing = id; render(); return; }
    if (a === 'edit-cancel') { S.editing = null; render(); return; }
    if (a === 'edit-save') {
      const r = findRow(id); const t = rowEl.querySelector('[data-edit-t]').value.trim(), why = rowEl.querySelector('[data-edit-r]').value.trim();
      if (t === AK.curText(r)) { Shell.notice({ text: 'Keine Änderung', detail: 'Text ist unverändert — nichts zu korrigieren', tone: 'info', ms: 1800 }); return; }
      /* append to the chain — the first correction and the true original are never overwritten */
      const chain = AK.corrChain(r).slice();
      chain.push({ from: AK.curText(r), to: t, reason: why, at: `${AK.today} · ${AK.clock()}`, by: AK.me() });
      S.corrections[id] = chain;
      S.editing = null; S.expanded[id] = true; AK.log('Eintrag korrigiert · Grund: ' + why); render(); AK.render(['rail']); return;
    }
    if (a === 'more') { morePop(b, findRow(id)); return; }
    if (a === 'rez-storno') { stornoPop(b, findRow(id), true); return; }
    if (a === 'stn-stop') { stopStorno(id); return; }
    if (a === 'sign-later') { AK.signLater(b.dataset.k); return; }
    if (a === 'lane') { AK.toggleLane(); return; }
    if (a === 'lane-take') { takeDrafts(A.kartei.drafts.filter((d) => S.lane.drafts[d.k].state === 'pending').map((d) => d.k)); return; }
    if (a === 'd-take') { takeDrafts([b.dataset.k]); return; }
    if (a === 'd-edit') { S.lane.editing = b.dataset.k; render(); AK.after(() => { const t = AK.$('[data-dedit]'); t && t.focus(); }); return; }
    if (a === 'd-edit-x') { S.lane.editing = null; render(); return; }
    if (a === 'd-edit-ok') { const k = b.dataset.k; const v = AK.$('[data-dedit]').value.trim(); const d = S.lane.drafts[k]; if (v && v !== d.text) { d.text = v; d.edited = true; const fd = A.kartei.drafts.find((x) => x.support && x.support.length); if (fd && fd.k === k && !d.text.includes(fd.support[0].span)) S.lane.flag = 'removed'; } S.lane.editing = null; render(); AK.render(['rail']); return; }
    if (a === 'd-disc') { const k = b.dataset.k; const d = S.lane.drafts[k]; d.state = 'discarded'; d.at = AK.clock(); AK.log(`KI-Entwurf ${AK.kLabel(k)} verworfen · nicht in der Kartei`); render(); AK.render(['rail', 'toolbar']); AK.refreshChips && AK.refreshChips(); return; }
    if (a === 'd-undo') { const k = b.dataset.k; const d = S.lane.drafts[k]; d.state = 'pending'; AK.log(`KI-Entwurf ${AK.kLabel(k)} wiederhergestellt · wartet auf Prüfung`); render(); AK.render(['rail', 'toolbar']); AK.refreshChips && AK.refreshChips(); return; }
    if (a === 'vid') { AK.openVid(); return; }
    if (a === 'vid-x') { S.vidOpen = false; render(); return; }
    if (a === 'vid-c') { S.vidChoice = b.dataset.c; render(); AK.after(() => { const i = AK.$('[data-vid-r]'); i && i.focus(); }); return; }
    if (a === 'vid-t') { S.vidTask = b.dataset.t; render(); return; }
    if (a === 'vid-ok') { vidDone(); return; }
    if (a === 'lab-open') { if (e.target.closest('button')) return; AK.openLabCard && AK.openLabCard(b); return; }
    if (a === 'f-clear') { S.filters = { types: null, problem: 'all', onlyOpen: false, q: '' }; S.searchOpen = false; AK.render(['toolbar', 'view']); return; }
  });
  document.getElementById('ak-view').addEventListener('input', (e) => {
    const S = AK.S;
    if (e.target.matches('[data-vid-r]')) { S.vidReason = e.target.value; const ok = AK.$('[data-vid] [data-act="vid-ok"]'); if (ok) ok.disabled = S.vidReason.trim().length < 3; }
    if (e.target.matches('[data-edit-r], [data-edit-t]')) { const row = e.target.closest('.is-editing'); const ok = row.querySelector('[data-act="edit-save"]'); ok.disabled = !(row.querySelector('[data-edit-r]').value.trim().length >= 3 && row.querySelector('[data-edit-t]').value.trim()); }
  });
  document.getElementById('ak-view').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('[data-vid]') && !e.shiftKey) { const ok = AK.$('[data-vid] [data-act="vid-ok"]'); if (ok && !ok.disabled) { e.preventDefault(); vidDone(); } }
    if (e.key === 'Escape' && (e.target.closest('[data-vid]') || e.target.closest('.is-editing'))) { e.preventDefault(); e.stopPropagation(); AK.S.vidOpen = false; AK.S.editing = null; render(); }
  });

  /* ── keyboard row navigation (no animation) ── */
  AK.navRows = () => AK.$$('#ak-tl [data-nav]').filter((el) => el.offsetParent !== null);
  AK.moveFocus = (dir) => {
    if (AK.S.view !== 'kartei') return;
    const list = AK.navRows(); if (!list.length) return;
    let i = list.findIndex((el) => el.classList.contains('is-focus'));
    i = i < 0 ? (dir > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, i + dir));
    list.forEach((el) => el.classList.remove('is-focus'));
    const el = list[i]; el.classList.add('is-focus'); el.focus({ preventScroll: true });
    AK.S.focusId = el.dataset.row || null;
    const main = document.getElementById('ak-main'), r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
    AK.kbdNav = true;
    if (r.top < m.top + 80) main.scrollTop += r.top - m.top - 80; else if (r.bottom > m.bottom - 170) main.scrollTop += r.bottom - m.bottom + 170;
    AK.bannerSync(true); setTimeout(() => (AK.kbdNav = false), 50);
  };
  AK.activateFocus = () => {
    const el = AK.$('#ak-tl .is-focus'); if (!el) return;
    if (el.matches('.ak-lane-row')) { AK.toggleLane(true, { kbd: true }); return; }
    if (el.matches('.ak-dh-lab')) { AK.openVid({ kbd: true }); return; }
    const id = el.dataset.row; if (!id) return; AK.S.expanded[id] = !AK.S.expanded[id]; AK.S.focusId = id; render();
    const again = AK.$(`#ak-tl [data-row="${id}"]`); if (again) { again.classList.add('is-focus'); again.focus({ preventScroll: true }); }
  };
})();
