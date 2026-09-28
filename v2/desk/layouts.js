/* Desk slot layouts — deterministic functions layouts[scene](g, hOf) → { id: { x, y, w, h? } }.
   g = DK.geom(); hOf(id, w) measures a card's natural height at width w.
   Wings hug the viewport edges at x = 20 and W − 20 (411 px at 1600), the stage sits on the
   capsule axis (x = W / 2). Tested at 1600×900 (reference artboard), 1512×830, 1440×900, 1920×1080. A user drag overrides the
   slot per card id (see table.js). */
(function () {
  const DK = window.DK;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = Math.round;
  const CHIPS_W = 668;                                   // the chip row (3 chips) — the wings never reach into it

  /* P — composition: patient card left (411 × 635), "Wartet auf Sie" + "Wartezimmer" right (408 + 25 + 202),
     vertically centred (top = H/2 − 317 at 900 px); the time block centred on the axis 68 px below the card tops. */
  function wings(g, hOf) {
    const w = DK.wingW(g.W), gap = 25;
    const hn = hOf('next', w), hi = hOf('inbox', w), hw = hOf('wait', w);
    const col = Math.max(hn, hi + gap + hw);
    let top = R(g.H / 2 - col / 2);
    const chipsL = (g.W - CHIPS_W) / 2 - 8;
    if (g.L + w > chipsL) top = Math.min(top, g.bottom - col);          // wings overlap the chip row horizontally → end above it
    top = Math.min(top, g.bottomL - col);                              // clear of the presenter pill (bottom-left)
    const capHalf = Math.min(470, (g.W - 300) / 2);                    // the capsule while it listens to a long command (T1)
    if (g.L + w > g.cx - capHalf) top = Math.min(top, g.H - 114 - col); // … never touches the wings (its top = H − 40 − 62, + 12 air)
    top = Math.max(87, top);
    return { w, gap, hi, col, top };
  }

  /* K — anchor (left wing, same place as the P patient card) | the card you asked for on the capsule axis | right wing */
  function kcols(g) {
    const aw = DK.wingW(g.W);
    const avail = g.R - g.L - aw;
    const rw = clamp(R(avail * 0.38), 380, 460);
    const cw = clamp(avail - rw - 2 * 48, 480, 600);
    const gap = Math.max(24, Math.floor((avail - rw - cw) / 2));
    const cxL = g.L + aw + 24, cxR = g.R - rw - 24;
    const c = R(clamp(g.cx - cw / 2, cxL, cxR - cw));
    return { aw, cw, rw, gap, a: g.L, c, r: g.R - rw, cxL, cxR };
  }
  const centred = (g, k, w) => R(clamp(g.cx - w / 2, k.cxL, k.cxR - w));

  const L = {
    P(g, hOf) {
      const k = wings(g, hOf);
      return {
        next: { x: g.L, y: k.top, w: k.w, h: k.col },
        inbox: { x: g.R - k.w, y: k.top, w: k.w },
        wait: { x: g.R - k.w, y: k.top + k.hi + k.gap, w: k.w, h: k.col - k.hi - k.gap },
        _stage: { x: R(g.cx - 230), y: k.top + 68, w: 460 },
      };
    },
    Kbase(g, hOf, centreNeu) {
      const k = kcols(g), top = g.safeTop, wt = g.wingTop;          // wings sit where the P cards sit; centre cards clear the sub-row pill
      /* K0: nothing asked for yet → the pre-brief takes the centre stage; K1/K2: it moves to the right wing for the requested card */
      const nw = centreNeu ? Math.min(460, k.cw) : k.rw;
      const nx = centreNeu ? centred(g, k, nw) : k.r;
      return {
        anchor: { x: k.a, y: wt, w: k.aw },
        neu: { x: nx, y: centreNeu ? top : wt, w: nw },
        labs: { x: k.c, y: top, w: k.cw },
        meds: { x: centred(g, k, 440), y: top + 56, w: 440 },
        busy: { x: centred(g, k, 460), y: top, w: 460 },
      };
    },
    K0(g, hOf) { return L.Kbase(g, hOf, true); },
    K1(g, hOf) { return L.Kbase(g, hOf, false); },
    K2(g, hOf) { return L.Kbase(g, hOf, false); },
    C(g) {
      const S = Math.min(g.R - g.L, 1760);
      const x0 = R(g.cx - S / 2);
      const gap = 20, pw = S >= 1400 ? 420 : 390;
      const tw = R(S * 0.34);
      const fw = S - tw - pw - 2 * gap;
      const top = g.safeTop, bot = g.bottom;
      return {
        anchor: { x: x0, y: top, w: tw, h: 64 },
        talk: { x: x0, y: top + 64 + 16, w: tw, h: bot - (top + 80) },
        facts: { x: x0 + tw + gap, y: top, w: fw, h: bot - top },
        props: { x: x0 + tw + gap + fw + gap, y: top, w: pw, h: bot - top },
        busy: { x: x0 + tw + gap, y: top, w: Math.min(520, fw + pw) },
        /* a card asked for during the consultation takes the "Erkannt" column's slot (the column steps aside, see table.syncCover) */
        labs: { x: x0 + tw + gap, y: top, w: fw },
        meds: { x: x0 + tw + gap, y: top, w: Math.min(fw, 480) },
        neu: { x: x0 + tw + gap, y: top, w: Math.min(fw, 480) },
      };
    },
    B(g, hOf) {
      const k = kcols(g);
      const rpw = Math.min(520, k.cw);
      return { anchor: { x: k.a, y: g.wingTop, w: k.aw }, report: { x: centred(g, k, rpw), y: g.safeTop, w: rpw }, neu: { x: k.r, y: g.wingTop, w: k.rw }, labs: { x: k.c, y: g.safeTop, w: k.cw }, meds: { x: centred(g, k, 440), y: g.safeTop + 56, w: 440 } };
    },
    H(g, hOf) {
      const k = kcols(g);
      return { anchor2: { x: k.a, y: g.wingTop, w: k.aw } };
    },
  };
  L.F = L.C; L.T1 = L.P;
  DK.layouts = L;
  DK.kcols = kcols;
})();
