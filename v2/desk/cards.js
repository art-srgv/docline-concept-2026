/* Desk card renderers — pure HTML-string functions per card id (content of the plate).
   Design language: Poppins, black text at 100 / 40 / 20 %, white 40 % glass cards, blue = people & links
   you can open, orange = attention, red = deadline, outlined status pills, two-line list rows, grey footer bars.
   Interactivity via [data-act] delegation (see scenes.js → DK.actions). Every patient-bound card carries UI.identity(p). */
(function () {
  const DK = window.DK, D = DK.D, P = DK.P, UI = window.UI, S = window.Shell;
  const I = DK.I, esc = DK.esc, short = DK.short, tx = DK.tx;
  const idc = (p = P) => UI.identity(p, { compact: DK.table ? DK.table.onePatient() : true });
  const sep = '<i class="dk-s">·</i>', sl = '<i class="dk-sl">/</i>';
  const dots = (s) => esc(tx(s)).split(' · ').join(` ${sep} `);                 // data "a · b" → the 20 % separator
  const why = (t) => `<footer class="dk-why"><b>Warum hier?</b>${DK.segT(t)}</footer>`;
  const head = (left, right = '') => `<header class="dk-head" data-drag>${left}<span class="dk-head-r">${right}</span></header>`;
  const eb = (...parts) => `<span class="eyebrow dk-eb">${parts.map(esc).join(sep)}</span>`;
  /* status pill: outlined, 12 px, 40 % — `warn` orange outline, `danger` / `attn` soft-filled (list rows) */
  const pill = (text, o = {}) => `<span class="dk-pill ${o.tone || ''}">${o.icon ? I(o.icon, o.size || 15) : ''}<span>${esc(text)}</span></span>`;
  /* post-consultation content only where the story really is post: this desk's own signature, or B/H after a done story.
     A replay jump back to P/K/C never mixes before- and after-consultation states. */
  const done = () => DK.story.signed || DK.story.later || (['B', 'H'].includes(DK.st.scene) && S.story.get().consultation === 'done');
  DK.isPost = done;
  /* Vidieren outcome (Desk lab card) → one state for one Befund everywhere on the desk (P6) */
  const vidState = () => UI.state('reviewed', `${D.practice.doctor.short} · ${DK.story.vidiert.at || D.now.time}`);
  const reasonTone = (r) => (/labor|befund/i.test(r) ? 'o' : 'b');             // blue = the booked reason · orange = needs attention (unreviewed lab)

  const C = {};

  /* ───────────── P · Als Nächstes (hero, left wing) — the patient card ───────────── */
  C.next = {
    title: 'Als Nächstes', group: 'praxis', icon: 'user',
    html() {
      const lab = DK.lab, fe = lab.A('Ferritin'), ibu = DK.ibu(), loop = DK.loop();
      const arzt = DK.isArzt();
      const reasons = String(P.appointment.reason).split(' · ');
      return `${head(eb('Als Nächstes', `Termin ${P.appointment.time}`))}
        ${DK.photo(P, 'dk-next-photo')}
        <h2 class="dk-name" data-private>${esc(P.name)}</h2>
        <div class="dk-meta tnum"><span>${P.age} J.</span>${sl}<span>*${esc(P.dob)}</span>${sl}<span>${esc(P.carrier.short)}</span></div>
        <div class="dk-checks"><span>${I('check', 16)}e-card</span><span>${I('check', 16)}ELGA</span></div>
        <ul class="dk-reasons">${reasons.map((r) => `<li class="r-${reasonTone(r)}">${esc(r)}</li>`).join('')}</ul>
        <div class="dk-pills">${pill(`Wartezimmer seit ${P.appointment.arrived}`, { icon: 'clock' })}${DK.story.cave ? '' : pill('CAVE nicht erhoben', { tone: 'warn', icon: 'alert' })}</div>
        <hr class="dk-rule">
        <div class="dk-lbl">Neu seit ${esc(DK.sinceLast())}</div>
        <ul class="dk-rows">
          <li><span class="dk-well">${I('flask', 12)}</span><span class="dk-row-t">Labor ${esc(short(lab.draw.date))}${sep}Ferritin ${UI.val(lab.last(fe).v, fe.dec, fe.unit)}${sep}${DK.story.vidiert ? '<em class="dk-t40">vidiert</em>' : '<em class="dk-warn-t">ungeprüft</em>'}</span></li>
          <li><span class="dk-well">${I('slash-circle', 12)}</span><span class="dk-row-t">${esc(ibu.name)} (e-Medikation ${esc(short(ibu.since))})<i class="dk-s dk-arrow">→</i>${esc(DK.nsar())}</span></li>
          <li title="${esc(loop.what)} ${esc(loop.date)} — ${esc(loop.state)}"><span class="dk-well">${I('link', 12)}</span><span class="dk-row-t">${esc(loop.what.replace(/^Überweisung\s+/, ''))} ${esc(loop.date)}${sep}${esc(loop.state)}</span></li>
        </ul>
        <hr class="dk-rule">
        <div class="dk-lbl">Letzter Besuch ${esc(short(P.lastConsultation.date))}${sep}<a class="dk-blue" href="akte.html#pre" data-act="akte">${esc(P.lastConsultation.by)}</a></div>
        <p class="dk-summary">${esc(P.lastConsultation.summary)}</p>
        <div class="dk-actions dk-actions-split">
          ${arzt ? `<button class="btn btn-primary btn-lg" type="button" data-act="consult">Konsultation starten<span class="dk-enter">↵</span></button>` : `<button class="btn btn-primary btn-lg" type="button" data-act="open">Patient öffnen</button>`}
          ${arzt ? `<button class="btn btn-secondary btn-lg" type="button" data-act="open">Akte</button>` : ''}
        </div>`;
    },
  };

  /* ───────────── P · Wartet auf Sie / Meine Aufgaben (right wing) ───────────── */
  C.inbox = {
    title: () => (DK.isArzt() ? 'Wartet auf Sie' : 'Meine Aufgaben'), group: 'praxis', icon: 'inbox',
    html() {
      if (!DK.isArzt()) {
        const q = D.assistantQueue;
        return `${head(eb('Meine Aufgaben'), `<span class="dk-head-k tnum">${q.count} offen</span>`)}
          <ul class="dk-inbox dk-tasks">${q.items.map((t, i) => { const m = t.match(/^([^:]+):\s+(.*)$/); return `<li><button type="button" data-act="na" data-i="${i}">
            <span class="dk-in-1" data-private>${esc(m ? m[1] : 'Praxis')}</span><span class="dk-in-2">${esc(tx(m ? m[2] : t))}</span><span class="dk-in-r"><span class="dk-tick" aria-hidden="true"></span></span></button></li>`; }).join('')}</ul>
          <footer class="dk-foot"><span class="dk-foot-l">${I('stethoscope', 16)}Klinischer Posteingang</span><span>${esc(D.practice.doctor.short)}</span></footer>`;
      }
      const ib = D.clinicalInbox;
      const tone = (g) => (g.urgent ? 'danger' : g.flagged ? 'warn' : '');
      const stat = (g) => {
        const d = tx(String(g.detail || '').split(' · ')[0]);
        return `<button type="button" class="dk-stat" data-act="inbox-group" data-g="${g.id}"><b class="dk-stat-n tnum ${tone(g)}">${g.count}</b><span class="dk-stat-t"><span class="dk-stat-l">${esc(g.label)}</span><span class="dk-stat-d ${tone(g)}">${esc(d)}${g.urgent ? I('alert', 13) : ''}</span></span></button>`;
      };
      const top = [...ib.top].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
      const clean = (t) => tx(t).replace(/\s(?:L|H|LL|HH)$/, '');                 // the pill carries the attention, not a flag letter
      return `${head(eb('Wartet auf Sie'), `<span class="dk-head-k">klinisch</span>`)}
        <div class="dk-stats">${ib.groups.map(stat).join('')}</div>
        <ul class="dk-inbox">${top.map((it) => {
          const [s1, ...s2] = String(it.state).split(' · ');
          const vid = DK.story.vidiert && it.patient === P.name && it.flagged;
          const right = vid ? pill('Vidiert', { icon: 'check', size: 13 })
            : it.urgent ? pill(tx(s1), { tone: 'danger', icon: 'clock', size: 13 })
            : it.flagged ? pill(s1, { tone: 'attn', icon: 'alert', size: 13 })
            : `<span class="dk-in-1">${esc(s1)}</span><span class="dk-in-2">${esc(s2.join(' · '))}</span>`;
          return `<li><button type="button" data-act="inbox-row" data-i="${it.id}">
            <span class="dk-in-1">${dots(clean(it.text))}</span>
            <span class="dk-in-2"><b data-private>${esc(it.patient)}</b>${sep}${esc(it.type)}</span>
            <span class="dk-in-r ${vid || it.urgent || it.flagged ? 'is-pill' : ''}">${right}</span></button></li>`;
        }).join('')}</ul>
        <footer class="dk-foot"><span class="dk-foot-l">${I('users', 16)}Assistenz</span><span>${D.assistantQueue.count} organisatorische Aufgaben</span></footer>`;
    },
  };

  /* ───────────── P · Wartezimmer ───────────── */
  C.wait = {
    title: 'Wartezimmer', group: 'praxis', icon: 'users',
    html() {
      const s = DK.waitStats(), ds = D.dayStats;
      return `${head(`<span class="dk-wz-t">Wartezimmer ${sep} <span class="tnum">${s.n}</span></span>`, `<span class="dk-softchip">${I('clock', 13)}<span class="tnum">${s.walkIn} ohne Termin</span></span>`)}
        <div class="dk-wz-sub">längste Wartezeit <em class="dk-warn-t tnum">${s.longest} Min</em></div>
        <div class="dk-queue">${D.waiting.map((w, i) => `<button type="button" class="dk-q ${i === 0 ? 'is-next' : ''} ${w.termin ? '' : 'walkin'} ${w.ecard ? '' : 'noecard'}" data-act="q" data-i="${i}" aria-label="${esc(w.name)}" data-private><span>${esc(DK.ini(w.name))}</span></button>`).join('')}</div>
        <footer class="dk-wz-foot tnum"><span class="dk-wz-day"><span>${ds.termine} Termine</span>${sep}<span>${ds.erledigt} erledigt</span>${sep}<button type="button" class="dk-blue" data-act="na">${esc(DK.visite())} Visite</button></span><span class="dk-legend">Termin<i class="lg-t"></i>ohne<i class="lg-w"></i></span></footer>`;
    },
  };

  /* ───────────── K · Anchor (full / strip / post) — the same patient card with identity details ───────────── */
  C.anchor = {
    title: 'Ali Demir', group: 'demir', icon: 'user', pinned: true,
    html(mode) {
      const post = done();
      if (mode === 'strip') {
        return `<div class="dk-strip" data-drag>
          ${DK.photo(P, 'dk-strip-photo')}
          <div class="dk-strip-id"><b data-private>${esc(P.name)}</b><span class="tnum">*${esc(P.dob)} ${sl} ${P.age} J. ${sl} ${esc(P.carrier.short)}</span></div>
          <span class="dk-strip-ok">${I('check', 14)}Identität bestätigt ${sep} ${esc(DK.CD.start)}</span>
        </div>`;
      }
      const arzt = DK.isArzt();
      const caveNone = post || DK.story.cave === 'none';
      const cave = caveNone
        ? `<div class="dk-cave is-ok">${I('shield', 16)}<span><b>CAVE</b> keine bekannten Allergien ${sep} <span class="tnum">${esc(short(P.cave.post.at))}</span></span></div>`
        : `<div class="dk-cave">${I('alert', 16)}<div class="dk-cave-b"><span class="dk-cave-t"><b>CAVE</b> ${esc(P.cave.pre.label)}</span>
            ${arzt ? `<span class="dk-cave-a"><button type="button" class="dk-mini-btn" data-act="cave-none">Keine bekannt</button><button type="button" class="dk-mini-btn ghost" data-act="cave-add">Eintragen …</button></span>` : `<span class="dk-cave-a dk-t40">Erhebung durch ${esc(D.practice.doctor.short)}</span>`}</div></div>`;
      const status = post
        ? [['stethoscope', `Konsultation ${DK.CD.start}–${DK.CD.end} · ${D.practice.doctor.short}`], ['card', `e-card gesteckt ${P.ecard.time} · ${P.ecard.entitlement}`], ['database', `ELGA bis ${short(P.elga.until)} · e-Impfpass bis ${short(DK.impf())}`]]
        : [['card', `e-card gesteckt ${P.ecard.time} · ${P.ecard.entitlement}`], ['database', `ELGA bis ${short(P.elga.until)} · e-Impfpass bis ${short(DK.impf())}`],
          DK.story.objected ? ['mic-off', `Widerspruch ${DK.story.objected} · Transkript gelöscht`] : ['mic', `${P.consent.label} (${P.consent.by} ${P.consent.at})`]];
      const where = post ? 'nach Konsultation' : ['C', 'F'].includes(DK.st.scene) ? `in Konsultation · ${D.practice.room}` : 'im Wartezimmer';
      return `${head(eb('Patient', where), `<span class="dk-head-k dk-pinned">${I('pin', 13)}angeheftet</span>`)}
        ${DK.photo(P, 'dk-anchor-photo')}
        <div class="dk-anchor-id">
          <h2 class="dk-name" data-private>${esc(P.name)}</h2>
          <div class="dk-meta tnum"><span>${esc(P.sexLabel)}</span>${sl}<span>${P.age} J.</span>${sl}<span>*${esc(P.dob)}</span></div>
          <div class="dk-meta dk-meta-k tnum"><span>SV ${esc(P.svnr)}</span></div>
          <div class="dk-meta dk-meta-k"><span class="dk-carrier" title="${esc(P.carrier.long)} — ${esc(P.carrier.note)}">${esc(P.carrier.short)}</span>${sl}<span>${esc(P.fall.code)} ${esc(P.fall.label)} ${esc(DK.quarterShort())}</span></div>
        </div>
        <ul class="dk-rows dk-status">${status.map(([ic, t]) => `<li><span class="dk-well">${I(ic, 12)}</span>${DK.segT(t, 'dk-row-segs')}</li>`).join('')}</ul>
        ${cave}
        <hr class="dk-rule">
        <div class="dk-lbl">Dauerdiagnosen</div>
        <ul class="dk-dl">${P.problems.map((p) => `<li><span class="dk-code">${esc(p.code)}</span><span>${esc(p.label)}</span></li>`).join('')}</ul>
        <div class="dk-lbl">Fällig</div>
        <ul class="dk-dl dk-due">${P.due.map((d) => `<li title="${esc(d.kind)}"><span>${esc(d.text).split(' · ').join(` ${sep} `)}</span></li>`).join('')}</ul>
        <div class="dk-actions dk-actions-split">
          ${arzt && !post ? `<button class="btn btn-primary btn-lg" type="button" data-act="consult">Konsultation starten<span class="dk-enter">↵</span></button>` : ''}
          <a class="btn ${post || !arzt ? 'btn-primary' : 'btn-secondary'} btn-lg" href="akte.html#${post ? 'post' : 'pre'}" data-act="akte">Akte${post || !arzt ? ' öffnen' : ''}</a>
        </div>
        ${why(post ? 'Bleibt bis zum nächsten Patienten' : 'Aktiver Patient · bleibt angeheftet')}`;
    },
  };

  /* ───────────── K0 · Neu seit 14.08 (pre-brief) ───────────── */
  C.neu = {
    title: 'Neu seit 14.08', group: 'demir', icon: 'stars',
    html() {
      const lab = DK.lab, fe = lab.A('Ferritin'), hb = lab.A('Hämoglobin'), ibu = DK.ibu(), loop = DK.loop();
      const post = done();
      const hbD = lab.last(hb).v - lab.prev(hb).v;
      return `${head(eb(`Neu seit ${DK.sinceLast()}`), idc())}
        <ul class="dk-news">
          <li>
            <span class="dk-well dk-well-l">${I('flask', 15)}</span>
            <div class="dk-news-b">
              <div class="dk-news-t"><span class="dk-lbl">Labor ${esc(short(lab.draw.date))}</span>${DK.story.vidiert ? vidState() : post ? UI.state('discussed', DK.mmss(DK.tOf('t6'))) : UI.state('unreviewed')}</div>
              <div class="dk-news-v tnum">Ferritin <b class="${DK.story.vidiert ? '' : 'dk-warn-t'}">${UI.val(lab.last(fe).v, fe.dec, fe.unit)}</b> ${UI.flag(lab.last(fe).flag)}${sep}Hb ${UI.val(lab.last(hb).v, hb.dec, hb.unit)} ${UI.trend(hbD, 1)}</div>
              ${DK.story.vidiert && DK.story.vidiert.action ? `<div class="dk-news-a">${I('arrow-right', 13)}<span>${esc(DK.story.vidiert.action)}</span></div>` : ''}
              ${DK.isArzt() && !DK.story.vidiert ? `<button class="btn btn-secondary btn-sm dk-open-befund" type="button" data-act="open-befund">${I('file', 14)}Befund öffnen <span class="dk-t40">${lab.count()} Werte ${sep} ${lab.flagged()} auffällig</span></button>` : ''}
            </div>
          </li>
          <li>
            <span class="dk-well dk-well-l">${I('slash-circle', 15)}</span>
            <div class="dk-news-b">
              <div class="dk-news-t"><span class="dk-lbl">e-Medikation</span><span class="dk-t40 tnum">${esc(ibu.name)} ${esc(ibu.dose)} ${sep} ${esc(short(ibu.since))}</span></div>
              ${UI.hint(Object.assign({}, D.hint, { text: tx(D.hint.text) }), { resolved: post })}
            </div>
          </li>
          <li>
            <span class="dk-well dk-well-l">${I('link', 15)}</span>
            <div class="dk-news-b">
              <div class="dk-news-t"><span class="dk-lbl">${esc(loop.what.split(' ')[0])} ${esc(loop.date)}</span>${UI.state('loop')}</div>
              <div class="dk-news-v">${DK.segs([esc(loop.what.split(' ').slice(1).join(' ') || loop.what), esc(loop.state)])}</div>
            </div>
          </li>
        </ul>
        ${why('Neu seit letztem Besuch · automatisch beim Aufruf')}`;
    },
  };

  /* ───────────── K1 · Blutbefunde (key card) ───────────── */
  C.labs = {
    title: 'Blutbefunde', group: 'demir', icon: 'flask',
    html(mode) {
      const lab = DK.lab, fe = lab.A('Ferritin'), rows = lab.rows();
      const arzt = DK.isArzt(), post = done();
      const dates = lab.dates.map(short).join(' / ');
      if (mode === 'full') {
        const d = lab.draw, kr = lab.A('Kreatinin');
        const st = DK.story.vidiert ? vidState() : post ? UI.state('discussed', DK.mmss(DK.tOf('t6'))) : UI.state('unreviewed');
        const va = DK.story.vidiert && DK.story.vidiert.action;
        return `${head(eb('Laborbefund', 'vollständig'), idc())}
          <div class="dk-title-row"><h3 class="dk-title">Laborbefund ${esc(d.date)}</h3>${st}</div>
          <p class="dk-sub">${DK.segT(d.source)}</p>
          ${va ? `<p class="dk-vid-out">${I('arrow-right', 13)}<span>${esc(va)}</span></p>` : ''}
          <dl class="dk-report-meta tnum">
            <div><dt>angeordnet</dt><dd>${dots(d.ordered)}</dd></div>
            <div><dt>abgenommen</dt><dd>${dots(d.drawn)}</dd></div>
            <div><dt>eingegangen</dt><dd>${dots(d.received)}</dd></div>
          </dl>
          ${UI.labTable(rows, { trend: true })}
          ${kr.derived ? `<p class="dk-derived tnum">${esc(kr.derived.key)} ${UI.val(kr.derived.v, 0, kr.derived.unit)} <span class="dk-t40">${sep} berechnet aus Kreatinin</span></p>` : ''}
          <div class="dk-vid" data-vid></div>
          <div class="dk-actions" data-lab-actions>
            <button class="btn btn-ghost btn-sm" type="button" data-act="lab-compact">${I('chevron-left', 14)}Vergleich</button>
            ${arzt && !DK.story.vidiert ? `<button class="btn btn-primary btn-sm dk-ml-auto" type="button" data-act="vidieren">${I('check', 14)}Vidieren</button>` : ''}
            ${!arzt ? `<span class="dk-t40 dk-assigned">zugewiesen: ${esc(D.practice.doctor.short)}</span>` : ''}
          </div>`;
      }
      const flagged = !!lab.last(fe).flag && !DK.story.vidiert;
      return `${head(eb('Labor', `${lab.dates.length} Befunde`), idc())}
        <h3 class="dk-title">Blutbefunde ${sep} <span class="tnum">${esc(dates)}</span></h3>
        <div class="dk-hero">
          <div class="dk-hero-fig"><span class="dk-hero-n tnum ${flagged ? 'dk-warn-t' : ''}">${DK.num(lab.last(fe).v, fe.dec)}</span><span class="dk-hero-u">${esc(fe.unit)}</span></div>
          <div class="dk-hero-m"><div><span>Ferritin</span> ${UI.flag(lab.last(fe).flag)} ${lab.last(fe).isNew ? '<span class="dk-new">neu</span>' : ''}</div><div class="dk-t40 tnum">Referenz ${esc(fe.ref)} ${esc(fe.unit)} ${sep} erstmals bestimmt</div></div>
        </div>
        <div class="dk-cmp">${tx(UI.labCompare(D.labs.analytes, { dates: lab.dates, height: 104 }))}</div>
        ${UI.labTable(rows, { trend: true })}
        <p class="dk-src">${I('info', 13)}${DK.segs([`${lab.dates.length} Befunde`, 'Laborschnittstelle + ELGA (seit 01/2026)', 'Duplikat zusammengeführt', 'ELGA kann unvollständig sein'])}</p>
        <div class="dk-actions dk-actions-tight"><button class="btn btn-secondary btn-sm" type="button" data-act="lab-full">${I('file', 14)}Befund ${esc(short(lab.draw.date))} vollständig öffnen</button></div>`;
    },
  };

  /* ───────────── K2 · Medikation ───────────── */
  C.meds = {
    title: 'Medikation', group: 'demir', icon: 'pill',
    html() {
      const post = done();
      const grp = [['Dauer', 'Dauer'], ['Bei Bedarf', 'Bei Bedarf'], ['Extern', 'Extern · ELGA e-Medikation']];
      return `${head(eb('Medikation', 'aktuell'), idc())}
        ${grp.map(([g, lbl]) => { const ms = D.medications.filter((m) => m.group === g); return ms.length ? `<section class="dk-medg"><div class="dk-lbl">${dots(lbl)}</div>${ms.map((m) => UI.medRow(Object.assign({}, m, { since: short(m.since), lastRx: m.lastRx ? { pre: tx(m.lastRx.pre), post: tx(m.lastRx.post) } : m.lastRx, post: m.post && tx(m.post) }), { post })).join('')}</section>` : ''; }).join('')}
        <div class="dk-hintwrap">${UI.hint(Object.assign({}, D.hint, { text: tx(D.hint.text) }), { resolved: post || DK.story.hintResolved })}</div>`;
    },
  };

  /* ───────────── C · Gespräch / Erkannt / Vorschläge (content filled by consult.js) ───────────── */
  C.talk = {
    title: 'Gespräch', group: 'demir', icon: 'message', fixedH: true,
    html() {
      return `<header class="dk-head dk-talk-h" data-drag>
          <span class="dk-talk-title"><span class="dk-title">Gespräch ${sep} <span class="dk-t40">Auszug</span></span><span class="dk-meter" aria-hidden="true">${'<i></i>'.repeat(5)}</span></span>
          <button type="button" class="dk-link" data-act="objection">Patient widerspricht</button>
        </header>
        <p class="dk-retention">${DK.segs(['Audio wird nach der Transkription gelöscht', 'Transkript 30 Tage für Nachweise'])}</p>
        <div class="dk-lines" data-lines></div>`;
    },
  };
  C.facts = {
    title: 'Erkannt', group: 'demir', icon: 'stars', fixedH: true,
    groups: ['Beschwerden', 'Medikation', 'Befund', 'Status', 'Werte', 'Procedere'],
    html() {
      return `${head(`<span class="dk-title">Erkannt</span>`, `<span class="dk-head-k tnum" data-fcount>—</span>`)}
        <div class="dk-facts">${C.facts.groups.map((g) => `<section class="dk-fg" data-g="${g}"><h4>${esc(g)}</h4><ul data-fl></ul></section>`).join('')}</div>`;
    },
  };
  C.props = {
    title: 'Vorschläge', group: 'demir', icon: 'stars', fixedH: true,
    html() {
      return `${head(`<span class="dk-title">Vorschläge</span>`, `<span class="dk-head-k" data-pcount>vorbereitet · nichts wird ausgeführt</span>`)}
        <div class="dk-amb" data-amb hidden></div>
        <div class="dk-props" data-props></div>
        <p class="dk-props-empty" data-pempty>Erscheinen, sobald im Gespräch etwas angeordnet wird.</p>`;
    },
  };

  /* ───────────── Assistenz during C/F ───────────── */
  C.busy = {
    title: 'Konsultation', group: 'demir', icon: 'stethoscope',
    html() {
      const f = DK.st.scene === 'F';
      return `${head(eb(f ? 'Freigabe' : 'Konsultation'), idc())}
        <div class="dk-busy">
          <span class="dk-well dk-well-xl">${I(f ? 'signature' : 'stethoscope', 20)}</span>
          <div><h3 class="dk-title">${f ? `Wartet auf Freigabe durch ${esc(D.practice.doctor.short)}` : `Konsultation läuft bei ${esc(D.practice.doctor.short)}`}</h3>
          <p class="dk-sub">${f ? 'Vorbereitete Aufträge erscheinen hier, sobald sie freigegeben sind.' : `seit ${esc(DK.CD.start)} ${sep} ${esc(D.practice.room)} ${sep} Mitschrift aktiv`}</p></div>
        </div>`;
    },
  };

  /* ───────────── B · Konsultationsbericht ───────────── */
  C.report = {
    title: 'Konsultationsbericht', group: 'demir', icon: 'check-circle',
    html() {
      const r = DK.CD.report, st = DK.story, rem = st.removed || [];
      const ext = (l) => /übermittelt|an BVAEB|erstellt/.test(l);
      const map = [
        ['rezept', r.lines[0]], ['ueberweisung', r.lines[1]], ['eaum', r.lines[2]], ['termin', r.lines[3]], ['cave', r.lines[4]], ['leistungen', r.lines[5]],
      ];
      const lines = map.filter(([id]) => !rem.includes(id)).map(([id, l]) => {
        const txt = tx(DK.swapDate(l));
        if (st.later && DK.act(id).tier === 3) return `<li class="is-pending"><span class="dk-well">${I('clock', 12)}</span><span>${esc(DK.act(id).type)} ${sep} unsigniert im Posteingang ${esc(D.practice.doctor.short)}</span></li>`;
        if (st.eaumFailed && DK.act(id).failResult) { const fr = DK.act(id).failResult.split(' — '); const what = id === 'eaum' ? (fr[1] || fr[0]).split(' · ')[0] : fr[0]; return `<li class="is-pending"><span class="dk-well">${I('clock', 12)}</span><span>${esc(DK.act(id).type.split(' · ')[0])} ${sep} ${esc(what)}</span>${UI.state('pending')}</li>`; }
        return `<li class="${ext(l) ? 'is-ext' : ''}"><span class="dk-well">${I('check', 12)}</span><span>${dots(txt)}</span></li>`;
      }).join('');
      const hand = r.handoff.filter((x) => !(rem.includes('termin') && /^Termin \d/.test(x)));
      const title = tx(r.title).split(' · ');
      return `${head(eb('Konsultationsbericht'), idc())}
        <h3 class="dk-title">${esc(title[0])}${title[1] ? ` ${sep} <span class="dk-t40">${esc(title.slice(1).join(' · '))}</span>` : ''}</h3>
        <ul class="dk-report">${lines}</ul>
        <section class="dk-handoff ${DK.isArzt() ? '' : 'is-mine'}">
          <div class="dk-lbl">${I('users', 14)}Übergabe an Anmeldung${DK.isArzt() ? '' : ` ${sep} für Sie`}</div>
          <ul>${hand.map((x) => `<li>${/✓/.test(x) ? `<span class="dk-tick is-done">${I('check', 10)}</span>` : '<span class="dk-tick"></span>'}<span>${esc(tx(DK.swapDate(x.replace(/\s*✓\s*$/, ''))))}</span></li>`).join('')}</ul>
        </section>
        <div class="dk-pending">${UI.state('draft')}<span>${esc(r.pending)}</span>${DK.isArzt() ? `<a class="btn btn-secondary btn-sm" href="akte.html#post" data-act="akte">In der Akte prüfen${I('arrow-right', 14)}</a>` : ''}</div>`;
    },
  };

  /* ───────────── Next patient (not elaborated) ───────────── */
  C.anchor2 = {
    title: 'Karin Hofbauer', group: 'hofbauer', icon: 'user', pinned: true,
    html() {
      const k = DK.hofbauer();
      return `${head(eb('Patientin', 'im Wartezimmer'), `<span class="dk-head-k dk-pinned">${I('pin', 13)}angeheftet</span>`)}
        <div class="dk-anchor2-id">${DK.photo({ initials: k.initials }, 'dk-anchor2-photo')}<div><h2 class="dk-name" data-private>${esc(k.name)}</h2><div class="dk-meta tnum"><span>${k.age} J.</span>${sl}<span>${esc(k.anliegen)}</span>${sl}<span>${k.termin ? 'Termin ' + esc(k.termin) : 'ohne Termin'}</span></div></div></div>
        <ul class="dk-rows dk-status"><li><span class="dk-well">${I('clock', 12)}</span><span class="dk-row-t">Wartezimmer seit ${esc(k.arrived)}</span></li><li><span class="dk-well">${I('card', 12)}</span><span class="dk-row-t">e-card gesteckt</span></li></ul>
        <div class="dk-demo-end">${I('info', 16)}<span>Demo endet hier — ${esc(k.name)} ist nicht ausgearbeitet. Ali Demirs Karten liegen in seiner Ablage.</span></div>`;
    },
  };

  DK.C = C;
  DK.cardTitle = (id) => { const c = C[id]; return typeof c.title === 'function' ? c.title() : c.title; };

  /* centre stage (P) — not a card: the time block */
  DK.stageHTML = () => {
    const arzt = DK.isArzt(), n = D.clinicalInbox.top.length;
    return `<div class="dk-st-date">${esc(D.now.long)}</div>
      <div class="dk-time tnum" aria-label="${esc(D.now.time)} Uhr">${esc(D.now.time)}</div>
      <p class="dk-st-line"><button type="button" class="dk-tok dk-blue" data-act="open" data-private>${esc(P.salutation.replace('Hr.', 'Herr'))}</button> <span class="dk-t40">ist da</span>${sep}${arzt
        ? `<button type="button" class="dk-tok" data-act="focus-inbox">${n} Entscheidungen</button> <span class="dk-t40">warten auf Sie</span>`
        : `<button type="button" class="dk-tok" data-act="focus-inbox">${D.assistantQueue.count} Aufgaben</button> <span class="dk-t40">für Sie</span>`}</p>`;
  };
})();
