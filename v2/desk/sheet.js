/* Desk F — Freigabe ("Apple Pay", not DocuSign). Review-by-deciding: only uncertain fields need a tap.
   Left = Tier 2 (pre-accepted, removable) · Right = Tier 3 (signature; doctor only) with field provenance.
   One seal-and-send hold → "✓ Signiert" → the same element stretches into a 5 s hold-before-transmission bar (Stopp).
   At 0 each item flips to its system result; a dot flies from each Tier-3 card to the services glyph. Then B. */
(function () {
  const DK = window.DK, S = window.Shell, UI = window.UI, D = DK.D, CD = D.consultation, T = DK.table;
  const I = DK.I, esc = DK.esc, mmss = DK.mmss;
  const T3 = ['rezept', 'ueberweisung', 'eaum'];
  const T2 = ['termin', 'cave', 'leistungen'];
  const CH = { packung: ['rezept', 'Packung'], ursache: ['eaum', 'Ursache'], ausgang: ['eaum', 'Ausgehzeiten'] };
  const CHL = { packung: 'Packung', ursache: 'Ursache', ausgang: 'Ausgang', frage: 'Fragestellung' };

  const SH = (DK.sheet = {
    el: null, dim: null, layer: null, sending: null, openFlag: false,
    isOpen() { return this.openFlag; },
    open(o = {}) {
      if (!DK.isArzt()) return;
      if (this.openFlag) return;
      this.openFlag = true;
      document.body.classList.add('dk-sheet-open');
      this.dim = this.dim || S.h('<div class="dk-dim" aria-hidden="true"></div>');
      document.body.appendChild(this.dim);
      this.el = S.h(`<div class="dk-sheet card" role="dialog" aria-modal="true" aria-label="Freigabe · ${esc(D.patient.name)}"><div class="plate"></div></div>`);
      document.body.appendChild(this.el);
      this.render();
      T.canvas.inert = true;
      this.layer = { close: () => this.close() }; S.layers.push(this.layer);
      if (!o.instant && !DK.reduced()) {
        DK.anim(this.dim, [{ opacity: 0 }, { opacity: 1 }], { ms: 260 });
        DK.anim(this.el, [{ opacity: 0, translate: '0 28px', scale: 0.97 }, { opacity: 1, translate: '0 0', scale: 1 }], { spring: DK.spr.sheet });
      }
      DK.setChips(); S.capsule.idle();
      if (this.sending && this.sending.capsule) { this.sending.capsule = false; S.capsule.idle(); }
    },
    close(silent) {
      if (!this.openFlag) return;
      this.openFlag = false;
      document.body.classList.remove('dk-sheet-open');
      T.canvas.inert = false;
      if (this.layer) S.layers.remove(this.layer); this.layer = null;
      const el = this.el, dim = this.dim; this.el = null;
      if (!silent && !DK.reduced()) {
        el.animate([{ opacity: 1 }, { opacity: 0, translate: '0 14px', scale: 0.985 }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => el.remove()).catch(() => el.remove());
        dim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(0.4,0,1,1)', fill: 'forwards' }).finished.then(() => dim.remove()).catch(() => dim.remove());
      } else { el && el.remove(); dim && dim.remove(); }
      if (this.sending && !this.sending.done && !this.sending.stopped) this.capsuleCountdown();
      DK.setChips();
    },

    /* ── render ── */
    /* every amber „Prüfen“ needs a decision before the seal: the three choices + the Fragestellung confirm */
    open3() { const st = DK.story, c = st.choices; return ['packung', 'frage', 'ursache', 'ausgang'].filter((k) => (k === 'frage' ? !st.fragOk : !c[k])); },
    render() {
      const p = D.patient, st = DK.story, plate = this.el.querySelector('.plate');
      plate.innerHTML = `
        <header class="dk-sh-h">
          ${DK.photo(p, 'dk-sh-photo')}
          <div class="dk-sh-id"><b data-private>${esc(p.name)}</b><span class="tnum">*${esc(p.dob)} <i class="dk-sl">/</i> SV ${esc(p.svnr)} <i class="dk-sl">/</i> ${esc(p.carrier.short)}</span></div>
          <span class="dk-sh-meta tnum">${I('stethoscope', 14)}Konsultation ${esc(CD.start)}–${esc(CD.end)} <i class="dk-s">·</i> ${esc(D.practice.doctor.short)}</span>
          <button class="icon-btn" type="button" data-close aria-label="Schließen (Esc)">${I('x', 16)}</button>
        </header>
        <div class="dk-sh-body">
          <section class="dk-sh-col dk-sh-left">
            <div class="dk-sh-colh"><h3>Übernehmen</h3>${UI.tier(2)}</div>
            <div class="dk-sh-rows" data-t2></div>
            <div class="dk-sh-info" data-info></div>
          </section>
          <section class="dk-sh-col dk-sh-right">
            <div class="dk-sh-colh"><h3>Signieren</h3>${UI.tier(3)}<span class="t3">Nur <span class="ui-prov derived">${I('alert', 11)}Prüfen</span> braucht eine Entscheidung · alles andere ist belegt</span></div>
            <div class="dk-docs" data-t3></div>
          </section>
        </div>
        <footer class="dk-sh-f">
          <div class="dk-sh-fl" data-later></div>
          <div class="dk-sh-fr" data-seal></div>
        </footer>`;
      plate.querySelector('[data-close]').onclick = () => this.close();
      this.renderT2(); this.renderInfo(); this.renderT3(); this.renderLater(); this.renderSeal();
      DK.edgeFade(plate.querySelector('.dk-sh-left'));
    },
    renderT2() {
      const box = this.el && this.el.querySelector('[data-t2]'); if (!box) return;
      const st = DK.story, amb = DK.amb();
      box.innerHTML = T2.map((id) => {
        const a = DK.act(id), removed = st.removed.includes(id), ev = a.evidence;
        let type = a.type, title = a.title, meta = '';
        if (id === 'termin') { const parts = DK.swapDate(a.title).split(' · '); title = parts.slice(0, 2).join(' · '); type = `${a.type} · ${parts.slice(2).join(' · ')}`; meta = `<button type="button" class="dk-ambmini" data-ambswap title="Andere Deutung wählen"><span>${esc(CD.ambiguity.heard)}</span> → <b class="tnum">${esc(DK.tx(amb.label).replace(/^[A-Z][a-z] /, ''))}</b>${I('chevron-down', 12)}</button><span class="dk-t2-ev"><b>${esc(ev.who)}</b> · <span class="mono tnum">${mmss(ev.t)}</span></span>`; }
        else if (id === 'cave') meta = `<span class="dk-t2-ev"><b>${esc(ev.who)}</b> · „${esc(ev.quote)}“ · <span class="mono tnum">${mmss(ev.t)}</span></span>`;
        else if (id === 'leistungen') { title = `${a.title.split(' ')[0]} Leistungen`; meta = DK.segT(a.detail.split(' — ')[0], 'dk-t2-d'); }
        const res = st.sentAt && !removed ? `<div class="dk-row-res">${I('check', 13)}${DK.segT(DK.swapDate(a.result))}</div>` : '';
        return `<article class="dk-t2 ${removed ? 'is-removed' : ''} ${st.sentAt ? 'is-sent' : ''}" data-row="${id}">
          <span class="dk-t2-ic">${I(a.icon, 15)}</span>
          <div class="dk-t2-b">
            <div class="dk-t2-top"><span class="dk-t2-type">${esc(type)}</span>${st.sentAt || st.signed ? '' : `<button type="button" class="dk-t2-rm" data-rm="${id}">${removed ? 'Wiederherstellen' : 'Entfernen'}</button>`}</div>
            <p class="dk-t2-t tnum">${esc(title)}</p>
            <div class="dk-t2-m">${meta}</div>
            ${res}
          </div>
        </article>`;
      }).join('');
      DK.edgeFade(this.el.querySelector('.dk-sh-left'));
      box.querySelectorAll('[data-rm]').forEach((b) => (b.onclick = () => { const id = b.dataset.rm; const r = st.removed; const i = r.indexOf(id); if (i >= 0) r.splice(i, 1); else r.push(id); this.renderT2(); }));
      const sw = box.querySelector('[data-ambswap]'); if (sw) sw.onclick = () => { if (st.signed) return; const o = CD.ambiguity.options; st.ambiguity = st.ambiguity === o[0].id ? o[1].id : o[0].id; st.ambChosen = true; this.renderT2(); this.renderT3(); };
    },
    renderInfo() {
      const box = this.el && this.el.querySelector('[data-info]'); if (!box) return;
      const lab = DK.lab.draw;
      const rows = [
        ['flask', `Befund ${DK.short(lab.date)} · besprochen ${mmss(DK.tOf('t6'))}`, 'Vidierung in der Akte'],
        ['file', `Dekurs + Status · ${DK.act('kartei').drafts.length} KI-Entwürfe`, 'in der Akte prüfen'],
        ['check-circle', `NSAR-Hinweis erledigt · ${mmss(DK.tOf('t5'))}`, ''],   /* same words as the Erkannt card */
      ];
      box.innerHTML = `<div class="eyebrow">Zur Kenntnis</div>` + rows.map(([ic, t, r]) => `<div class="dk-inf">${I(ic, 14)}<span class="dk-inf-t">${DK.segT(t)}${r ? `<a class="dk-blue" href="akte.html#post">→ ${esc(r)}</a>` : ''}</span></div>`).join('');
    },
    fieldHTML(docId, f) {
      const st = DK.story;
      const key = Object.keys(CH).find((k) => CH[k][0] === docId && CH[k][1] === f.label);
      if (f.toggleOff) {
        return `<div class="dk-fld is-toggle"><button type="button" class="switch" role="switch" aria-checked="${!!st.emedOff}" data-emed aria-label="Nicht in e-Medikation speichern"></button>${DK.segs(['Nicht in e-Medikation speichern', '<span class="t3">situativer Widerspruch</span>'])}</div>`;
      }
      if (key) {
        const v = st.choices[key];
        return `<div class="dk-fld is-choose ${v ? 'is-set' : ''}" data-ch="${key}">
          <div class="dk-fld-l"><span>${esc(f.label)}</span>${v ? `<span class="dk-prov-ok">${I('check', 11)}entschieden</span>` : UI.prov(f.prov)}</div>
          <div class="dk-segp" role="radiogroup" aria-label="${esc(f.label)}">${f.choose.map((c) => `<button type="button" role="radio" data-v="${esc(c)}" aria-checked="${v === c}" aria-pressed="${v === c}">${esc(c)}</button>`).join('')}</div>
          ${f.hint ? `<p class="dk-fld-h">${DK.segT(f.hint)}</p>` : ''}
        </div>`;
      }
      if (f.confirm) {
        return `<div class="dk-fld is-confirm ${st.fragOk ? 'is-set' : ''}">
          <div class="dk-fld-l"><span>${esc(f.label)}</span>${st.fragOk ? `<span class="dk-prov-ok">${I('check', 11)}bestätigt</span>` : UI.prov(f.prov)}</div>
          <div class="dk-fld-v">${DK.segT(f.value)}</div>
          ${st.fragOk || st.signed ? '' : `<div class="dk-fld-row"><span class="dk-fld-h">${DK.segT(f.hint || '')}</span><button type="button" class="dk-mini-btn" data-frag>Bestätigen</button></div>`}
        </div>`;
      }
      const value = f.ambiguity ? DK.swapDate(f.value) : f.value;
      const lim = docId === 'eaum' ? 26 : 15;
      /* derived but bound to another decision (eAUM Diagnose = today's Kontaktgrund): provenance stays visible, but neutral —
         amber „Prüfen“ is reserved for fields that need a tap here */
      const prov = f.linked && !f.choose && !f.confirm ? `<span class="ui-prov record dk-prov-link">${I('link', 11)}abgeleitet</span>` : UI.prov(f.prov);
      if (!f.linked && String(value).length <= lim) {
        return `<div class="dk-fld is-kv"><span class="dk-kv-l">${esc(f.label)}</span><span class="dk-kv-v ${f.ambiguity ? 'tnum dk-ambval' : ''}" ${f.ambiguity ? `title="${esc(CD.ambiguity.heard)} → ${esc(DK.amb().pick.detail)}"` : ''}>${esc(value)}</span><span class="dk-kv-p" title="Herkunft: ${esc(f.prov)}">${UI.prov(f.prov)}</span></div>`;
      }
      return `<div class="dk-fld">
        <div class="dk-fld-l"><span>${esc(f.label)}</span>${prov}</div>
        <div class="dk-fld-v ${f.ambiguity ? 'tnum' : ''}">${DK.segT(value)}</div>
        ${f.linked ? `<p class="dk-fld-h">${DK.segT(f.hint)}</p>` : f.ambiguity ? `<p class="dk-fld-h">${DK.segs([esc(CD.ambiguity.heard), esc(DK.amb().pick.detail)])}</p>` : ''}
      </div>`;
    },
    docState(id) {
      const st = DK.story, a = DK.act(id);
      if (st.sentAt) {
        const fail = st.eaumFailed && a.failResult;
        return `<div class="dk-doc-res ${fail ? 'is-fail' : 'is-ok'}">${fail ? UI.state('pending') : UI.state('sent')}<p>${DK.segT(fail ? a.failResult : a.result)}</p></div>`;
      }
      if (st.stopped) return `<div class="dk-doc-res">${UI.state('signed', 'nicht übermittelt')}</div>`;
      if (st.signed) return `<div class="dk-doc-res">${UI.state('signed', CD.end)}</div>`;
      return '';
    },
    renderT3() {
      const box = this.el && this.el.querySelector('[data-t3]'); if (!box) return;
      const st = DK.story;
      box.innerHTML = T3.map((id) => {
        const a = DK.act(id);
        const title = id === 'eaum' ? `${a.title.replace(/^arbeitsunfähig /, 'AU ')}` : id === 'ueberweisung' ? a.title.split(' · ').slice(-1)[0] : a.title;
        return `<article class="dk-doc ${st.signed ? 'is-signed' : ''} ${st.sentAt ? 'is-sent' : ''}" data-doc="${id}">
          <header class="dk-doc-h"><span class="dk-doc-ic">${I(a.icon, 15)}</span><div><b>${esc(a.type)}</b><span title="${esc(a.title)}">${esc(title)}</span></div></header>
          <div class="dk-doc-f">${a.fields.map((f) => this.fieldHTML(id, f)).join('')}</div>
          ${this.docState(id)}
        </article>`;
      }).join('');
      const lock = st.signed;
      box.querySelectorAll('[data-ch]').forEach((fld) => fld.querySelectorAll('[data-v]').forEach((b) => { b.disabled = lock; b.onclick = () => { st.choices[fld.dataset.ch] = b.dataset.v; this.renderT3(); this.renderSeal(); }; }));
      const fr = box.querySelector('[data-frag]'); if (fr) fr.onclick = () => { st.fragOk = true; this.renderT3(); this.renderSeal(); };
      const em = box.querySelector('[data-emed]'); if (em) em.onclick = () => { if (lock) return; st.emedOff = !st.emedOff; em.setAttribute('aria-checked', st.emedOff); };
    },
    renderLater() {
      const box = this.el && this.el.querySelector('[data-later]'); if (!box) return;
      const st = DK.story;
      if (st.signed) { box.innerHTML = this.failToggle(); this.bindFail(box); return; }
      box.innerHTML = this._laterAsk
        ? `<div class="dk-later-warn">${I('alert', 15)}<span><b>Patient verlässt Ordination ohne e-Rezept</b> · eAUM morgen = Rückdatierung</span></div><div class="dk-later-a"><button type="button" class="btn btn-ghost btn-sm" data-back>Zurück</button><button type="button" class="btn btn-secondary btn-sm" data-sure>Trotzdem später</button></div>`
        : `<button type="button" class="btn btn-ghost btn-sm" data-later-btn>${I('inbox', 14)}Später in der Akte</button>${this.failToggle()}`;
      const lb = box.querySelector('[data-later-btn]'); if (lb) lb.onclick = () => { this._laterAsk = true; this.renderLater(); };
      const bk = box.querySelector('[data-back]'); if (bk) bk.onclick = () => { this._laterAsk = false; this.renderLater(); };
      const su = box.querySelector('[data-sure]'); if (su) su.onclick = () => this.later();
      this.bindFail(box);
    },
    failToggle() { return `<button type="button" class="dk-link dk-fail" data-fail>${DK.story.eaumFailed ? 'Störung beenden' : 'e-card-System gestört simulieren'}</button>`; },
    bindFail(box) {
      const f = box.querySelector('[data-fail]'); if (!f) return;
      f.onclick = () => {
        const st = DK.story; st.eaumFailed = !st.eaumFailed;
        S.services.set('ecard', st.eaumFailed ? 'warn' : 'ok');
        this.renderLater(); if (st.sentAt) this.renderT3();
        S.notice(st.eaumFailed ? { text: 'e-card-System gestört', detail: 'Behandlung läuft weiter · Übermittlungen werden nachgeholt', tone: 'warn', ms: 2600 } : { text: 'e-card-System wieder bereit', tone: 'info', ms: 1800 });
      };
    },
    renderSeal() {
      const box = this.el && this.el.querySelector('[data-seal]'); if (!box) return;
      const st = DK.story;
      if (st.sentAt) {
        const failed = st.eaumFailed ? T3.filter((id) => DK.act(id).failResult).length : 0;
        box.innerHTML = failed
          ? `<div class="dk-sent is-partial">${I('clock', 16)}<span>${T3.length - failed} von ${T3.length} übermittelt · ${failed} Nacherfassungen offen</span></div>`
          : `<div class="dk-sent">${I('check-circle', 16)}<span>Übermittelt · ${esc(CD.end)}</span></div>`;
        return;
      }
      if (this.sending && !this.sending.done && !this.sending.stopped) { this.sendBar(box); return; }
      if (st.stopped) {
        box.innerHTML = `<div class="dk-seal-stop"><span>${UI.state('signed', 'nicht übermittelt')}</span><button type="button" class="btn btn-primary" data-resend>${I('send', 15)}Jetzt übermitteln</button></div>`;
        box.querySelector('[data-resend]').onclick = () => { st.stopped = false; this.startSend(); };
        return;
      }
      const open = this.open3();
      const lbl = `${I('signature', 17)}Für ${esc(D.patient.name)} signieren · ${T3.length} Dokumente`;
      box.innerHTML = `<div class="dk-seal">
          <p class="dk-seal-why ${open.length ? '' : 'ok'}" aria-live="polite">${open.length ? `${I('alert', 13)}Noch ${open.length} ${open.length === 1 ? 'Angabe' : 'Angaben'} offen: ${open.map((k) => CHL[k]).join(', ')}` : `${I('check', 13)}Alle Angaben entschieden`}</p>
          <div class="dk-seal-btn"><button type="button" class="hold dk-hold" data-hold ${open.length ? 'disabled' : ''}>${lbl}</button>
          <span class="dk-hold-hint">halten · in Produktion: Touch ID / Windows Hello / o-card-PIN</span></div>
        </div>`;
      const btn = box.querySelector('[data-hold]');
      this.holdCtl = UI.hold(btn, { ms: 900, onDone: () => this.signed(btn) });
    },
    async signed(btn) {
      const st = DK.story; st.signed = true;
      S.sound.success();
      btn.querySelectorAll('.hold-base, .hold-fill > span').forEach((s) => (s.innerHTML = `${I('check', 16)}Signiert · ${esc(CD.end)}`));
      this.renderT3(); this.renderT2(); this.renderLater();
      S.story.set({ consultation: 'done', eaumFailed: st.eaumFailed, removed: st.removed.slice(), choices: Object.assign({}, st.choices), ambiguity: st.ambiguity, emedOff: st.emedOff });
      await DK.wait(650);
      this.startSend(btn);
    },
    startSend(fromBtn) {
      const gen = DK.st.gen;
      this.sending = { left: 5, done: false, stopped: false, gen, t0: performance.now() };
      const box = this.el && this.el.querySelector('[data-seal]');
      if (box) this.sendBar(box, fromBtn); else this.capsuleCountdown();
      const tick = () => {
        const s = this.sending; if (!s || s.stopped || s.done || !DK.alive(gen)) return;
        s.left = Math.max(0, 5 - Math.floor((performance.now() - s.t0) / 1000));
        const n = document.querySelectorAll('[data-sleft]'); n.forEach((x) => (x.textContent = s.left));
        if (performance.now() - s.t0 >= 5000) { this.transmit(); return; }
        S.timers.after(100, tick, 'desk-send');
      };
      S.timers.after(100, tick, 'desk-send');
    },
    sendBar(box, fromBtn) {
      const w0 = fromBtn ? fromBtn.offsetWidth : 0;
      box.innerHTML = `<div class="dk-sendbar" role="status"><span class="dk-sendbar-fill"></span><span class="dk-sendbar-t">${I('send', 15)}<span>Wird übermittelt in <b class="tnum" data-sleft>${this.sending.left}</b> s</span></span><button type="button" class="dk-sendbar-stop" data-stop>Stopp</button></div>`;
      const bar = box.querySelector('.dk-sendbar'), fill = bar.querySelector('.dk-sendbar-fill');
      const elapsed = performance.now() - this.sending.t0;
      fill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 5000, easing: 'linear', fill: 'forwards' }).currentTime = elapsed;
      if (w0 && !DK.reduced()) DK.anim(bar, [{ width: w0 + 'px' }, { width: bar.offsetWidth + 'px' }], { spring: DK.spr.morph });
      bar.querySelector('[data-stop]').onclick = () => this.stop();
    },
    capsuleCountdown() {
      if (!this.sending || this.sending.done) return;
      this.sending.capsule = true;
      const s = this.sending;
      S.capsule.confirm({
        width: 560, height: 56,
        html: `<div class="dk-capsend"><span class="dk-capsend-fill"></span><span class="dk-capsend-t">${I('send', 15)}${esc(D.patient.name)} · ${T3.length} Dokumente · Übermittlung in <b class="tnum" data-sleft>${s.left}</b> s</span><button type="button" class="cbtn" data-stop>Stopp</button></div>`,
        bind: (box, done) => {
          const f = box.querySelector('.dk-capsend-fill');
          f.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 5000, easing: 'linear', fill: 'forwards' }).currentTime = performance.now() - s.t0;
          box.querySelector('[data-stop]').onclick = () => { done(null); this.stop(); };
          this._capDone = done;
        },
      });
    },
    stop() {
      if (!this.sending) return;
      this.sending.stopped = true; S.timers.clear('desk-send');
      DK.story.stopped = true;
      if (this._capDone) { this._capDone(null); this._capDone = null; S.capsule.idle(); }
      if (this.el) { this.renderSeal(); this.renderT3(); }
      else S.notice({ text: 'Übermittlung gestoppt', detail: 'signiert · nicht übermittelt — in der Freigabe fortsetzen', tone: 'warn', ms: 3200 });
      DK.setChips();
    },
    async transmit() {
      const st = DK.story, gen = DK.st.gen;
      this.sending.done = true; st.sent = true; st.sentAt = CD.end;
      if (this._capDone) { this._capDone(null); this._capDone = null; }
      S.story.set({ consultation: 'done', eaumFailed: st.eaumFailed, removed: st.removed.slice(), choices: Object.assign({}, st.choices), ambiguity: st.ambiguity, emedOff: st.emedOff });
      if (this.el) {
        this.renderT3(); this.renderT2(); this.renderSeal();
        this.el.querySelectorAll('.dk-doc-res, .dk-row-res').forEach((x, i) => DK.anim(x, [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { spring: DK.spr.summon, delay: i * 60 }));
        this.sendOff();
      } else {
        const failed = st.eaumFailed ? T3.filter((id) => DK.act(id).failResult).length : 0;
        S.capsule.result(failed ? `${T3.length - failed} von ${T3.length} übermittelt` : `${T3.length} Dokumente übermittelt`, { sub: failed ? 'e-Rezept & eAUM: Nacherfassung offen' : D.patient.name, ms: 2200 });
      }
      S.sound.success();
      await DK.wait(this.el ? 1700 : 300); if (!DK.alive(gen)) return;
      if (this.el) this.close();
      this.sending = null;
      DK.advance('B');
    },
    sendOff() {
      const tgt = document.querySelector('[data-svc]');
      const tr = tgt ? tgt.getBoundingClientRect() : { left: innerWidth - 220, top: 24, width: 40, height: 20 };
      const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
      this.el.querySelectorAll('.dk-doc').forEach((doc, i) => {
        const r = doc.getBoundingClientRect(); const fail = DK.story.eaumFailed && DK.act(doc.dataset.doc).failResult;
        if (fail) return;
        const dot = S.h('<i class="dk-dot"></i>'); document.body.appendChild(dot);
        const x0 = r.left + r.width / 2, y0 = r.top + 20;
        const mx = (x0 + tx) / 2 + 40, my = Math.min(y0, ty) - 40;
        dot.animate([{ translate: `${x0}px ${y0}px`, scale: 1, opacity: 1 }, { translate: `${mx}px ${my}px`, scale: 0.9, opacity: 1, offset: 0.5 }, { translate: `${tx}px ${ty}px`, scale: 0.4, opacity: 0.2 }], { duration: 720, delay: i * 90, easing: 'cubic-bezier(0.32,0.72,0,1)', fill: 'both' }).finished.then(() => dot.remove()).catch(() => dot.remove());
      });
    },
    later() {
      const st = DK.story; st.later = true; st.signed = false;
      S.story.set({ consultation: 'done', later: true, removed: st.removed.slice(), choices: Object.assign({}, st.choices) });
      this.close();
      S.notice({ text: `${T3.length} Dokumente unsigniert im Posteingang`, detail: D.practice.doctor.short, tone: 'warn', ms: 3000 });
      st.sentAt = null;
      DK.advance('B');
    },
    fastForwardSigned() {
      const st = DK.story;
      if (!st.signed && !st.later) {
        /* deep link #B = the canonical story: the same decisions the Film takes (first option of each Prüfen field) */
        Object.keys(CH).forEach((k) => { if (!st.choices[k]) { const f = DK.act(CH[k][0]).fields.find((x) => x.label === CH[k][1]); st.choices[k] = f && f.choose ? f.choose[0] : null; } });
        st.fragOk = true; st.ambChosen = true;
        st.signed = true; st.sent = true; st.sentAt = CD.end;
      }
      S.story.set({ consultation: 'done', eaumFailed: st.eaumFailed, removed: st.removed.slice(), choices: Object.assign({}, st.choices), ambiguity: st.ambiguity });
    },
  });
})();
