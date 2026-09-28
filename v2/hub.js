/* Docline — rationale hub (index.html). Classic script, IIFE, no modules/fetch (works from file:// and http).
   Every clinical name/value/date comes from window.DOCLINE; sources are verified public references.
   Every frame is the live prototype: shots/frame-<key>.png, listed in hub-shots.js. Scene P falls back to shots/desk-hero.webp; without a frame the hub shows a live-link placeholder. */
(function () {
  'use strict';
  const D = window.DOCLINE, UI = window.UI, ICON = window.ICON;
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = (n, s = 14) => ICON(n, { size: s });
  const reduced = () => html.classList.contains('reduce') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const OPT = isMac ? '⌥' : 'Alt';

  /* deep links: ?fresh resets the prototype's stored story, so every link lands on the scene it names */
  const href = (page, hash) => `${page}?fresh${hash ? '#' + hash : ''}`;
  function refreshLinks() { $$('[data-link]').forEach((a) => { a.href = href(a.dataset.link, a.dataset.hash); }); }

  /* ───────── facts derived from the dataset ───────── */
  const P = D.patient, A = D.consultation.actions;
  const short = (d) => String(d).slice(0, 6);                        /* '14.08.2026' → '14.08.' */
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const ferr = D.labs.analytes.find((a) => a.key === 'Ferritin'), fLast = ferr.series[ferr.series.length - 1];
  const tier3 = Object.values(A).filter((a) => a.tier === 3);
  const hd = (/Kontaktgrund (\S+)/.exec(A.leistungen.result) || [])[1] || P.problems[0].code;
  const kartei1408 = D.record[0].days.find((d) => d.id === 'd-1408');
  const F = {
    time: D.now.time,
    year: D.now.date.slice(-4),
    month: D.now.long.split(' ').pop(),
    ferritin: `${ferr.key} ${UI.num(fLast.v, ferr.dec)} ${ferr.unit}`,
    ferritinFlag: fLast.flag,
    since: short(P.lastConsultation.date),
    ibu: D.medications.find((m) => m.status === 'extern').name,
    nap: D.medications.find((m) => m.group === 'Bei Bedarf').name,
    ambig: D.consultation.ambiguity.heard,
    t3n: tier3.length,
    t3names: tier3.map((a) => a.type.split(' ·')[0]),
    waiting: D.clinicalInbox.top.length,
    befund: short(D.labs.draws[D.labs.draws.length - 1].date),
    draws: D.labs.draws.map((d) => short(d.date)).join(' / '),
    hd, codes: [hd].concat(P.problems.map((p) => p.code).filter((c) => c !== hd)),
    elga: short(P.elga.until),
    unheard: A.kartei.drafts[0].support[0].span,
    frist: D.clinicalInbox.top.find((t) => t.urgent).state,
    caveQuote: `${A.cave.evidence.who} · „${A.cave.evidence.quote}“ · ${mmss(A.cave.evidence.t)}`,
    /* wall clock, as the Akte prints it (consultation start + transcript second); tolerant of a missing line */
    befundDiscussed: (() => { const l = D.consultation.transcript.find((t) => t.befundDiscussed); if (!l) return '';
      const [h, m] = D.consultation.start.split(':').map(Number), x = h * 60 + m + Math.floor(l.t / 60);
      return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; })(),
  };
  const signLabel = `Für ${P.name} signieren · ${F.t3n} Dokumente`;
  const G = Object.fromEntries(D.clinicalInbox.groups.map((g) => [g.id, g]));

  /* ───────── principles — tags + tooltips + appendix ───────── */
  const PR = {
    P1: 'Show, don’t explain — no marketing copy in the product.',
    P2: 'Heard → Understood → Done — visible in one morphing capsule.',
    P3: 'Autonomy by consequence: Tier 1 act + undo · Tier 2 prepared draft · Tier 3 signature. Passive listening can only prepare, never act.',
    P4: 'Three layers, three fixed places: services and navigation in the top row · patient on the left · workflow on the right.',
    P5: 'Exceptions, not “OK”: neutral by default; states appear only on deviation.',
    P6: 'Received ≠ reviewed ≠ done: closing a Befund needs a person, a time and the full report.',
    P7: 'The record is a legal artefact: no delete; correct with a reason; AI text marked until released.',
    P8: 'One layer of light glass on a calm pastel field — never glass on glass; a card that lifts over another frosts. Contrast is measured at the darkest backdrop.',
    P9: 'Black at three opacities; colour = signal: blue = a person or link you can open (and the AI listening) · orange = attention · red = deadline. Primary buttons white.',
    P10: 'Keyboard-first for experts — Austrian Kartei culture runs on Kürzel.',
    P11: 'Identity at the moment of commit; patient-bound context never leaks to another patient.',
  };
  const ptags = (list) => list.map((p) => `<span class="ptag" tabindex="0" data-p="${p}">${p}</span>`).join('');

  /* ───────── sources ───────── */
  const S = {
    abridge: ['Abridge — Verify a note with Linked Evidence', 'https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence'],
    heidiTasks: ['Heidi — Heidi Tasks', 'https://support.heidihealth.com/en/articles/11519782-heidi-tasks'],
    suki: ['Suki — Ambient order staging', 'https://www.suki.ai/blog/introducing-ambient-order-staging-in-suki-assistant/'],
    tandem: ['Tandem Health — AI info', 'https://tandemhealth.ai/ai-info'],
    heidi: ['Heidi — Getting started (consent, mic activity)', 'https://support.heidihealth.com/en/articles/14648425-getting-started-with-heidi'],
    kettering: ['Kettering Health — Inside ambient listening', 'https://ketteringhealth.org/ai-improving-appointments-ambient-listening/'],
    noelia: ['Noelia — KI-gestützte Dokumentation für Ärzte in Österreich', 'https://www.noelia.at/blog/ki-dokumentation-arzt-oesterreich'],
    dragon: ['Microsoft Learn — Dragon Copilot 3.4 release notes', 'https://learn.microsoft.com/en-us/industry/healthcare/dragon-copilot/whats-new/3-4'],
    epic: ['Healthcare Dive — Epic rolls out AI charting', 'https://www.healthcaredive.com/news/epic-rolls-out-ai-charting-art-notetaking-documentation-scribe/811462/'],
    gConfirm: ['Google — Conversation design: Confirmations', 'https://developers.google.com/assistant/conversation-design/confirmations'],
    alexa: ['Amazon Alexa — Be trustworthy', 'https://developer.amazon.com/en-US/alexa/alexa-haus/design-principles/be-trustworthy'],
    gSelect: ['Google — Visual selection responses', 'https://developers.google.com/assistant/conversational/prompts-selection'],
    gErrors: ['Google — Conversation design: Errors', 'https://developers.google.com/assistant/conversation-design/errors'],
    gCommands: ['Google — Conversation design: Commands', 'https://developers.google.com/assistant/conversation-design/commands'],
    gScale: ['Google — Conversation design: Scale your design', 'https://developers.google.com/assistant/conversation-design/scale-your-design'],
    appleAI: ['Apple Newsroom — Apple Intelligence is available today', 'https://www.apple.com/newsroom/2024/10/apple-intelligence-is-available-today-on-iphone-ipad-and-mac/'],
    sukiEng: ['Suki — Engineering an invisible AI medical scribe', 'https://www.suki.ai/blog/engineering-an-invisible-and-assistive-voice-agent-for-clinicians/'],
    gmail: ['Gmail Help — Send or unsend (Undo Send)', 'https://support.google.com/mail/answer/2819488?hl=en&co=GENIE.Platform%3DDesktop'],
    hax: ['Microsoft Research — Guidelines for Human-AI Interaction', 'https://www.microsoft.com/en-us/research/blog/guidelines-for-human-ai-interaction-design/'],
    knight: ['Knight First Amendment Institute — Levels of autonomy for AI agents', 'https://knightcolumbia.org/content/levels-of-autonomy-for-ai-agents-1'],
    operator: ['OpenAI — Operator system card', 'https://openai.com/index/operator-system-card/'],
    outlook: ['Microsoft Support — Draft with Copilot in Outlook', 'https://support.microsoft.com/en-us/office/draft-an-email-message-with-copilot-in-outlook-3eb1d053-89b8-491c-8a6e-746015238d9b'],
    fhirProv: ['HL7 FHIR R4 — Provenance', 'https://hl7.org/fhir/R4/provenance.html'],
    art14: ['EU AI Act — Art. 14 Human oversight', 'https://artificialintelligenceact.eu/article/14/'],
    engadget: ['Engadget — iOS 18.3 labels Apple Intelligence summaries', 'https://www.engadget.com/mobile/smartphones/ios-183-is-here-with-clearly-labeled-apple-intelligence-notification-summaries-181935725.html'],
    pair: ['Google PAIR — Explainability + trust', 'https://pair.withgoogle.com/chapter/explainability-trust/'],

    safer: ['ONC SAFER Guide 6 — Patient identification (2024)', 'https://healthit.gov/wp-content/uploads/2025/01/Safer-Guide-6.-Patient-Identification-Final.pdf'],
    nhs: ['NHS — Common User Interface standards (historical)', 'https://standards.nhs.uk/published-standards/common-user-interface-standards'],
    ismp: ['ISMP — Safe electronic communication of medication information', 'https://www.ismp.org/system/files/resources/2019-03/Electronic-Guidelines-2019.pdf'],
    adelman: ['Adelman et al. 2019, JAMA — Concurrently open records', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6518341/'],
    bauer: ['Bauer, Guerlain, Brown 2010, JAMIA — Graphical lab display', 'https://academic.oup.com/jamia/article/17/4/416/866711'],
    hl7interp: ['HL7 FHIR R4 — ObservationInterpretation', 'https://hl7.org/fhir/R4/v3/ObservationInterpretation/cs.html'],
    tjc: ['The Joint Commission — National Patient Safety Goals 2026 (Lab)', 'https://digitalassets.jointcommission.org/api/public/content/3c7a110c215943bc80d9ce87e9d9ee9d?v=aef80e14'],
    paterno: ['Paterno et al. 2009, JAMIA — Tiered interaction alerts', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2605599/'],
    ancker: ['Ancker et al. 2017 — Repeated alerts and alert fatigue', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5387195/'],
    goddard: ['Goddard, Roudsari, Wyatt 2012, JAMIA — Automation bias', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/'],
    art50: ['EU AI Act — Art. 50 Transparency obligations', 'https://artificialintelligenceact.eu/article/50/'],
    mdcg: ['MDCG 2025-6 / AIB 2025-1 — MDR × AI Act FAQ', 'https://health.ec.europa.eu/document/download/b78a17d7-e3cd-4943-851d-e02a2f22bbb4_en?filename=mdcg_2025-6_en.pdf'],
    mhra: ['MHRA — Ambient voice technology products (UK, 2026)', 'https://www.gov.uk/government/publications/ambient-voice-technology-enabled-products/ambient-voice-technology-enabled-products'],
    anderson: ['Anderson et al. 2025 — Quality and safety of AI scribe notes', 'https://doi.org/10.1016/j.mcpdig.2025.100292'],
    ris51: ['RIS — § 51 Ärztegesetz 1998', 'https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10011138&Paragraf=51'],
    risAeg: ['RIS — Ärztegesetz 1998 (§§ 49, 55)', 'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10011138'],
    bgb: ['§ 630f BGB — DACH benchmark', 'https://www.gesetze-im-internet.de/bgb/__630f.html'],
    iso: ['ISO 27789:2021 — EHR audit trails', 'https://www.iso.org/standard/75313.html'],
    gtelg: ['JUSLINE — § 22 GTelG 2012', 'https://www.jusline.at/gesetz/gtelg_2012/paragraf/22'],
    gdpr: ['GDPR Art. 16 — Right to rectification', 'https://gdpr-info.eu/art-16-gdpr/'],
    semanik: ['Semanik et al. 2021, JAMIA — Problem-oriented view', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8068438/'],
    koopman: ['Koopman et al. 2011, Ann Fam Med — Summary dashboard', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3185474/'],
    rule: ['Rule et al. 2021, JAMA Netw Open — Note length and redundancy', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8290305/'],
    arndt: ['Arndt et al. 2017, Ann Fam Med — Tethered to the EHR', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5593724/'],
    taiseale: ['Tai-Seale et al. 2019, Health Affairs — In-basket burden', 'https://doi.org/10.1377/hlthaff.2018.05509'],
    ama: ['AMA STEPS Forward — Taming the EHR', 'https://www.ama-assn.org/practice-management/ama-steps-forward-program/taming-ehr-playbook'],
    wwdc356: ['Apple WWDC25 — Get to know the new design system', 'https://developer.apple.com/videos/play/wwdc2025/356/'],

    hig: ['Apple HIG — Materials', 'https://developer.apple.com/design/human-interface-guidelines/materials'],
    wwdc219: ['Apple WWDC25 — Meet Liquid Glass', 'https://developer.apple.com/videos/play/wwdc2025/219/'],
    mdn: ['MDN — prefers-reduced-transparency', 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency'],
    f83: ['W3C — WCAG 2.2 Failure F83', 'https://www.w3.org/WAI/WCAG22/Techniques/failures/F83'],
    apca: ['APCA in a Nutshell', 'https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html'],
    ron: ['RonDesignLab — Veri Health App (Behance)', 'https://www.behance.net/gallery/244192609/Veri-Health-App-SaaS-UX-UI-Design'],
    fsd: ['Not a Tesla App — FSD visualizations explained', 'https://www.notateslaapp.com/tesla-reference/636/all-tesla-fsd-visualizations-and-what-they-mean'],
    cybercab: ['Not a Tesla App — Cybercab consumer UI', 'https://www.notateslaapp.com/news/4736/what-the-cybercabs-consumer-facing-ui-looks-like'],
    live: ['Apple HIG — Live Activities', 'https://developer.apple.com/design/human-interface-guidelines/live-activities'],
    micInd: ['Apple Support — Orange and green indicators', 'https://support.apple.com/en-us/108331'],
    ornaments: ['Apple HIG — Ornaments', 'https://developer.apple.com/design/human-interface-guidelines/ornaments'],
    windows: ['Apple HIG — Windows', 'https://developer.apple.com/design/human-interface-guidelines/windows'],
    freeform: ['Apple Support — Align items in Freeform', 'https://support.apple.com/guide/freeform/align-items-frfma75f5f63/mac'],
    tldraw: ['tldraw — Shape transforms (pack)', 'https://tldraw.dev/sdk-features/shape-transforms'],
    muse: ['Ink & Switch — Muse', 'https://www.inkandswitch.com/muse/'],
    springs: ['Apple WWDC23 — Animate with springs', 'https://developer.apple.com/videos/play/wwdc2023/10158/'],
    emil: ['Emil Kowalski — 7 practical animation tips', 'https://emilkowal.ski/ui/7-practical-animation-tips'],
    sonner: ['Emil Kowalski — Sonner source', 'https://github.com/emilkowalski/sonner/blob/main/src/index.tsx'],
    higA11y: ['Apple HIG — Accessibility', 'https://developer.apple.com/design/human-interface-guidelines/accessibility'],
    comeau: ['Josh W. Comeau — Frosted glass with backdrop-filter', 'https://www.joshwcomeau.com/css/backdrop-filter/'],
    wcagFocus: ['W3C — Understanding WCAG 2.2: Focus not obscured', 'https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html'],

    cgm: ['CGM — “CGM in Österreich”, eHealth Professional Day 2025', 'https://ehealth-graz.at/wp-content/uploads/wpforo/default_attachments/1739194935-CGM-eHealth-Professional-Day-CGM.pdf'],
    dvsv: ['Dachverband — Liste geprüfter VP-Softwarehersteller', 'https://www.sozialversicherung.at/cdscontent/load?contentid=10008.791943&version=1732704981'],
    innomed: ['CGM INNOMED — Syntaxkartei', 'https://update.compugroup.at/webhelp/innomed/1518945477.html'],
    latidoKartei: ['LATIDO — Integrierte Patientenkartei', 'https://www.latido.at/funktionen/patientenkartei/'],
    bmasgpk: ['BMASGPK — FAQ Diagnosen- und Leistungscodierung (2025)', 'https://www.aekktn.at/documents/69020063-d739-11f0-a98a-bc2411ec0614/Fragen+und+Antworten+Diagnosen-+und+Leistungscodierung+extramural+ambulant+20251125.pdf'],
    innomedIcd: ['CGM INNOMED — Automatisierte Diagnoseerfassung', 'https://update.compugroup.at/webhelp/innomed/2347304190.html'],
    innomedKons: ['CGM INNOMED — Konsultationen durchführen', 'https://update.compugroup.at/webhelp/innomed/1819198971.html'],
    ecardV: ['Ärztekammer Vorarlberg — e-card (Praxisgründung Kap. 41)', 'https://www.arztinvorarlberg.at/files/Files/AB/Praxisgruendung/41_e-card.pdf'],
    ecardDig: ['Ärztekammer NÖ — Digitale e-card ab 8. April 2026', 'https://www.arztnoe.at/fuer-aerzte/news-details/die-digitale-e-card-ist-ab-8-april-2026-verfuegbar'],
    elgaNoe: ['Ärztekammer NÖ — ELGA', 'https://www.arztnoe.at/elga'],
    chipkarte: ['chipkarte.at — FAQ e-Medikation', 'https://www.chipkarte.at/cdscontent/?contentid=10007.897623&portal=ecardportal'],
    elgaEval: ['ELGA GmbH / GÖG — Evaluierung ELGA-e-Befund (2019)', 'https://www.elga.gv.at/fileadmin/user_upload/Dokumente_PDF_MP4/Evaluierung/Bericht_ELGA_e-Befund_Evaluierung.pdf'],
    latidoElga: ['LATIDO — ELGA in der Kartei nutzen', 'https://help.latido.at/knowledge-base/elga-in-der-kartei-nutzen-so-funktionierts/'],
    aekooe: ['Ärztekammer OÖ — Datenaustausch als Faxersatz', 'https://aekooe.at/index.php?eID=dumpFile&f=16587&t=f&token=e3f2deaea6b170e885b2f427b41ae174910228b8'],
    oegkHon: ['ÖGK — Honorare von Ärzten mit Kassenvertrag', 'https://www.oegk.at/cdscontent/?contentid=10007.880092'],
    orf: ['ORF — BVAEB erhöht Behandlungsbeitrag auf 20 Prozent', 'https://orf.at/stories/3431882/'],
    svnr: ['Sozialversicherung — Versicherungsnummer', 'https://www.sozialversicherung.gv.at/cdscontent/?contentid=10007.870557'],
    abs: ['Ärztekammer Wien — ABS Bewilligungsdauer', 'https://www.aekwien.at/rundschreiben-kurie-niedergelassene-aerzte/-/asset_publisher/Rl96H99y0Mr4/content/arzneimittel-bewilligungs-service-abs-bewilligungsdauer'],
    oegkAu: ['ÖGK — Krankmeldung: Arbeitsunfähigkeitsmeldung', 'https://www.oegk.at/cdscontent/?contentid=10007.881064'],
    latidoScribe: ['LATIDO — AI Scribe', 'https://help.latido.at/knowledge-base/ai-scribe/'],
    medmedia: ['medmedia DigitalDoctor — Arztsoftware: viele Anbieter, viel Kopfweh', 'https://www.medmedia.at/digitaldoctor/arztsoftware-viele-anbieter-viele-features-viel-kopfweh/'],
  };
  const SRC_GROUPS = [
    ['Voice & agentic AI', ['abridge', 'heidiTasks', 'suki', 'tandem', 'heidi', 'kettering', 'noelia', 'dragon', 'epic', 'gConfirm', 'alexa', 'gSelect', 'gErrors', 'gCommands', 'gScale', 'appleAI', 'sukiEng', 'gmail', 'hax', 'knight', 'operator', 'outlook', 'fhirProv', 'art14', 'engadget', 'pair']],
    ['Clinical safety, evidence & law', ['safer', 'nhs', 'ismp', 'adelman', 'bauer', 'hl7interp', 'tjc', 'paterno', 'ancker', 'goddard', 'art50', 'mdcg', 'mhra', 'anderson', 'ris51', 'risAeg', 'bgb', 'iso', 'gtelg', 'gdpr', 'semanik', 'koopman', 'rule', 'arndt', 'taiseale', 'ama']],
    ['Visual, material & motion', ['hig', 'wwdc219', 'wwdc356', 'mdn', 'f83', 'apca', 'ron', 'fsd', 'cybercab', 'live', 'micInd', 'ornaments', 'windows', 'freeform', 'tldraw', 'muse', 'springs', 'emil', 'sonner', 'higA11y', 'comeau', 'wcagFocus']],
    ['Austria', ['cgm', 'dvsv', 'innomed', 'latidoKartei', 'bmasgpk', 'innomedIcd', 'innomedKons', 'ecardV', 'ecardDig', 'elgaNoe', 'chipkarte', 'elgaEval', 'latidoElga', 'aekooe', 'oegkHon', 'orf', 'svnr', 'abs', 'oegkAu', 'latidoScribe', 'medmedia']],
  ];
  /* the ↗ never wraps alone: it is glued to the last word */
  const src = (k, label) => { const s = S[k], t = tidy(label || s[0]), i = t.lastIndexOf(' ');
    return `<a class="src" href="${esc(s[1])}" target="_blank" rel="noopener">${esc(t.slice(0, i + 1))}<span class="nw">${esc(t.slice(i + 1))}${I('arrow-up-right', 11)}</span></a>`; };
  const srcs = (keys) => `<div class="srcs">${keys.map((k) => (Array.isArray(k) ? src(k[0], k[1]) : src(k))).join('')}</div>`;

  /* ───────── frames ───────── */
  const HERO = 'shots/desk-hero.webp';                               /* scene P, 2000 × 1125 render of the 1600 × 900 frame — fallback */
  const MAN = Array.isArray(window.DOCLINE_SHOTS) ? new Set(window.DOCLINE_SHOTS) : null;
  const probeCache = {};
  const probe = (url) => probeCache[url] || (probeCache[url] = new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = url; }));
  const has = (v) => (MAN ? Promise.resolve(MAN.has(v.replace(/^shots\//, ''))) : probe(v));
  async function shot(keys) {
    for (const k of keys) { const v = `shots/frame-${k}.png`; if (await has(v)) return v; if (k === 'desk-P') return HERO; }
    return null;
  }

  /* ───────── 00 · cover ───────── */
  function renderCover() {
    $('[data-when]').textContent = `${F.month} ${F.year}`;
    $('[data-how]').innerHTML = [
      `<li><span class="gl">${I('message', 13)}Chip</span> or hold <span class="gl k">${OPT}</span> and speak</li>`,
      `<li><span class="gl">${I('help', 13)}Warum?</span> shows the reasoning</li>`,
      `<li><span class="gl">${I('layout', 13)}Szenen</span> jumps to a moment</li>`,
      `<li><span class="gl">${I('play', 13)}Film</span> plays the story</li>`,
    ].join('');
    $('[data-fine]').textContent = `Design & working prototype for Docline · ${F.month} ${F.year} · ${D.practice.name}, ${D.practice.doctor.name} and ${P.name} are fictional, as is every value shown.`;
  }
  function renderHero() {
    const alt = 'Desk, scene P at 09:45 — the time in the centre, the next patient on the left, Wartet auf Sie and the Wartezimmer on the right, the black capsule with three suggestions at the bottom';
    return shot(['desk-P']).then((u) => {
      const plate = $('[data-hero] .plate');
      plate.innerHTML = `<img src="${u || HERO}" alt="${alt}" decoding="async" fetchpriority="high">`;
      /* the tray takes the frame's own proportions — nothing of the screen is cropped away */
      const im = plate.querySelector('img'), fit = () => { if (im.naturalWidth) plate.style.aspectRatio = `${im.naturalWidth} / ${im.naturalHeight}`; };
      if (im.complete) fit(); else im.addEventListener('load', fit, { once: true });
    });
  }
  function heroTilt() {
    const fr = $('[data-hero]'); if (!fr) return;
    let raf = 0;
    const upd = () => { raf = 0; if (reduced()) { fr.style.setProperty('--tilt', '0deg'); fr.style.setProperty('--sc', '1'); return; }
      const p = Math.max(0, Math.min(1, scrollY / (innerHeight * 0.62))); const e = 1 - Math.pow(1 - p, 3);
      fr.style.setProperty('--tilt', (14 * (1 - e)).toFixed(2) + 'deg'); fr.style.setProperty('--sc', (0.95 + 0.05 * e).toFixed(4)); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true }); upd();
  }

  /* ───────── 01 · thesis ───────── */
  const tier = (n, label) => `<span class="ui-tier t${n}">${I(['', 'undo', 'sparkles', 'signature'][n], 12)}${esc(label)}</span>`;
  function renderThesis() {
    const t1 = D.tier1;
    $('[data-verbs]').innerHTML = [
      { n: 1, c: 'var(--accent)', label: 'Tier 1 · act + undo', h: 'It acts on<br>what you say.', p: 'An explicit command for something internal and reversible is simply done — with a receipt and an undo window.',
        ex: `<div class="rcpt t1">${I('check', 15)}<span class="tx">${t1.receipt.split(' · ').map((x, i) => `<span class="${i ? 'l2' : 'l1'}">${esc(x)}</span>`).join('')}</span><span class="act">Rückgängig <span class="mut">&nbsp;${t1.undoSec}&nbsp;s</span></span></div>` },
      { n: 2, c: 'var(--ai)', label: 'Tier 2 · prepared', h: 'It prepares<br>what it hears.', p: 'What comes up in conversation becomes a prepared draft — pre-accepted, removable, never executed on its own.',
        ex: `<div class="rcpt t2">${I('calendar', 15)}<span class="tx">${esc(A.termin.title)}</span>${UI.state('held')}</div>` },
      { n: 3, c: '#000', label: 'Tier 3 · signature', h: 'You sign what the<br>law makes yours.', p: `${F.t3names.join(', ').replace(/, ([^,]*)$/, ' and $1')} need the doctor’s signature — one hold, and they never appear in the assistant’s view.`,
        ex: `<button class="hold" type="button" data-hold>${I('signature', 16)}${esc(signLabel)}</button><span class="hint">Press and hold.<br>In production: Touch&nbsp;ID, Windows&nbsp;Hello or <span class="nowrap">o-card-PIN</span>.</span>` },
    ].map((v, i) => `<div class="verb rv" style="--c:${v.c};--i:${i + 2}">${tier(v.n, v.label)}<h3>${v.h}</h3><p>${esc(v.p)}</p><div class="ex">${v.ex}</div></div>`).join('');
    const hb = $('[data-hold]');
    if (hb && UI.hold) {
      const h = UI.hold(hb, { ms: 900, onDone: () => {
        const base = hb.querySelector('.hold-base'), fill = hb.querySelector('.hold-fill > span');
        const done = `${I('check', 16)}Signiert · ${esc(D.consultation.end)}`; const prev = base.innerHTML;
        hb.style.minWidth = hb.offsetWidth + 'px';                     /* the shorter receipt must not make the layout jump */
        base.innerHTML = done; fill.innerHTML = done;
        setTimeout(() => { base.innerHTML = prev; fill.innerHTML = prev; hb.style.minWidth = ''; h.reset(); }, 2400);
      } });
    }
  }

  /* ───────── 02 · before → after ───────── */
  /* r   = highlighted region on the old screenshot (% of the image)
     ra  = the answer on the after frame (% of the 1600 × 900 frame) — the after-view pushes in on it like a camera; no ra = whole frame
     z   = fixed zoom (1 = whole frame + spotlight) · cam = explicit camera window [x, y, w] in % of the frame, chosen so every window
           edge falls in empty field or card padding — never through a line of text
     el  = the element's name in the UI (German, as the doctor sees it) · hash = deep link · lbl = what we print
     before / ev / src = the audit problem it answers and the evidence behind it
     then = the one step left once the link has opened */
  const pill = (t) => `<span class="st">${esc(t)}</span>`, arr = '<span class="ar" aria-hidden="true">›</span>';
  /* scene P, 1600 × 900: patient card x 1.25–26.9 % · centre column 26.9–73.1 % · right cards from 73.1 %; time line ends at x 62.8 %,
     chips x 29.3–70.9 % from y 83.7 %, capsule 89.7–95.6 %. The fallback is 2000 px wide, so windows stay ≥ 36 % wide (zoom ≤ 2.8). */
  const CAM = { time: [27.2, 0.8, 45.6], cardTop: [0, 14, 36.5], cardBottom: [0, 42.8, 41.6], inbox: [63.1, 22.0, 36.9], waiting: [58.4, 43.2, 41.6], capsule: [29, 59.2, 42] };
  const BA = {
    desk: {
      scr: 'Screen 1', from: 'Sprachstart', to: 'Desk', page: 'desk.html', img: 'before/sprachstart.webp', date: '06.09.2026',
      note: 'Scene P — 09:45, before the next patient walks in, argued element by element',
      items: [
        { el: 'Uhrzeit', h: 'The time, not a slogan.', tags: ['P1', 'P4'], hash: 'P', r: [30.6, 19.4, 38.8, 14.6], ra: [36.8, 21.6, 26.4, 19.4], cam: CAM.time, shots: ['desk-P'],
          p: `The largest object on the Desk is ${F.time} — 89 px, extralight — with the date in grey above it and one line below that says what matters now: Herr ${P.lastName} (blue: a person you can open) ist da · ${F.waiting} Entscheidungen warten auf Sie. No headline, no greeting.`,
          before: 'The biggest type on Sprachstart was a pitch line about the product (“Voice führt direkt in echte Arbeitsflächen”) — inside the very dashboard it said it was not.',
          ev: 'One persistent live object, everything else summoned — the pattern of Tesla’s Cybercab UI, taken as a direction, not a spec.', src: ['cybercab'] },
        { el: 'Als Nächstes', h: 'The next patient, recognisable at a glance.', tags: ['P11', 'P5'], hash: 'P', r: [2.1, 62.4, 21.3, 18.2], ra: [1.25, 14.78, 25.69, 34.6], cam: CAM.cardTop, shots: ['desk-P'],
          p: `Als Nächstes · Termin ${P.appointment.time} is the largest card: photo, name at 25 px, age / birth date / carrier, e-card and ELGA as plain ticks. The reason for the visit is two short lines with a coloured bar each — blue for the routine Kontrolle Reflux, orange for the Laborbesprechung that the unreviewed ${ferr.key} makes urgent. States are outlined pills, neutral unless they need attention: Wartezimmer seit ${P.appointment.arrived}, CAVE nicht erhoben.`,
          before: 'The most operational card sat small at the bottom left and read “Keine Termine für heute” — no photo, and no allergy state anywhere on the entry screen.',
          ev: 'SAFER Guide 6 (2024) gave photos the slot the old one-record rule used to hold: photos lowered wrong-patient errors (adjusted OR 0.57). ISMP wants allergy status in one fixed, visible place — so „nicht erhoben“ is a state, never a blank.', src: ['safer', 'ismp'] },
        { el: `Neu seit ${F.since.replace(/\.$/, '')}`, h: 'A pre-brief instead of a chart to read.', tags: ['P5', 'P6'], hash: 'P', r: [3.5, 40.9, 18.4, 8], ra: [1.25, 51, 25.69, 34.33], cam: CAM.cardBottom, shots: ['desk-P'],
          p: `Below a hairline, Neu seit ${F.since.replace(/\.$/, '')} lists only what changed since the last visit, each behind a small grey icon well: Labor ${F.befund.replace(/\.$/, '')} · ${F.ferritin} · ungeprüft, ${F.ibu} from e-Medikation → 2 NSAR, a referral with kein Rückbefund. Then the last visit in one grey sentence — and two actions: the white Konsultation starten ↵ and an outlined Akte.`,
          before: 'Three launchers — Praxislage prüfen, Befunde prüfen, Praxiszahlen — each led somewhere else to go and read.',
          ev: 'A purpose-built summary cut the time to find 10 data elements from 5.5 to 1.3 min and clicks from 60 to 3; chart review is a third of EHR time. Deltas instead of boilerplate keep the record short.', src: [['koopman', 'Koopman 2011'], ['arndt', 'Arndt 2017'], ['rule', 'Rule 2021']] },
        { el: 'Wartet auf Sie', h: 'Two inboxes, one truth.', tags: ['P5', 'P9'], hash: 'P', r: [76.6, 13.3, 21.4, 39.3], ra: [73.06, 14.78, 25.69, 45.3], cam: CAM.inbox, shots: ['desk-P'],
          p: `Wartet auf Sie counts only what needs the doctor’s clinical judgement: ${G.befunde.count} Befunde, ${G.rezepte.count} Rezeptanfragen, ${G.abs.count} ABS-Rückfrage. The numbers stay black and light; urgency sits in the line beneath, in words and colour — ${G.befunde.flagged} auffällig in orange, Frist 01.10 in red with ⚠. The three most pressing items follow, then a grey footer: Assistenz · ${D.assistantQueue.count} organisatorische Aufgaben — the second inbox, one line, never mixed in.`,
          before: 'Sprachstart said “Keine offenen Bestätigungen” while other screens listed open items — the audit’s only severity-4 finding on Screen 1. Its Inbox held messages, not reports awaiting review.',
          ev: 'Almost half of all inbox messages are system-generated, and receiving more than average goes with a 40 % higher probability of burnout. Keep non-clinical items upstream of the doctor; every extra reminder lowers acceptance.', src: [['taiseale', 'Tai-Seale 2019'], ['ama', 'AMA STEPS Forward'], ['ancker', 'Ancker 2017']] },
        { el: 'Wartezimmer', h: 'Who is waiting — and for how long.', tags: ['P5', 'P9'], hash: 'P', r: [3.5, 30, 18.4, 9.9], ra: [73.06, 62.89, 25.69, 22.44], cam: CAM.waiting, shots: ['desk-P'],
          p: `Wartezimmer · ${D.waiting.length}, the longest wait in orange. Each person is an initial circle: a solid outline has a Termin, a dashed one came without (${D.waiting.filter((w) => !w.termin).length} ohne Termin), the white one is next, an orange dot marks new activity. Shape, not colour, carries the difference. The footer closes the day: ${D.dayStats.termine} Termine · ${D.dayStats.erledigt} erledigt · 12:30 Visite — in blue, because it opens.`,
          before: '“Praxislage prüfen — Tagesliste, Wartezimmer und Posteingang sichten” was a launcher, pre-highlighted in blue for no stated reason; the waiting room itself was a click away.',
          ev: 'Colour-only state codes break WCAG 1.4.1 and blur the HL7 line between a flag and a status: shape or text has to carry the meaning too. A Kassenpraxis runs on walk-ins, so Termin vs. ohne Termin is the first fact at the front desk.', src: ['hl7interp'] },
        { el: 'Navigation', h: 'Navigation steps back into one pill.', tags: ['P4', 'P10'], hash: 'P', r: [77.6, 54.1, 20.4, 34.8], ra: [1.4, 1.7, 97.4, 6.6], z: 1, shots: ['desk-P'],
          p: 'One glass pill at the top — Desk · Heute · Patienten | Termine | Abrechnung, the current place in white. The same pill sits on every screen; in the Akte it says Patienten. To its right, round controls: four service dots (a dot turns orange when a service needs attention), the microphone, the inbox with its count and the signed-in doctor. Everything below is content.',
          before: 'The way out was a small all-caps “← MODULE” pill; this was the only screen without a sidebar, about a dozen entry points competed, and neither the signed-in role nor the external services were shown.',
          ev: 'Glass belongs to the control and navigation layer that floats above content — Apple’s own rule since Liquid Glass.', src: ['hig'] },
        { el: 'Kapsel', h: 'One voice object, three live suggestions.', tags: ['P2', 'P10'], hash: 'P', r: [26.4, 63.2, 47.8, 21.9], ra: [29.2, 83.4, 41.6, 12.5], cam: CAM.capsule, shots: ['desk-P'],
          p: `One opaque black capsule, 548 × 53, holds voice and text: Fragen oder anweisen …, hold ${OPT} to speak, ⌘K to type. Above it, three chips generated from the moment — Öffne Herrn ${P.lastName}, Was ist neu bei Herrn ${P.lastName}?, Aufgabe an Frau ${D.practice.assistant.name.split(' ').pop()} … — grey wells at 14 px, so they read as examples, not as actions already taken.`,
          before: 'The orb had no states, two voice triggers competed with a black send button, the examples were static quotes, and Space as push-to-talk clashed with typing.',
          ev: 'Live status belongs on an opaque black surface, not on glass. Offered phrases should read as examples, never as a list to learn.', src: ['live', 'gCommands'] },
        { el: 'Material', h: 'Glass cards on a pastel field.', tags: ['P8', 'P9'], hash: 'P', r: [2.1, 13.4, 21.3, 47], shots: ['desk-P'],
          p: 'Every card is one layer of white glass at 40 %, radius 28, lit by four inset hairlines — light on top and left, shade at bottom and right — over a soft pastel field. No frames, no nested boxes. Two cards carry a quiet tint: warm on the patient, mint on the waiting room. Type does the hierarchy: black at 100 % for what you act on, 60 and 40 % for context, 20 and 15 % for separators — Poppins from extralight to medium.',
          before: 'Cards nested three deep — card, sub-card, dashed box — in flat white on grey: the generic SaaS dashboard the client did not want.',
          ev: 'Remove extra backgrounds and borders; let layout and grouping carry the hierarchy. How legible the palette is on its glass is measured in section 04.', src: ['wwdc356'] },
      ],
    },
    akte: {
      scr: 'Screen 2', from: 'Karteikarte', to: 'Akte', page: 'akte.html', img: 'before/karteikarte.webp', date: '06.09.2026',
      note: 'The same design language, applied to the patient record',
      items: [
        { el: 'Banner', h: 'Identity and CAVE never scroll away.', tags: ['P11', 'P5'], hash: 'pre', r: [15.2, 5.4, 83.8, 7.8], ra: [1.25, 14.78, 97.5, 10.2], z: 1, shots: ['akte-pre'],
          p: `A glass banner that stays put: photo, name, SV ${P.svnr}, then e-card, Anspruch and ELGA as three separate ticks — and CAVE in three explicit states, here the orange „nicht erhoben“ with Keine bekannt one click away.`,
          before: 'The banner had no allergy slot, and its SV number could not match the birth date.' },
        { el: 'Kartei', h: 'Exceptions, not “OK”.', tags: ['P5', 'P9'], hash: 'post', r: [88.6, 39.2, 5.4, 55.2], ra: [1.25, 42.2, 72.7, 43.9], z: 1, shots: ['akte-post'],
          p: `Rows stay neutral; the flag sits at the value (an orange ${F.ferritinFlag} at ${ferr.key}), and a state appears only when something deviates. A black ✓ übermittelt appears only when something has actually left the practice.`,
          before: 'Every row carried a green OK — even an appointment still weeks away.' },
        { el: 'Befund', h: 'Received ≠ reviewed ≠ done.', tags: ['P6'], hash: 'post', r: [15.9, 44.3, 83.2, 23.1], ra: [1.25, 30.6, 72.7, 43.8], z: 1, shots: ['akte-post-befund'], then: `${pill(`Befund ${F.befund}`)}${arr}${pill('Vidieren')}`,
          p: `The ${F.befund} report is one card with flags and sparklines, and an orange „Vidierung offen“ pill until a named doctor closes it — prefilled from the consultation, closed with name and time.`,
          before: 'One blood draw appeared as three unrelated rows — filed next to body weight, none with a reference range.' },
        { el: 'Korrektur', h: 'Who, when, how — and never delete.', tags: ['P7'], hash: 'post', r: [15.9, 38.6, 14.6, 56.4], ra: [1.25, 30.8, 72.7, 28.8], z: 1, shots: ['akte-post-korr'], then: `${pill(kartei1408.date.slice(0, 9))}${arr}${pill('korrigiert')}`,
          p: 'Each row shows time, author and provenance — and nothing is ever deleted: a correction keeps the original visible, the changed word struck through, with reason, person and time. KI drafts stay in violet ink until released.',
          before: 'Entries showed only a date and a type — no time, no author, no draft or signed state, no origin.' },
        { el: 'Kürzel', h: 'A command line that acts.', tags: ['P10', 'P7'], hash: 'pre', r: [15.9, 27.4, 83.3, 8.6], ra: [1.25, 32.5, 72.7, 50.3], z: 1, shots: ['akte-pre-rez'], then: `<span class="w">type</span><code class="st">rez panto</code>`,
          p: `Type “rez panto” and a signable e-Rezept stages under the line, with ${P.name}’s photo and CAVE state in the signing panel. Only what is still open is orange — here the Packung and the unrecorded CAVE — and the signature unlocks once both are set. Changing the date turns an entry into an explicit Nachtrag with a reason — no silent backdating.` },
      ],
    },
  };
  const SLOT = 6400, BEFORE_MS = 2400;
  const FRAME_A = 2000 / 1092, SHOT_A = 1600 / 900, ZMAX = 1.8;   /* frame aspect (old screenshots) · after-frame aspect (16 : 9) */
  const blocks = {};
  const lbl = (it) => it.lbl || it.hash;

  function renderBA(key) {
    const b = BA[key], host = $(`[data-ba="${key}"]`);
    host.className = 'ba';
    host.innerHTML = `
      <div class="ba-head rv">
        <div><div class="scr">${esc(b.scr)}</div><h3>${esc(b.from)}<span class="arrow">→</span>${esc(b.to)}</h3><p class="ba-note">${esc(b.note)}</p></div>
        <div class="ba-ctl">
          <button class="icon-btn ba-play" type="button" data-play aria-label="Play the walkthrough">${I('play', 15)}</button>
          <div class="seg lg" role="group" aria-label="Before or after"><button type="button" data-mode="before" aria-pressed="true">Before</button><button type="button" data-mode="after" aria-pressed="false">After</button></div>
          <a class="lnk" data-link="${b.page}" data-hash="${key === 'akte' ? 'post' : ''}">Open ${esc(b.to)} ${I('arrow-up-right', 14)}</a>
        </div>
      </div>
      <div class="ba-grid">
        <div class="ba-frame rv" style="--i:1" data-mode="before" id="ba-${key}-frame" role="tabpanel" aria-labelledby="ba-${key}-t0">
          <div class="plate">
            <img class="ba-img before" src="${b.img}" alt="${esc(b.from)} — the current screen (${b.date})" decoding="async">
            <img class="ba-img after" alt="" decoding="async">
            <div class="ba-ph"><div class="sil-note">${I('desk', 20)}<b>Live prototype scene</b><span>This moment is best seen live — the scene is one click away.</span><a class="lnk" data-link="${b.page}" data-hash="" data-ph>Open scene ${I('arrow-up-right', 14)}</a></div></div>
            <div class="ba-spot"></div>
            <div class="ba-aspot"></div>
            <button class="ba-zoom" type="button" data-zoom>${I('maximize', 13)}<span>Whole screen</span></button>
          </div>
          <div class="ba-cap"><span class="ba-tag" data-tag><i></i>Before · ${esc(b.from)} · ${b.date}</span></div>
        </div>
        <ol class="dl rv" style="--i:2" role="tablist" aria-orientation="vertical" aria-label="${esc(b.from)} to ${esc(b.to)}: ${b.items.length} decisions">
          ${b.items.map((it, i) => `
            <li class="dc" data-i="${i}" role="presentation">
              <span class="dc-bar" aria-hidden="true"></span>
              <div class="dc-row" role="tab" id="ba-${key}-t${i}" aria-controls="ba-${key}-frame" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="dc-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h4>${esc(it.h)}</h4><span class="dc-el" aria-hidden="true">${esc(it.el || '#' + lbl(it))}</span></div>
              <div class="dc-body"><div>
                <p>${esc(it.p)}</p>
                ${it.before ? `<p class="dc-why"><span class="k">Before</span>${esc(it.before)}</p>` : ''}
                ${it.ev ? `<p class="dc-why"><span class="k">Evidence</span>${esc(it.ev)}</p>${srcs(it.src || [])}` : ''}
                <div class="dc-foot">${ptags(it.tags)}<a class="lnk" data-link="${b.page}" data-hash="${it.hash}">Open <code>${b.page}#${esc(lbl(it))}</code>${I('arrow-up-right', 14)}</a>${it.then ? `<span class="dc-then"><span class="w">then</span>${it.then}</span>` : ''}</div>
              </div></div>
            </li>`).join('')}
        </ol>
      </div>`;
    const st = blocks[key] = { key, b, host, idx: 0, mode: 'before', shown: 'before', whole: false, playing: false, userPaused: false, hoverPaused: false, done: false, visible: false, timers: [], anim: null, afters: [], aspects: [], swapT: 0,
      frame: host.querySelector('.ba-frame'), grid: host.querySelector('.ba-grid') };
    /* the camera windows and spotlights are drawn for 16 : 9 frames (1600 × 900): each frame's real aspect is read, and a frame of
       another shape is shown whole, without a spotlight — never with a highlight in the wrong place */
    b.items.forEach((it, i) => shot(it.shots).then((u) => {
      st.afters[i] = u; if (st.idx === i) paintBA(st, { instant: true });
      if (u) { const im = new Image(); im.onload = () => { st.aspects[i] = im.naturalWidth / im.naturalHeight; if (st.idx === i && st.mode === 'after') applyCam(st, { instant: true }); }; im.src = u; }
    }));
    const nItems = b.items.length;
    host.querySelectorAll('.dc').forEach((li) => {
      const i = +li.dataset.i, tab = li.querySelector('[role="tab"]');
      li.addEventListener('click', (e) => { if (e.target.closest('a')) return; stopBA(st, true); select(st, i); });
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stopBA(st, true); select(st, i); return; }
        const k = e.key, n = k === 'ArrowDown' || k === 'ArrowRight' ? (i + 1) % nItems : k === 'ArrowUp' || k === 'ArrowLeft' ? (i - 1 + nItems) % nItems : k === 'Home' ? 0 : k === 'End' ? nItems - 1 : -1;
        if (n < 0) return; e.preventDefault(); stopBA(st, true); select(st, n); host.querySelector(`#ba-${key}-t${n}`).focus();
      });
    });
    /* a pointer resting on (or focus inside) the walkthrough holds it; it resumes on leave unless paused by hand */
    const holdBA = () => { if (st.playing) { stopBA(st, false); st.hoverPaused = true; } };
    const leaveBA = () => setTimeout(() => {
      if (st.grid.matches(':hover') || st.grid.contains(document.activeElement) || !st.hoverPaused) return;
      st.hoverPaused = false; if (activeBA === st && st.visible && !st.playing && canAuto(st)) playBA(st, st.idx);
    }, 0);
    st.grid.addEventListener('pointerenter', holdBA); st.grid.addEventListener('focusin', holdBA);
    st.grid.addEventListener('pointerleave', leaveBA); st.grid.addEventListener('focusout', leaveBA);
    host.querySelectorAll('button[data-mode]').forEach((btn) => btn.addEventListener('click', () => { stopBA(st, true); st.mode = btn.dataset.mode; st.whole = false; paintBA(st); }));
    host.querySelector('[data-zoom]').addEventListener('click', (e) => { e.stopPropagation(); stopBA(st, true); st.whole = !st.whole; paintBA(st); });
    host.querySelector('.ba-frame > .plate').addEventListener('click', (e) => { if (st.mode !== 'after' || !st.afters[st.idx] || st.frame.classList.contains('no-zoom') || e.target.closest('a, button')) return; stopBA(st, true); st.whole = !st.whole; paintBA(st); });
    host.querySelector('[data-play]').addEventListener('click', () => {
      if (st.playing) { stopBA(st, true); return; }
      Object.values(blocks).forEach((o) => { if (o !== st && o.playing) stopBA(o, false); });   /* one walkthrough at a time */
      activeBA = st; st.userPaused = false; st.hoverPaused = false; st.done = false; playBA(st, st.idx);
    });
    select(st, 0);
  }
  function select(st, i) { st.idx = i; st.whole = false; paintBA(st); }

  /* camera: fit the answer region into the frame (≤ 1.8×), never past the frame's edges.
     Per item: cam = explicit window, z = fixed zoom, pin = 'r' | 'l' | 'b' aligns the window to that image edge. No ra = whole frame. */
  function camFor(st, ignoreWhole) {
    const it = st.b.items[st.idx], ra = it.ra; if (!ra || (st.whole && !ignoreWhole)) return null;
    const A = st.aspects[st.idx] || SHOT_A; if (Math.abs(A - SHOT_A) / SHOT_A > 0.02) return null;
    const k = FRAME_A / A;                                        /* object-fit: cover, top-left → y stretches by k */
    const fx = ra[0], fy = ra[1] * k, fw = ra[2], fh = ra[3] * k, cx = fx + fw / 2, cy = fy + fh / 2;
    /* explicit window, clamped to the frame: the plate never shows past the picture's edge */
    if (it.cam) { const [wx, wy, ww] = it.cam, s = 100 / ww, lim = 100 - 100 * s, tx = Math.max(lim, Math.min(0, -wx * s)), ty = Math.max(lim, Math.min(0, -wy * k * s)); return { s, tx, ty, box: [tx + s * fx, ty + s * fy, s * fw, s * fh] }; }
    const s = it.z || Math.max(1, Math.min(ZMAX, 92 / fw, 92 / fh));
    const cl = (v, z) => Math.max(100 - 100 * z, Math.min(0, v));
    const tx = it.pin === 'l' ? 0 : it.pin === 'r' ? 100 - 100 * s : cl(50 - s * cx, s);
    const ty = it.pin === 'b' ? 100 - 100 * s : cl(50 - s * cy, s);
    return { s, tx, ty, box: [tx + s * fx, ty + s * fy, s * fw, s * fh] };
  }
  function applyCam(st, o = {}) {
    const after = st.host.querySelector('.ba-img.after'), sp = st.host.querySelector('.ba-aspot');
    const cam = st.mode === 'after' && st.afters[st.idx] ? camFor(st) : null;
    const from0 = o.fromStart && !o.instant;
    if (o.instant || from0) { after.style.transition = 'none'; sp.style.transition = 'none'; }
    if (from0) { after.style.transform = 'none'; sp.classList.remove('on'); void after.offsetWidth; after.style.transition = ''; sp.style.transition = ''; }
    after.style.transform = cam ? `translate(${cam.tx.toFixed(3)}%, ${cam.ty.toFixed(3)}%) scale(${cam.s.toFixed(4)})` : 'none';
    if (cam) { const [x, y, w, h] = cam.box; Object.assign(sp.style, { left: x.toFixed(3) + '%', top: y.toFixed(3) + '%', width: w.toFixed(3) + '%', height: h.toFixed(3) + '%' }); }
    /* a camera window already frames the answer → no dimming; a whole-frame view (z 1) gets the spotlight */
    sp.classList.toggle('on', !!cam && cam.s <= 1.01);
    if (o.instant) { void after.offsetWidth; after.style.transition = ''; sp.style.transition = ''; }
    const z = st.host.querySelector('[data-zoom]');
    const detail = st.mode === 'after' && st.afters[st.idx] && st.b.items[st.idx].ra ? camFor(st, true) : null;
    z.hidden = !(detail && detail.s > 1.01);                       /* no Detail ↔ Whole toggle when the detail is the whole screen */
    st.frame.classList.toggle('no-zoom', !(detail && detail.s > 1.01));
    z.innerHTML = st.whole ? `${I('minimize', 13)}<span>Detail</span>` : `${I('maximize', 13)}<span>Whole screen</span>`;
    z.setAttribute('aria-pressed', st.whole ? 'true' : 'false');
  }
  function paintBA(st, o = {}) {
    const { host, b } = st, it = b.items[st.idx], frame = host.querySelector('.ba-frame');
    host.querySelectorAll('.dc').forEach((li) => li.classList.toggle('on', +li.dataset.i === st.idx));
    host.querySelectorAll('[role="tab"]').forEach((t, i) => { const on = i === st.idx; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    frame.setAttribute('aria-labelledby', `ba-${st.key}-t${st.idx}`);
    frame.dataset.mode = st.mode; frame.classList.toggle('is-whole', !!st.whole);
    host.querySelectorAll('button[data-mode]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.mode === st.mode));
    const spot = host.querySelector('.ba-spot'), [x, y, w, h] = it.r;
    Object.assign(spot.style, { left: x + '%', top: y + '%', width: w + '%', height: h + '%' }); spot.classList.add('on');
    const after = host.querySelector('.ba-img.after'), url = st.afters[st.idx], idx = st.idx;
    const load = () => {
      if (url) { if (after.getAttribute('src') !== url) after.src = url; after.classList.add('ok'); after.alt = `${b.to} — prototype scene ${lbl(it)}`; }
      else after.classList.remove('ok');
      host.querySelector('.ba-ph').style.display = url ? 'none' : '';
    };
    clearTimeout(st.swapT);
    const key = idx + '|' + url;
    if (st.mode === 'after') {
      const fresh = st.shown !== 'after' || st.camKey !== key;       /* a new frame (or a new window on the same frame) pushes in from the whole screen */
      load(); applyCam(st, { fromStart: fresh, instant: o.instant }); st.camKey = key;
    } else if (st.shown === 'after' && !o.instant) {
      st.swapT = setTimeout(() => { if (st.mode !== 'before') return; load(); applyCam(st, { instant: true }); st.camKey = null; }, 420);   /* swap once the frame has faded out */
    } else { load(); applyCam(st, { instant: true }); st.camKey = null; }
    st.shown = st.mode;
    const ph = host.querySelector('[data-ph]'); ph.dataset.hash = it.hash; ph.href = href(b.page, it.hash);
    host.querySelector('[data-tag]').innerHTML = st.mode === 'before' ? `<i></i>Before · ${esc(b.from)} · ${b.date}` : `<i></i>After · ${esc(b.to)} · ${esc(it.el || '#' + lbl(it))}`;
    const pb = host.querySelector('[data-play]'); pb.innerHTML = I(st.playing ? 'pause' : 'play', 15); pb.setAttribute('aria-label', st.playing ? 'Pause the walkthrough' : 'Play the walkthrough');
    if (!st.playing) host.querySelectorAll('.dc-bar').forEach((bar) => { bar.getAnimations().forEach((a) => a.cancel()); bar.style.transform = ''; });
  }
  function clearT(st) { st.timers.forEach(clearTimeout); st.timers = []; if (st.anim) { st.anim.cancel(); st.anim = null; } }
  /* walkthrough: before (spot on the old screen) → after (camera pushes in on the answer) → next.
     Reduced motion: only on request (Play), frames cross-fade, no progress sweep, no camera move. */
  function playBA(st, from) {
    clearT(st); st.playing = true; const red = reduced();
    const step = (i) => {
      clearT(st); st.idx = i; st.mode = 'before'; st.whole = false; paintBA(st);
      const bar = st.host.querySelector(`.dc[data-i="${i}"] .dc-bar`);
      if (!red) st.anim = bar.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: SLOT, easing: 'linear', fill: 'forwards' });
      st.timers.push(setTimeout(() => { if (st.afters[i]) { st.mode = 'after'; paintBA(st); } }, BEFORE_MS));
      st.timers.push(setTimeout(() => {
        if (i === st.b.items.length - 1) { st.done = true; stopBA(st, false); st.mode = 'before'; select(st, 0); return; }
        step(i + 1);
      }, SLOT));
    };
    step(from || 0);
  }
  function stopBA(st, byUser) { clearT(st); st.playing = false; if (byUser) st.userPaused = true; paintBA(st); }
  let activeBA = null;
  const canAuto = (st) => {
    if (st.userPaused || st.done || reduced()) return false;
    if (st.grid.matches(':hover') || st.grid.contains(document.activeElement)) { st.hoverPaused = true; return false; }
    return true;
  };
  function watchBA() {
    const all = Object.values(blocks), ratio = new Map(), r = (s) => ratio.get(s) || 0;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => { const st = all.find((s) => s.frame === en.target); if (!st) return; ratio.set(st, en.isIntersecting ? en.intersectionRatio : 0); st.visible = en.isIntersecting && en.intersectionRatio >= 0.55; });
      /* one focal object: when both frames are on screen only the more visible one plays (10 % hysteresis, no ping-pong) */
      let best = null; all.forEach((s) => { if (s.visible && (!best || r(s) > r(best))) best = s; });
      if (best && activeBA && activeBA !== best && activeBA.visible && r(best) < r(activeBA) + 0.1) best = activeBA;
      if (best !== activeBA) { if (activeBA && activeBA.playing) stopBA(activeBA, false); activeBA = best; }
      all.forEach((s) => { if (s !== activeBA && s.playing) stopBA(s, false); });
      if (activeBA && !activeBA.playing && canAuto(activeBA)) playBA(activeBA, activeBA.idx);
    }, { threshold: [0, 0.2, 0.4, 0.55, 0.65, 0.75, 0.85, 0.95, 1] });
    all.forEach((st) => io.observe(st.frame));
  }

  /* ───────── 02b · the same language through the flow (live prototype frames) ───────── */
  function renderFlow() {
    const T = [
      { k: 'desk-K0', hash: 'K0', el: 'Aufruf', h: 'The right cards are already there.', tags: ['P4', 'P5'],
        p: `Opening ${P.name} pins the patient card and summons only what changed since the last visit on ${F.since} — ${F.ferritin} (${F.ferritinFlag}), ${F.ibu} bought over the counter on top of ${F.nap}, and a referral that never came back.` },
      { k: 'desk-K1', hash: 'K1', el: 'Labor', h: 'Three blood results, one card.', tags: ['P5', 'P9'],
        p: `“Letzte 3 Blutbefunde vergleichen” returns graph and exact numbers together — ${ferr.key} first, in orange, because it is flagged — and a source line that admits what ELGA may be missing.` },
      { k: 'desk-C', hash: 'C&t=336', lbl: 'C', el: 'Konsultation', h: 'It listens and prepares. It never acts.', tags: ['P2', 'P3'],
        p: `The mic pill turns orange (Mitschrift) and the capsule says Hört mit. Facts lift off the transcript into Erkannt; Vorschläge stay drafts, nothing is sent. The one real ambiguity — ${F.ambig} — is asked once and sets Termin and eAUM together.` },
      { k: 'desk-F', hash: 'F', el: 'Freigabe', h: 'Sign once. Hold before send.', tags: ['P3', 'P11'],
        p: `Only the orange Prüfen fields need a tap. One black hold signs all ${F.t3n} documents for ${P.name} — then five seconds to stop before anything leaves the practice.` },
    ];
    const host = $('[data-flow]'); host.className = 'flow';
    host.innerHTML = `
      <div class="flow-head rv"><div class="scr">Screen 1 · through the consultation</div><h3>The same design language, carried through the flow.</h3>
        <p>Scene P is the moment before the patient walks in. The same grammar — glass cards, black at three opacities, blue / orange / red as the only signals, outlined pills, the black capsule — carries through the rest of the visit. Every frame is the live prototype.</p></div>
      <div class="flow-grid">${T.map((t, i) => `
        <article class="fl rv" style="--i:${i}" data-k="${t.k}">
          <button type="button" class="fl-shot" data-lb-open aria-label="Enlarge scene ${esc(t.lbl || t.hash)}"><span class="fl-ph">${I('desk', 18)}</span></button>
          <div class="fl-body"><span class="fl-k">#${esc(t.lbl || t.hash)} · ${esc(t.el)}</span><h4>${esc(t.h)}</h4><p>${esc(t.p)}</p>
            <div class="dc-foot">${ptags(t.tags)}<a class="lnk" data-link="desk.html" data-hash="${t.hash}">Open <code>#${esc(t.lbl || t.hash)}</code>${I('arrow-up-right', 14)}</a></div></div>
        </article>`).join('')}</div>`;
    T.forEach((t) => shot([t.k]).then((u) => {
      const b = host.querySelector(`[data-k="${t.k}"] .fl-shot`); if (!u || !b) return;
      b.innerHTML = `<img src="${u}" alt="" loading="lazy" decoding="async">`; b.dataset.src = u; b.dataset.cap = `#${t.lbl || t.hash} · ${t.el} — ${t.h}`;
    }));
  }
  function initLightbox() {
    const dlg = $('[data-lb]'); if (!dlg || !dlg.showModal) return;
    const img = $('[data-lb-img]'), cap = $('[data-lb-cap]');
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lb-open]'); if (!b || !b.dataset.src) return;
      img.src = b.dataset.src; img.alt = b.dataset.cap || ''; cap.textContent = b.dataset.cap || ''; dlg.showModal();
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-lb-x]') || e.target === img) dlg.close(); });
  }

  /* ───────── 03 · autonomy policy ───────── */
  function renderAutonomy() {
    const rows = [
      { a: 'Look something up', s: 'Akte öffnen · Blutbefunde vergleichen · Medikation',
        c: [0, `<span class="who">Shows at once.</span> The card title restates what was understood — no dialog.`],
        h: [-1, `Never. Conversation does not open cards.`],
        r: `<span class="nil">Nothing to release.</span><span class="ex">ELGA reads are logged under the doctor (§ 22 GTelG).</span>` },
      { a: 'Hand a task to the assistant', s: D.tier1.receipt,
        c: [1, `Done — undo for ${D.tier1.undoSec} s.`],
        h: [-1, `Not from conversation.`],
        r: `<span class="who">Doctor</span> — by saying it.` },
      { a: 'Book the follow-up', s: A.termin.title,
        c: [1, 'Booked, with undo.'],
        h: [2, 'Slot reserved — no SMS until release.'],
        r: `<span class="who">Doctor</span><span class="rel"><i>Command</i>by saying it</span><span class="rel"><i>Heard</i>at Freigabe, removable</span>` },
      { a: 'CAVE · Leistungen · Kontaktgrund', s: `${A.cave.title} · Leistungen ${(/\d+/.exec(A.leistungen.title) || [''])[0]} · ${F.hd}`,
        c: [1, 'Saved, with undo.'],
        h: [2, `Pre-accepted, with the quote that caused it.<span class="ex">${esc(F.caveQuote)}</span>`],
        r: `<span class="who">Doctor</span><span class="rel"><i>Command</i>by saying it</span><span class="rel"><i>Heard</i>at Freigabe, row by row</span>` },
      { a: 'Kartei: Dekurs & Status', s: 'Documentation of the contact',
        c: [2, 'Dictation becomes KI ink.'],
        h: [2, `KI-Entwurf — the AI flags what it did not hear („${esc(F.unheard)}“).`],
        r: `<span class="who">Doctor</span> in the Akte (Übernehmen). Marked as AI until then — EU AI Act Art. 50.` },
      { a: `${F.t3names.join(' · ')}`, s: 'Legal and clinical acts',
        c: [3, 'Staged for signature.'],
        h: [3, 'Staged; uncertain fields are „Prüfen“, with no default.'],
        r: `<span class="who">Doctor only</span> (§§ 49, 55 ÄrzteG). One hold, then 5 s to stop. Absent from the assistant’s view (§ 9 MABG).` },
      { a: 'Close a Befund (Vidieren)', s: `Laborbefund ${F.befund}`,
        c: [0, 'Never automatic — only from the full report view.'],
        h: [0, `Marks it „Im Gespräch besprochen${F.befundDiscussed ? ' · ' + F.befundDiscussed : ''}“. It stays open.`],
        r: `<span class="who">Doctor</span>, with name and time.` },
    ];
    const TL = { 1: 'Tier 1 · act + undo', 2: 'Tier 2 · prepared', 3: 'Tier 3 · signature' };
    const cell = ([t, txt]) => `<td class="cell"><span class="cl ${t > 0 ? 't' + t : t < 0 ? 't0' : ''}">${t > 0 ? tier(t, TL[t]) + '<br>' : ''}${t < 0 ? `<span class="nil">${txt}</span>` : txt}</span></td>`;
    $('[data-autonomy]').innerHTML = `
      <div class="legend rv">${tier(1, 'Tier 1 · act + undo')}<span>explicit, internal, reversible</span>${tier(2, 'Tier 2 · prepared')}<span>pre-accepted, removable</span>${tier(3, 'Tier 3 · signature')}<span>legal or clinical act, doctor only</span></div>
      <div class="card tbl-card rv" style="--i:1"><div class="plate">
        <table class="at">
          <thead><tr><th>Action</th><th>On an explicit command<br><span class="thn">chip, typed, or hold ${OPT}</span></th><th>Heard in conversation<br><span class="thn">Mitschrift running</span></th><th>Who releases</th></tr></thead>
          <tbody>${rows.map((r) => `<tr><td><span class="act">${esc(r.a)}</span><span class="sub">${esc(r.s)}</span></td>${cell(r.c)}${cell(r.h)}<td>${r.r}</td></tr>`).join('')}</tbody>
        </table>
      </div></div>
      <div class="at-foot rv" style="--i:2">
        <p class="pull">Passive listening can only prepare — never act. <span class="t3">Who signs is set by law; how it feels is a design choice backed by evidence.</span></p>
        ${srcs(['gConfirm', 'alexa', 'knight', 'operator', 'gmail', 'mhra', 'risAeg'])}
      </div>`;
  }

  /* ───────── 04 · legibility & contrast (the prototype's palette on its glass) ───────── */
  /* contrast maths (WCAG 2.2) */
  const parse = (str) => {
    str = String(str || '').trim();
    let m = str.match(/^#([0-9a-f]{3,8})$/i);
    if (m) { let h = m[1]; if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1]; }
    m = str.match(/rgba?\(([^)]+)\)/i);
    if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    return [0, 0, 0, 1];
  };
  const over = (fg, bg) => { const a = fg[3]; return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]; };
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hexOf = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const withA = (hex, a) => { const c = parse(hex); c[3] = a; return c; };

  /* the palette as the prototype renders it today (measured on desk.html#P and akte.html#pre) — standard mode.
     orangeText / redText = the colour small signal text is drawn in. The system also defines a darker text shade
     (tokens.css --warn-text #d23f08); once the pages draw small orange text with it, set orangeText to '#d23f08' here and
     the rules, the specimen and the measured table follow. */
  const PAL = { blue: '#1736f7', orange: '#ee4d12', orangeText: '#ee4d12', red: '#ee1212', redText: '#ee1212' };
  /* Backdrops — pixel medians of empty 9 × 9 patches in the Desk at scene P (1600 × 900, presenter pill hidden).
     The darkest backdrop a text can sit on is the one that counts (W3C F83). */
  const BACK = {
    cardDark: { hex: '#d7ddea', lbl: 'Glass card, darkest', at: 'patient card, lower half' },
    cardLight: { hex: '#e5e7e9', lbl: 'Glass card, lightest', at: 'patient card, top' },
    mint: { hex: '#d0e6e4', lbl: 'Mint tint', at: 'Wartezimmer card' },
    fieldDark: { hex: '#bdc7dc', lbl: 'Field, darkest', at: 'under the chips' },
    fieldLight: { hex: '#d0d4dc', lbl: 'Field, lightest', at: 'around the date' },
  };
  const ON = { card: ['cardDark', 'cardLight', 'mint'], field: ['fieldDark', 'fieldLight'] };
  /* one row = one text role; acc = what accessibility mode sets (null = the same in both modes) */
  const CROWS = [
    { role: 'Clinical values', stdLbl: 'black 100 %', where: 'names, values, doses, dates you act on · 14–25 px', fg: ['#000000', 1], on: 'card', sample: 'Ferritin 22 ng/ml', acc: null },
    { role: 'The time', stdLbl: 'black 100 %', where: '09:45 · 89 px extralight, on the field', fg: ['#000000', 1], on: 'field', large: true, sample: '09:45', sampleCls: 'big', acc: null },
    { role: 'Labels on glass', stdLbl: 'black 40 %', where: 'Als Nächstes · 49 J. / *11.10.1976 · Befunde · 12–14 px', fg: ['#000000', 0.4], on: 'card', sample: '*11.10.1976', acc: ['#000000', 0.6], accLbl: 'black 60 %' },
    { role: 'Labels on the field', stdLbl: 'black 40 %', where: 'Montag, 28. September · „ist da“ · 14–16 px', fg: ['#000000', 0.4], on: 'field', sample: 'Montag, 28. September', acc: ['#000000', 0.6], accLbl: 'black 60 %' },
    { role: 'Suggestion chips', stdLbl: 'black 40 %', where: 'Öffne Herrn Demir · 14 px on a 5 % grey well', fg: ['#000000', 0.4], on: 'field', well: 0.05, sample: 'Öffne Herrn Demir', acc: ['#000000', 0.6], accLbl: 'black 60 %' },
    { role: 'Separators', stdLbl: 'black 20 / 15 %', where: 'the · at 20 %, the / at 15 %', fg: ['#000000', 0.2], on: 'card', sample: '49 J. <i>/</i> BVAEB', deco: true, acc: null },
    { role: 'Attention text', stdLbl: PAL.orangeText, where: 'ungeprüft · 2 auffällig · 11 Min · 12–14 px', fg: [PAL.orangeText, 1], on: 'card', sample: 'ungeprüft', acc: ['#b03503', 1], accLbl: '#b03503' },
    { role: 'Deadline text', stdLbl: PAL.redText, where: 'Frist 01.10 · 12 px, always with ⚠', fg: [PAL.redText, 1], on: 'card', sample: 'Frist 01.10', acc: ['#c20e0e', 1], accLbl: '#c20e0e' },
    { role: 'People & links on glass', stdLbl: PAL.blue, where: 'Dr. Berger · 12:30 Visite · 12 px', fg: [PAL.blue, 1], on: 'card', sample: 'Dr. Berger', acc: null },
    { role: 'People on the field', stdLbl: PAL.blue, where: '„Herr Demir“ · 16 px', fg: [PAL.blue, 1], on: 'field', sample: 'Herr Demir', acc: ['#1230e6', 1], accLbl: '#1230e6' },
    { role: 'Capsule prompt', stdLbl: 'white 40 %', where: 'Fragen oder anweisen … · 16 px on black', fg: ['#ffffff', 0.4], bg: '#000000', sample: 'Fragen oder anweisen …', acc: ['#ffffff', 0.6], accLbl: 'white 60 %' },
    { role: 'Inbox badge', stdLbl: 'fill ' + PAL.orange, where: '25 · 10 px white on orange', fg: ['#ffffff', 1], bg: PAL.orange, sample: '25', sampleCls: 'badge', acc: ['#ffffff', 1], accBg: '#d23f08', accLbl: 'fill #d23f08' },
    { role: 'Primary button', stdLbl: 'black on white', where: 'Konsultation starten · black on white', fg: ['#000000', 1], bg: '#ffffff', sample: 'Konsultation starten', sampleCls: 'btn', acc: null },
  ];
  /* worst case over every backdrop the role can sit on */
  function measureRow(fg, row, bgOverride) {
    const bgs = bgOverride || row.bg ? [bgOverride || row.bg] : ON[row.on].map((k) => BACK[k].hex);
    let worst = null;
    bgs.forEach((hx) => {
      let bg = parse(hx); if (row.well) bg = over([0, 0, 0, row.well], bg);
      const r = ratio(over(withA(fg[0], fg[1]), bg), bg);
      if (!worst || r < worst.r) worst = { r, bg: hexOf(bg), src: hx };
    });
    return worst;
  }
  const badge = (r, large, deco) => deco ? '<span class="bd deco">decorative</span>' : r >= 7 ? '<span class="bd">AAA</span>' : r >= 4.5 ? '<span class="bd">AA</span>' : (large && r >= 3) ? '<span class="bd">AA large</span>' : r >= 3 ? '<span class="bd low">large text only</span>' : '<span class="bd low">below 3 : 1</span>';
  const swatch = (fg, m, row, bgHex) => {
    const col = `rgba(${parse(fg[0]).slice(0, 3).join(',')},${fg[1]})`;
    const inner = row.sampleCls === 'badge' ? `<span class="sw-badge" style="background:${bgHex};color:${col}">${row.sample}</span>`
      : row.sampleCls === 'btn' ? `<span class="sw-btn" style="color:${col}">${row.sample}</span>` : `<span style="color:${col}">${row.sample}</span>`;
    /* badge and button sit on the glass card, so their swatch shows that backdrop around them */
    return `<span class="sw ${row.sampleCls || ''}" style="background:${row.sampleCls === 'badge' || row.sampleCls === 'btn' ? BACK.cardDark.hex : m.bg}">${inner}</span>`;
  };
  function contrastRows() {
    return CROWS.map((row) => {
      const m = measureRow(row.fg, row);
      const fx = row.acc ? measureRow(row.acc, row, row.accBg) : null;
      return Object.assign({}, row, { m, fx });
    });
  }
  function renderGlass() {
    const ph = P.photo, ini = P.name.split(' ').map((x) => x[0]).join('');
    $('[data-glass-sec]').innerHTML = `
      <div class="gl-grid">
        <div class="rv">
          <div class="spec" data-tone="standard" style="--or-std:${PAL.orangeText};--rd-std:${PAL.redText}" aria-label="Material specimen: glass cards and text levels on the pastel field">
            <div class="sp-nav" aria-hidden="true"><span class="on">${I('desk', 13)}Desk</span><span>${I('today', 13)}Heute</span><span>${I('users', 13)}Patienten</span></div>
            <div class="sp-card sp-pat">
              <div class="sp-l1"><span class="k2">Als Nächstes</span><span class="sep">·</span><span class="k2">Termin ${esc(P.appointment.time)}</span></div>
              <div class="sp-name">${esc(P.name)}</div>
              <div class="sp-meta"><span class="k2">${P.age} J.</span><span class="sl">/</span><span class="k2">*${esc(P.dob)}</span><span class="sl">/</span><span class="k2">${esc(P.carrier.short)}</span></div>
              <div class="sp-photo${ph ? '' : ' noimg'}" data-ini="${esc(ini)}">${ph ? `<img src="${esc(ph)}" alt="" onerror="this.parentNode.classList.add('noimg');this.remove()">` : ''}</div>
              <div class="sp-why"><i class="b"></i>Kontrolle Reflux</div><div class="sp-why"><i class="o"></i>Laborbesprechung</div>
              <div class="sp-pills"><span class="pill">${I('clock', 12)}<span class="k2">Wartezimmer seit ${esc(P.appointment.arrived)}</span></span><span class="pill warn">${I('alert', 12)}<span class="or">CAVE nicht erhoben</span></span></div>
              <div class="sp-row"><span class="well">${I('flask', 11)}</span><span class="nw">${esc(F.ferritin)}</span><span class="sep">·</span><span class="or">ungeprüft</span></div>
            </div>
            <div class="sp-card sp-inbox">
              <div class="sp-l1"><span class="k2">Wartet auf Sie</span><span class="r">klinisch</span></div>
              <div class="sp-met">
                <div><b>${G.befunde.count}</b><span class="k2">Befunde</span><span class="or">${G.befunde.flagged} auffällig</span></div>
                <div><b>${G.rezepte.count}</b><span class="k2">Rezeptanfragen</span><span>Dauermedikation</span></div>
                <div><b>${G.abs.count}</b><span class="k2">ABS-Rückfrage</span><span class="rd">Frist 01.10 ${I('alert', 11)}</span></div>
              </div>
              <div class="sp-item"><div><span class="k2">Dapagliflozin</span><span class="sep">·</span><span class="k2">Rückfrage</span></div><div>Eva Pichler<span class="sep">·</span>ABS-Rückfrage</div><span class="pill red">${I('clock', 11)}<span class="rd">Frist 01.10</span></span></div>
              <div class="sp-foot"><span class="k2">${I('users', 13)}Assistenz</span><span>${D.assistantQueue.count} organisatorische Aufgaben</span></div>
              <div class="sp-wz"><span>Wartezimmer<span class="sep">·</span>${D.waiting.length}</span><span class="k2">längste Wartezeit</span><span class="or">11 Min</span><span class="av">${D.waiting.slice(0, 5).map((w, i) => `<i class="${w.termin ? '' : 'd'} ${i === 0 ? 'n' : ''}">${esc(w.name.split(' ').map((x) => x[0]).join(''))}</i>`).join('')}</span></div>
            </div>
            <div class="sp-line"><span class="bl">Herr ${esc(P.lastName)}</span> <span class="k2">ist da</span><span class="sep">·</span>${F.waiting} Entscheidungen <span class="k2">warten auf Sie</span></div>
            <div class="sp-chips" aria-hidden="true"><span>${I('user', 13)}Öffne Herrn ${esc(P.lastName)}</span><span>${I('sparkles', 13)}Was ist neu?</span></div>
            <div class="sp-cap" aria-hidden="true"><span class="orb"><i></i></span><span class="ph">Fragen oder anweisen …</span><span class="kb">${OPT}</span><span class="h">halten</span></div>
          </div>
          <div class="spec-key" aria-hidden="true"><span><i></i>Card · white glass 40 % · radius 28</span><span><i class="f"></i>Field · pastel light</span><span><i class="k"></i>Capsule · opaque black</span></div>
          <div class="gl-ctl"><span class="lbl">Preview</span><div class="seg lg" role="group" aria-label="Legibility preview" data-tone-seg>
            <button type="button" data-tone="standard" aria-pressed="true">Standard</button><button type="button" data-tone="access" aria-pressed="false">Accessibility mode</button>
          </div><span class="note">Only text tokens change — layout, glass and colours stay.</span></div>
        </div>
        <ul class="rules">
          ${[
            { i: 'layout', b: 'One layer — never glass on glass', p: 'Cards are single-layer white glass at 40 % with inset light; content sits directly on it — no frames, no inner plates. When the doctor drags a card over another, the top card frosts (more white, deeper blur) so text never reads through.', s: ['hig', 'wwdc219'] },
            { i: 'stethoscope', b: 'Clinical values in full black', p: 'Whatever the doctor acts on is black at 100 %, always — the patient, the value, the decision. 40 % grey is reserved for labels and the context line above an item — Als Nächstes, the date of the day, a unit after its value; 20 and 15 % only for separators. Poppins carries the rest: 200 for the time, 300 for big numbers, 400 for text, 500 for labels.', s: ['wwdc356'] },
            { i: 'activity', b: 'Three signals, one meaning each', p: `Blue ${PAL.blue} — a person or link you can open, and the AI listening. Orange ${PAL.orange} — attention: ungeprüft, CAVE, waiting time${PAL.orangeText !== PAL.orange ? `; small text takes the darker ${PAL.orangeText}` : ''}. Red ${PAL.red} — a deadline, always with the word Frist and ⚠. A signal is never colour alone: the word carries the meaning, the colour only speeds it up. Everything else is black; violet marks only what the AI drafted (KI ink) and is never a signal.`, s: ['fsd', 'wwdc219'] },
            { i: 'settings', b: 'Measured at the darkest backdrop', p: 'Text over glass is checked against the darkest pixel it can sit on, not the average — the lower half of the patient card and the blue floor of the field under the chips. The lowest ratio is the one we print.', s: ['f83', 'higA11y'] },
          ].map((r, k) => `<li class="rv" style="--i:${k + 1}"><span class="ri">${I(r.i, 15)}</span><b>${esc(r.b)}</b><p>${esc(r.p)}</p>${srcs(r.s)}</li>`).join('')}
        </ul>
      </div>
      <div class="proof-h rv"><h3>Contrast, measured — not claimed</h3><p>WCAG 2.2 ratios computed live below from the prototype’s colours, each text alpha-composited over the real backdrop it sits on. The worst backdrop counts.</p></div>
      <div class="bk rv" data-backs></div>
      <div class="card proof rv" data-proof></div>
      <div class="refine rv" data-refine></div>
      <p class="foot-note rv">Relative luminance per WCAG 2.2. AA needs 4.5 : 1 below 24 px (18.66 px bold) and 3 : 1 above; AAA 7 : 1. Backdrops are pixel medians of empty 9 × 9 patches in the Desk at scene P (1600 × 900); white 40 % glass over the field lifts it by about one step, which the card samples confirm. Separators carry no information, so 1.4.3 does not apply to them. Icons that repeat their text label are not required to meet 1.4.11.</p>`;
    $$('[data-tone-seg] button').forEach((b) => b.addEventListener('click', () => {
      $('.spec').dataset.tone = b.dataset.tone; $$('[data-tone-seg] button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    }));
    renderProof();
  }
  function renderProof() {
    const rows = contrastRows();
    $('[data-backs]').innerHTML = `<span class="bk-l">Backdrops</span>${Object.values(BACK).map((b) => `<span class="bk-i"><i style="background:${b.hex}"></i><b>${esc(b.lbl)}</b><code>${b.hex}</code><span>${esc(b.at)}</span></span>`).join('')}`;
    $('[data-proof]').innerHTML = `<div class="plate">
      <div class="pr pr-h"><span>Role</span><span>Standard</span><span class="c">Ratio</span><span></span><span class="gap"></span><span>Accessibility mode</span><span class="c">Ratio</span><span></span></div>
      ${rows.map((x) => `<div class="pr">
        <div class="rl"><b>${esc(x.role)}</b><span>${esc(x.where)}</span></div>
        <div class="sp">${swatch(x.fg, x.m, x, x.bg || x.m.src)}<code>${esc(x.stdLbl)}</code></div>
        <div class="rt">${x.m.r.toFixed(1)}<small>:1</small></div>${badge(x.m.r, x.large, x.deco)}
        <span class="gap" aria-hidden="true">${x.acc ? '→' : ''}</span>
        ${x.acc ? `<div class="sp">${swatch(x.acc, x.fx, x, x.accBg || x.bg || x.fx.src)}<code>${esc(x.accLbl)}</code></div><div class="rt">${x.fx.r.toFixed(1)}<small>:1</small></div>${badge(x.fx.r, x.large)}`
          : `<div class="keep">${x.deco ? 'Decoration — carries no information' : 'The same in both modes'}</div><div></div><div></div>`}
      </div>`).join('')}
    </div>`;
    const R = Object.fromEntries(rows.map((x) => [x.role, x]));
    const f1 = (x) => x.toFixed(1);
    const lo = Math.min(...rows.filter((x) => x.acc).map((x) => x.fx.r));
    $('[data-refine]').innerHTML = `
      <p class="pull">Calm by default, legible on demand. <span class="t3">Clinical values pass AAA in both modes; one switch lifts every other small text to ${f1(lo)} : 1 or more — without changing the look.</span></p>
      <ol class="rf">
        <li><b>Secondary text at 60 % black.</b> ${f1(R['Labels on glass'].fx.r)} : 1 on the darkest glass, ${f1(R['Labels on the field'].fx.r)} : 1 on the field, ${f1(R['Suggestion chips'].fx.r)} : 1 on a chip — up from ${f1(R['Labels on glass'].m.r)}, ${f1(R['Labels on the field'].m.r)} and ${f1(R['Suggestion chips'].m.r)} — and the step down from 100 % stays obvious. It matters most for the date of birth, which is part of the identity check.</li>
        <li><b>Signal text one shade darker.</b> Orange <code>#b03503</code> (${f1(R['Attention text'].fx.r)} : 1) and red <code>#c20e0e</code> (${f1(R['Deadline text'].fx.r)} : 1) for text below 24 px; bars, dots, outlines, icons and fills keep <code>${PAL.orange}</code> and <code>${PAL.red}</code>. In standard mode small signal text measures ${f1(R['Attention text'].m.r)} : 1 (orange) and ${f1(R['Deadline text'].m.r)} : 1 (red) — which is why it never carries meaning alone: the word says it, the colour only speeds it up.</li>
        <li><b>The capsule prompt at 60 % white.</b> ${f1(R['Capsule prompt'].fx.r)} : 1 on black instead of ${f1(R['Capsule prompt'].m.r)} : 1 — the capsule stays quiet, the prompt becomes readable.</li>
        <li class="minor"><b>Two small ones.</b> The inbox badge on <code>#d23f08</code> (${f1(R['Inbox badge'].fx.r)} : 1 for white 10 px), and „Herr Demir“ on the bare field one step darker, <code>#1230e6</code> (${f1(R['People on the field'].fx.r)} : 1) — on glass the blue already passes.</li>
        <li class="minor"><b>Solid cards on request.</b> Safari ignores <code>prefers-reduced-transparency</code>, so accessibility mode also turns the cards solid white. In the product it is one switch; the prototype runs in standard mode. ${src('mdn')}</li>
      </ol>`;
  }

  /* ───────── 05 · Austrian details ───────── */
  function svnrCheck(sv) {
    const d = sv.replace(/\D/g, '').split('').map(Number); const w = [3, 7, 9, null, 5, 8, 4, 2, 1, 6];
    const sum = d.reduce((s, x, i) => (w[i] == null ? s : s + x * w[i]), 0);
    const dobOk = d.slice(4).join('') === P.dob.replace(/\D/g, '').replace(/^(\d{4})\d{2}(\d{2})$/, '$1$2');
    return { d, w, sum, mod: sum % 11, ok: sum % 11 === d[3], dobOk };
  }
  function renderAustria() {
    const sv = svnrCheck(P.svnr), ec = P.ecard, steiner = D.waiting.find((w) => w.ecardNote);
    const au = A.eaum.fields, ag = au.find((f) => f.label === 'Arbeitgeber');
    const icd = D.icd[0];
    const tiles = [
      { cat: 'e-card', h: 'e-card ≠ entitlement',
        spec: `<div class="au-line">${I('card')}<span>e-card gesteckt ${esc(ec.time)}</span></div><div class="au-line">${I('check')}<span>${esc(ec.entitlement)} · ${esc(ec.carrierConfirmed)}</span></div><div class="au-line">${I('alert')}<span class="m">${esc(steiner.ecardNote)}</span></div>`,
        p: 'Reading the card and confirming entitlement are two facts, shown separately. A forgotten card is a state with a next step — not an error.', s: ['ecardV', 'ecardDig'] },
      { cat: 'ELGA', fix: true, h: 'Two honest ELGA states',
        spec: `<div class="au-line">${I('database')}<span>ELGA-Zugriff bis ${esc(F.elga)}</span></div><div class="au-line">${I('info')}<span class="m">Keine Daten über ELGA</span></div><div class="au-line">${I('x')}<span class="x">Patient widersprochen</span></div>`,
        p: 'A doctor cannot see an opt-out — only access, with its own expiry per module, or “no data”. We corrected the brief’s third state.', s: ['chipkarte', 'elgaNoe'] },
      { cat: 'eAUM', fix: true, h: 'The eAUM goes to the carrier',
        spec: `<div class="au-line">${I('send')}<span>eAUM → ${esc(P.carrier.short)} · ${esc(F.hd)}</span></div><div class="au-line">${I('user')}<span>Arbeitgeber → Bestätigung</span></div><div class="au-line"><span class="m">${esc(ag.value.split(' — ')[0])}</span></div>`,
        p: `It carries the diagnosis to ${P.carrier.short}; the employer only gets a confirmation without it. The prototype never lets the two mix.`, s: ['oegkAu'] },
      { cat: 'Codierung', h: 'ICD per contact day',
        spec: `<div class="au-line"><span>Kontaktgrund <b>${esc(F.codes[0])}</b> (HD) · ${esc(F.codes.slice(1).join(' · '))}</span></div><div class="au-line"><span class="m">„${esc(icd.term.charAt(0).toUpperCase() + icd.term.slice(1))}“</span></div><div class="au-line"><span class="au-arrow">→</span><span>${esc(icd.label)} · ${esc(icd.code)}</span></div>`,
        p: 'Since 1.7.2026 every contact day carries at least one ICD-10 code, the first being the Hauptdiagnose. Suggested from speech, always confirmed.', s: ['bmasgpk', 'innomedIcd'] },
      { cat: 'Kartei', h: 'Kürzel, keyboard-first',
        spec: `<div class="cmd">rez panto<span class="caret"></span><span class="hintk">Leertaste</span></div><div class="kz">${D.kuerzel.map((k) => `<span class="${k.action ? 'act' : ''}">${esc(k.k)}</span>`).join('')}</div>`,
        p: 'Austrian Kartei culture runs on Kürzel. A Kürzel plus space switches the entry type; action Kürzel stage a document that still needs a signature.', s: ['innomed', 'latidoKartei'] },
      { cat: 'SV-Nummer', fix: true, h: 'A check digit that checks',
        spec: `<div class="svn">${sv.d.map((x, i) => `${i === 4 ? '<span class="gap"></span>' : ''}<span class="${i === 3 ? 'ck' : ''}"><b>${x}</b><i>${sv.w[i] == null ? '✓' : '×' + sv.w[i]}</i></span>`).join('')}</div><div class="svn-sum">Σ ${sv.sum} · mod 11 = ${sv.mod} ${sv.ok ? '✓' : '✗'}</div><div class="svn-sum m">${sv.d.slice(4).join('')} ↔ *${esc(P.dob)} ${sv.dobOk ? '✓' : '✗'}</div>`,
        p: 'LLL-P-TTMMJJ with a mod-11 check digit. The old screen showed a number with a valid checksum but an impossible date; ours matches the birth date too.', s: ['svnr'] },
      { cat: 'Versicherung', fix: true, h: 'Austrian carriers, not GKV/PKV',
        spec: `<div class="au-line"><span class="m">Kassenverträge der Praxis</span></div><div class="kz car">${D.practice.kind.replace(/^.*\(|\)$/g, '').split(' · ').map((c) => `<span class="${c === P.carrier.short ? 'act' : ''}" ${c === P.carrier.short ? `title="${esc(P.name)}"` : ''}>${esc(c)}</span>`).join('')}</div><div class="au-line" style="white-space:normal;line-height:1.4"><span>${esc(P.carrier.note)}</span></div>`,
        p: 'Statutory carriers instead of the German model on the old screens — and no payment-at-desk UI, because the Behandlungsbeitrag is billed afterwards.', s: ['orf', 'oegkHon'] },
      { cat: 'Vokabular', h: 'Dekurs, not “note”',
        spec: `${['dek', 'sta', 'dia'].map((k) => `<div class="au-line">${UI.type(k)}</div>`).join('')}<div class="au-line"><span class="m">Dauerdiagnosen</span><span>${esc(P.problems.map((p) => p.code).join(' · '))}</span></div>`,
        p: 'Dekurs, Status, Dauerdiagnose, Vidieren, Regelfall: the words a Kassenpraxis uses, grouped by contact day inside the quarter.', s: ['latidoKartei', 'semanik'] },
    ];
    $('[data-austria]').innerHTML = tiles.map((t, i) => `
      <article class="card au rv" style="--i:${i % 4}"><div class="plate">
        <div class="au-spec" aria-hidden="true">${t.spec}</div>
        <div class="au-body"><div class="cat">${esc(t.cat)}${t.fix ? '<span class="fx" title="Corrects the brief or the current product">correction</span>' : ''}</div><h3>${esc(t.h)}</h3><p>${esc(t.p)}</p>${srcs(t.s)}</div>
      </div></article>`).join('');
  }

  /* ───────── 06 · regulatory lanes (inline SVG) ───────── */
  function renderLanes() {
    const col = [24, 240, 456, 672], cw = [184, 184, 184, 204];
    const node = (x, y, w, t, s, cls = '') => `<g><rect class="node ${cls}" x="${x}" y="${y}" width="${w}" height="52" rx="16"/><text class="nt" x="${x + 16}" y="${y + 21}">${esc(t)}</text><text class="ns" x="${x + 16}" y="${y + 39}">${esc(s)}</text></g>`;
    const wire = (x1, x2, y, c, d) => `<path class="wire ${c} draw ${d || ''}" d="M${x1} ${y} H${x2 - 6}"/><path class="ah" d="M${x2 - 7} ${y - 4} L${x2} ${y} L${x2 - 7} ${y + 4} Z"/>`;
    const y1 = 70, y2 = 306, m1 = y1 + 26, m2 = y2 + 26;
    const gr1 = ['KI ink until released', 'Provenance per field', 'Art. 50 marking', 'Hold before send', 'No auto-commit'];
    const gr2 = ['Evidence shown', '„Entscheidung bei Ihnen“', '≤ 1 interruption per visit', 'Override logged', 'Stop in one tap'];
    const chips = (list, y, lane) => `<g data-chips="${lane}" transform="translate(124 ${y})">${list.map((t) => `<g><rect class="gr" height="28" rx="14"/><text class="grt" y="18.5">${esc(t)}</text></g>`).join('')}</g>`;
    const svg = `
    <svg class="lanes" viewBox="0 0 1200 434" role="img" aria-labelledby="lanes-t lanes-d">
      <title id="lanes-t">Regulatory lanes</title>
      <desc id="lanes-d">Documentation and admin lane: conversation, transcript, KI draft, prepared documents, all released by the doctor. Clinical-hint lane: record data, connected findings, inline hint, decided by the doctor. Both converge on the doctor before anything reaches the record or external systems.</desc>
      <rect class="lane l1" x="0.5" y="0.5" width="900" height="196" rx="22"/>
      <rect class="lane l2" x="0.5" y="236.5" width="900" height="196" rx="22"/>
      <text class="eb eb1" x="24" y="38">Documentation &amp; admin lane</text>
      <text class="cls" x="876" y="38" text-anchor="end">Designed to stay outside medical-device scope</text>
      <text class="eb eb2" x="24" y="274">Clinical-hint lane</text>
      <text class="cls" x="876" y="274" text-anchor="end"><tspan class="clsb">MDR Rule 11</tspan> → class IIa or higher → <tspan class="clsb">AI Act high-risk</tspan></text>
      ${node(col[0], y1, cw[0], 'Conversation', 'Mitschrift · informed', 'src')}
      ${node(col[1], y1, cw[1], 'Transcript', 'audio deleted at once')}
      ${node(col[2], y1, cw[2], 'KI-Entwurf', 'Dekurs · Status')}
      ${node(col[3], y1, cw[3], 'Prepared', 'Termin · e-Rezept · eAUM')}
      ${wire(col[0] + cw[0], col[1], m1, 'w1')}${wire(col[1] + cw[1], col[2], m1, 'w1')}${wire(col[2] + cw[2], col[3], m1, 'w1')}
      <text class="glab" x="24" y="${y1 + 91.5}">Guardrails</text>
      ${chips(gr1, y1 + 73, 1)}
      ${node(col[0], y2, cw[0], 'Record data', 'Labor · e-Medikation', 'src')}
      ${node(col[1], y2, cw[1], 'Connected', `${ferr.key} ${F.ferritinFlag} + 2 NSAR`)}
      ${node(col[2], y2, cw[2], 'Hint', 'inline · never blocks')}
      ${wire(col[0] + cw[0], col[1], m2, 'w2')}${wire(col[1] + cw[1], col[2], m2, 'w2')}
      <text class="glab" x="24" y="${y2 + 91.5}">Guardrails</text>
      ${chips(gr2, y2 + 73, 2)}
      <line class="div" x1="24" x2="876" y1="216.5" y2="216.5"/>
      <rect class="divbg" x="340" y="204.5" width="220" height="24" rx="12"/>
      <text class="divt" x="450" y="220.5" text-anchor="middle">drafting ≠ deciding</text>
      <path class="wire w1 draw d2" d="M${col[3] + cw[3]} ${m1} C 912 ${m1}, 916 196, 932 206"/>
      <path class="wire w2 draw d2" d="M${col[2] + cw[2]} ${m2} H 868 C 906 ${m2}, 916 238, 932 227"/>
      <circle class="doc" cx="972" cy="216.5" r="40"/>
      <g transform="translate(960 196)" style="color:#fff">${ICON('signature', { size: 24, stroke: 1.6 }).replace('<svg ', '<svg x="0" y="0" ')}</g>
      <text class="doct" x="972" y="240" text-anchor="middle">Doctor</text>
      <text class="ns" x="972" y="280" text-anchor="middle">releases</text><text class="ns" x="972" y="296" text-anchor="middle">signs · decides</text>
      <path class="wire draw d3" d="M1012 216.5 H1018"/><path class="ah" d="M1017 212.5 L1024 216.5 L1017 220.5 Z"/>
      <rect class="node" x="1024.5" y="186.5" width="174" height="60" rx="16"/>
      <text class="nt" x="1040" y="211">Record &amp; systems</text>
      <text class="ns" x="1040" y="230">Kartei · e-card · ${esc(P.carrier.short)}</text>
      <circle class="okc" cx="1190" cy="186.5" r="10"/><path class="okt" d="M1185.5 186.5 l3 3 l5.5 -6" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    $('[data-lanes]').innerHTML = `
      <div class="card lanes-card rv"><div class="plate"><div class="lanes-scroll">${svg}</div></div></div>
      <div class="tl">
        <div class="tl-i rv" style="--i:1"><span class="d">since 2 Aug 2026 · both lanes</span><b>AI output is disclosed and marked</b><p>EU AI Act Art. 50 applies. As a pre-launch product Docline gets no grace period, so KI ink and machine-readable provenance ship from day one.</p>${srcs(['art50', 'fhirProv'])}</div>
        <div class="tl-i rv" style="--i:2"><span class="d">lane 1 · the line we design to</span><b>Drafting for review is not deciding</b><p>The UK regulator draws the line exactly here: transcribing, summarising and drafting for clinician review is admin; ordering on its own is not. For Austria the MDR decides — we use the UK line as an analogy.</p>${srcs(['mhra', 'noelia'])}</div>
        <div class="tl-i rv" style="--i:3"><span class="d">lane 2 · from 2 Aug 2028</span><b>High-risk duties for device-embedded AI</b><p>Per the Digital Omnibus, human-oversight duties land in 2028. The prototype already lets the doctor override, reverse and stop — Art. 14 by design, not by retrofit.</p>${srcs(['mdcg', 'art14'])}</div>
      </div>`;
  }
  function layoutLanes() {
    const svg = $('.lanes'); if (!svg) return;
    const AVAIL = 884 - 124;                                   /* chips run from x 124 to the lane's inner right edge */
    svg.querySelectorAll('[data-chips]').forEach((g) => {
      const cs = [...g.querySelectorAll(':scope > g')], ws = cs.map((c) => { const t = c.querySelector('text'); try { return Math.ceil(t.getComputedTextLength()); } catch (e) { return Math.ceil(t.textContent.length * 6.9); } });
      const sum = ws.reduce((a, b) => a + b, 0), n = cs.length;
      let pad = 12, gap = 8; if (sum + n * 2 * pad + (n - 1) * gap > AVAIL) { gap = 6; pad = Math.max(8, Math.floor((AVAIL - sum - (n - 1) * gap) / (2 * n))); }
      let x = 0; cs.forEach((c, i) => {
        const t = c.querySelector('text'), r = c.querySelector('rect'), w = ws[i] + 2 * pad;
        r.setAttribute('x', x); r.setAttribute('width', w); t.setAttribute('x', x + pad); x += w + gap;
      });
    });
    svg.querySelectorAll('.draw').forEach((p) => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) {} });
    if (reduced()) { svg.classList.add('in'); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { requestAnimationFrame(() => svg.classList.add('in')); io.disconnect(); } }), { threshold: 0.35 });
    io.observe(svg);
  }

  /* ───────── 07 · metrics ───────── */
  function renderMetrics() {
    const M = [
      { h: 'Time to answer a chart question', e: '“Letzte 3 Blutbefunde vergleichen” answered in one step, not by hunting through tabs.', m: 'Utterance → card rendered, from Docline’s event log; timed tasks against the current PVS.', w: 'The median from utterance to card exceeds 5 s — or is not faster than the current PVS.', a: [['koopman', 'Koopman 2011'], ' — a purpose-built view cut the time to find 10 data elements from 5.5 to 1.3 min.'] },
      { h: 'Clicks per consultation', e: 'Fewer steps from Aufruf to signed documents — and no step that only navigates.', m: 'Interaction log per consultation, same case mix in both systems.', w: 'Clicks per consultation fall by less than half.', a: [['koopman', 'Koopman 2011'], ' — 60 clicks down to 3 for the same questions.'] },
      { h: 'Drafts released unedited', e: 'A healthy middle — not 100 %. A rate near 100 % would warn us of rubber-stamping.', m: 'Diff between KI-Entwurf and the released Kartei entry.', w: 'More than 90 % released unedited (rubber-stamping) — or fewer than 30 % (the drafts cost more than they save).', a: [['anderson', 'Anderson 2025'], ' — mean note error rate of 26 % across five scribe platforms, mostly omissions. ', ['goddard', 'Goddard 2012'], ' on automation bias.'] },
      { h: 'Befund arrival → Vidierung', e: 'Shorter — and zero reports closed without a person and a time.', m: 'Timestamps eingegangen → vidiert, per report and per practice.', w: 'The median does not shrink — or a single report is closed without a person and a time.', a: [['tjc', 'Joint Commission NPSG.02.03.01'], ' — timeliness of result follow-up is measured, not assumed.'] },
      { h: 'After-hours documentation', e: 'Fewer Kartei minutes after the last patient has left.', m: 'Active documentation time outside opening hours, per doctor.', w: 'After-hours minutes are unchanged after four weeks.', a: [['arndt', 'Arndt 2017'], ' — 1.4 h a day after hours (US data, directional only).'] },
      { h: 'SUS, per role', e: 'Doctors and assistants both at 80 or above — scored separately, never blended.', m: 'Standard 10-item System Usability Scale after the pilot weeks.', w: 'Either role scores below 68 — the scale’s average.', a: ['Two roles, two views (§ 9 MABG) — so two scores.'] },
    ];
    const anchor = (parts) => parts.map((x) => Array.isArray(x) ? `<a href="${esc(S[x[0]][1])}" target="_blank" rel="noopener">${esc(x[1])}</a>` : esc(x)).join('');
    $('[data-metrics]').innerHTML = `
      <div class="mx-setup rv"><span class="chip">${I('building', 14)}5 Kassenpraxen</span><span class="chip">${I('history', 14)}Baseline in their current PVS</span><span class="chip">${I('activity', 14)}Same tasks in Docline</span><span class="chip">${I('users', 14)}Doctors and assistants separately</span></div>
      <div class="mx-grid">${M.map((x, i) => `
        <article class="card mx rv" style="--i:${i % 3}"><div class="plate">
          <span class="n">H${i + 1}</span><h3>${esc(x.h)}</h3>
          <dl><div><dt>We expect</dt><dd>${esc(x.e)}</dd></div><div><dt>Measured by</dt><dd>${esc(x.m)}</dd></div><div class="wrong"><dt>Wrong if</dt><dd>${esc(x.w)}</dd></div></dl>
          <div class="anchor">${anchor(x.a)}</div>
        </div></article>`).join('')}</div>`;
  }

  /* ───────── 08 · appendix ───────── */
  function renderAppendix() {
    const sev = { 4: 6, 3: 34, 2: 34, 1: 5 }, total = 79;   /* desk 34 · akte 45 */
    const top8 = [
      { b: 'One truth for “waiting on you”', p: 'The entry screen said nothing needed confirming while other screens listed open items — including a clinical suggestion.', l: ['desk.html', 'P', 'Wartet auf Sie'] },
      { b: 'Make the canvas the product', p: 'Sprachstart was a static three-column launcher, not the canvas where only what you ask for appears.', l: ['desk.html', 'K0', 'Desk'] },
      { b: 'Make listening visible — and consented', p: 'The orb had no states, and “MIKRO · DE” did not say whether a consultation was being recorded, or for whom.', l: ['desk.html', 'C&t=336', 'Mitschrift', 'C'] },
      { b: 'Keep the patient in view while acting', p: 'With a chart open, the patient slot in the top bar was empty — a voice command had no visible target.', l: ['desk.html', 'K0', 'Identity pill'] },
      { b: 'Put allergies where decisions happen', p: 'The banner had no CAVE slot; allergies lived in another tab while an NSAID was active.', l: ['akte.html', 'pre', 'CAVE zone'] },
      { b: 'Replace “OK” with meaning', p: 'Every Kartei row, lab values included, wore the same green OK — it read as “result normal”.', l: ['akte.html', 'post', 'Flags at the value'] },
      { b: 'Received is not reviewed', p: 'Befunde had no workflow state: no way to see who reviewed a report, or whether anything had to happen.', l: ['akte.html', 'post', 'Vidieren'] },
      { b: 'Give AI proposals one home', p: 'A proposal waiting for sign-off was a passive table row without an action, invisible from the Kartei.', l: ['desk.html', 'F', 'Freigabe'] },
    ];
    /* what the working prototype already does — stated as it is, not as it came to be */
    const inside = [
      ['A clinically sound storyline', 'Checked with a GP: Ferritin ordered 14.08., drawn 24.09., discussed in the consultation, referral to gastroscopy and colonoscopy, PPI continued until the work-up is done.'],
      ['Austrian practice reality', `Dekurs/Status vocabulary, Leistungen, ICD per contact day, a waiting-room queue with walk-ins, and action Kürzel (${D.kuerzel.filter((k) => k.action).map((k) => k.k).join(', ')}).`],
      ['One genuine ambiguity, resolved once', '„nächsten Dienstag“ sets Termin and eAUM together; patient identity resolves from context instead of asking.'],
      ['Freigabe as review-by-deciding', 'Only uncertain fields need a tap, one seal-and-send gesture, a hold before transmission — and no fake undo after external sends. Tier 1 is a task handoff with undo.'],
      ['Provenance per field', 'gehört · aus Akte · abgeleitet · Standard — and the AI flags its own possible slip („rechtsbetont“).'],
      ['Safety around the microphone', 'Patient-bound desks, an identity check at consultation start, visible mic states, stated transcript retention and an objection path.'],
      ['One visual system for both screens', 'Poppins, black at 100 / 60 / 40 %, single-layer white glass on a pastel field, a top navigation pill with round controls, outlined status pills, a white primary pill, the opaque black capsule with context chips, the patient’s photo wherever identity matters, and blue / orange / red as the only signals.'],
      ['Engineering', 'A scene machine with deep links, deterministic layouts, a shared shell, a light blur that deepens only when a card lifts over another, an Esc stack, safe push-to-talk (⌥ alone ≥ 200 ms, never in text fields) and a story handoff from Desk to Akte.'],
    ];
    const next = [
      ['DPIA before any pilot', 'A data-protection impact assessment for ambient documentation, owned with the first practices.', []],
      ['EU hosting for speech and language models', 'Speech recognition and LLM processing inside the EU; audio deleted after transcription, transcript kept 30 days for evidence — as the prototype states.', ['noelia']],
      ['Consent for minors and interpreters', 'Who is informed, who may object, and how the Mitschrift behaves when a third person speaks for the patient.', ['kettering']],
      ['Carrier-specific eAUM checks', 'ÖGK, BVAEB and SVS rules differ; backdating beyond one working day needs a reason.', ['oegkAu']],
      ['Qualify the clinical-hint lane', 'Assess the NSAR/Ferritin-style hints against MDR Rule 11 before they ship; keep lane 1 free of new clinical inference.', ['mdcg']],
      ['Art. 50 marking from day one', 'Machine-readable provenance on every AI-drafted text, surviving export and Patientenkopie (§ 51 ÄrzteG).', ['art50', 'ris51']],
    ];
    const allKeys = SRC_GROUPS.reduce((a, g) => a.concat(g[1]), []);
    const nSrc = new Set(allKeys.map((k) => S[k][1])).size;
    const items = [
      { t: 'Audit summary', meta: `${total} verified findings · 2 screens`, body: `
        <p class="lead">We audited the two screens against the client’s own screenshots and the Austrian brief. We read the result as a map of opportunities, not a charge sheet — each one has an answer in the prototype.</p>
        <div class="sev" aria-hidden="true">${[4, 3, 2, 1].map((k) => `<i class="s${k}" style="width:${(sev[k] / total * 100).toFixed(2)}%"></i>`).join('')}</div>
        <div class="sev-l">${[4, 3, 2, 1].map((k) => `<span><i class="s${k}"></i>Severity ${k} · ${sev[k]}</span>`).join('')}<span>Sprachstart 34 · Karteikarte 45 (incl. cross-screen checks)</span></div>
        <ol class="top8">${top8.map((x) => `<li><b>${esc(x.b)}</b><p>${esc(x.p)}</p><div class="where">Answered in <a class="lnk" data-link="${x.l[0]}" data-hash="${x.l[1]}">${esc(x.l[2])} <code>${x.l[0]}#${esc(x.l[3] || x.l[1])}</code></a></div></li>`).join('')}</ol>` },
      { t: 'Research sources', meta: `${nSrc} sources · 4 tracks`, body: `<div class="srcgrid">${SRC_GROUPS.map(([g, ks]) => `<div><h4>${esc(g)} · ${ks.length}</h4><ol>${ks.map((k) => `<li><a href="${esc(S[k][1])}" target="_blank" rel="noopener">${esc(S[k][0])}</a><span class="h">${esc(S[k][1].replace(/^https?:\/\/(www\.)?/, '').split('/')[0])}</span></li>`).join('')}</ol></div>`).join('')}</div>` },
      { t: 'Inside the prototype', meta: 'what the demo already does', body: `<ul class="plist">${inside.map((x, i) => `<li><span class="k">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(x[0])}.</b> ${esc(x[1])}</span></li>`).join('')}</ul>` },
      { t: 'Datenschutz & Zulassung', meta: 'known next steps', body: `<ul class="plist">${next.map((x, i) => `<li><span class="k">${String(i + 1).padStart(2, '0')}</span><span><b>${esc(x[0])}.</b> ${esc(x[1])}${x[2].length ? `<span class="plist-src">${srcs(x[2])}</span>` : ''}</span></li>`).join('')}</ul>` },
      { t: 'Principles', meta: 'P1–P11 · every decision traces back', body: `<ul class="plist">${Object.entries(PR).map(([k, v]) => `<li><span class="k">${k}</span><span>${esc(v)}</span></li>`).join('')}</ul>` },
    ];
    $('[data-appendix]').innerHTML = items.map((x, i) => `
      <details><summary><span class="n">${String.fromCharCode(65 + i)}</span><h3>${esc(x.t)}</h3><span class="meta">${esc(x.meta)}</span><span class="chev">${I('chevron-down', 15)}</span></summary><div class="acc-body">${x.body}</div></details>`).join('');
  }

  /* ───────── typography: what belongs together stays on one line; a separator never ends or starts a line ─────────
     tidy()      binds number + unit, title + name, SV + number, "8. April", ratios, known names (no-break spaces)
     sepify()    turns every " · " into <span class="sx">&nbsp;·</span> — glued to the word before, so it can never start a line
     fixSeps()   where a line still breaks right after a separator, the separator becomes a clean line break (.sx.brk)
     Runs after render, after fonts, on resize, and when a <details> opens. */
  const NB = ' ';
  const NAMES = Array.from(new Set([P.name, D.practice.doctor.name, D.practice.assistant.name].concat((D.waiting || []).map((w) => w.name)))).filter((n) => / /.test(n));
  const BIND = [
    [/(\d) (?=(?:px|ms|s|%|h|J\.|Min|min|mg|g\/dl|mg\/dl|ng\/ml|Stk\.|Dokumente|Entscheidungen)(?![\p{L}\d]))/gu, '$1' + NB],
    [/(\d) ([:×]) (?=\d)/g, '$1' + NB + '$2' + NB],
    [/(^|[\s(„“"])(§§?|Art\.|Dr\.|Fr\.|Hr\.|Herr|Herrn|Frau|SV|Termin|Labor|Tier|Screen|scene|mod) (?=[\p{L}\d„*#])/gu, '$1$2' + NB],
    [/(^|[\s(„“"])([A-ZÄÖÜ]\.) (?=[A-ZÄÖÜ][\p{Ll}])/gu, '$1$2' + NB],
    [/(\d{1,2}\.) (?=(?:Jan|Feb|Mär|März|Apr|April|Mai|Jun|Juni|Jul|Juli|Aug|August|Sep|Sept|September|Okt|Oct|October|Nov|November|Dez|Dec|December)(?![\p{L}]))/gu, '$1' + NB],
    [/(\d) (?=\d{6}(?!\d))/g, '$1' + NB],
    [/ → /g, ' →' + NB],
    [/CAVE nicht erhoben/g, 'CAVE' + NB + 'nicht' + NB + 'erhoben'],
  ];
  const tidy = (t) => { let x = t; NAMES.forEach((n) => { x = x.split(n).join(n.replace(/ /g, NB)); }); BIND.forEach(([re, to]) => { x = x.replace(re, to); }); return x; };
  const TYPO = '.dc-body p, .fl p, .flow-head p, .ba-note, .at td, .rules p, .rf li, .au p, .au-body .cat, .tl-i p, .mx dd, .mx .anchor, .plist li, .top8 p, .acc-body .lead, .verb p, .verb .hint, .rcpt .tx, .foot .fine, .cv-meta, .cv-sub, .pull, .foot-note, .sev-l, .sil-note span, .pr .rl span, .srcgrid li, .legend';
  const SKIP = 'code, svg, .sx, .src, .lnk, .ptag, .dc-el, .st, .ui-tier, .ui-state, .kb, .gl, .k';
  function sepify(root) {
    const scopes = root.matches && root.matches(TYPO) ? [root] : $$(TYPO, root);
    scopes.forEach((scope) => {
      const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
      const nodes = []; while (w.nextNode()) nodes.push(w.currentNode);
      nodes.forEach((n) => {
        const t = tidy(n.nodeValue);
        if (!/ · /.test(t)) { if (t !== n.nodeValue) n.nodeValue = t; return; }
        const frag = document.createDocumentFragment();
        t.split(/ · /).forEach((part, i) => {
          if (i) { const sx = document.createElement('span'); sx.className = 'sx'; sx.setAttribute('aria-hidden', 'true'); sx.textContent = NB + '·'; frag.appendChild(sx); frag.appendChild(document.createTextNode(' ' + part)); }
          else frag.appendChild(document.createTextNode(part));
        });
        n.parentNode.replaceChild(frag, n);
      });
    });
  }
  /* the first visible character after a separator (text or element) */
  function nextCharRect(sx) {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); w.currentNode = sx.lastChild || sx;
    const block = sx.parentElement.closest(TYPO) || sx.parentElement;
    while (w.nextNode()) {
      const n = w.currentNode; if (!block.contains(n)) return null;
      const i = n.nodeValue.search(/\S/); if (i < 0) continue;
      const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1); const b = r.getBoundingClientRect();
      return b.width || b.height ? b : null;
    }
    return null;
  }
  function fixSeps(root) {
    const list = $$('.sx', root || document); list.forEach((x) => x.classList.remove('brk'));
    list.forEach((x) => {
      const a = x.getBoundingClientRect(); if (!a.width && !a.height) return;   /* not rendered (closed <details>) */
      const b = nextCharRect(x); if (b && b.top > a.top + a.height * 0.5) x.classList.add('brk');
    });
  }
  function initTypo() {
    sepify(document.body); fixSeps();
    let t = 0; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => fixSeps(), 120); });
    $$('.acc details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) fixSeps(d); }));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fixSeps());
  }

  /* ───────── reveal, scrollspy, tooltips, keys ───────── */
  let reveal = null;
  function initReveal() {
    if (reduced() || !('IntersectionObserver' in window)) { $$('.rv').forEach((el) => el.classList.add('in')); return; }
    reveal = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); reveal.unobserve(en.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv').forEach((el) => reveal.observe(el));
  }
  function initSpy() {
    const links = $$('.hb-nav a'); const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { links.forEach((a) => a.removeAttribute('aria-current')); const a = map.get(en.target.id); if (a) a.setAttribute('aria-current', 'true'); } }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => io.observe(s));
    const cover = $('.cv'); new IntersectionObserver((ents) => { if (ents[0].isIntersecting) links.forEach((a) => a.removeAttribute('aria-current')); }, { rootMargin: '-45% 0px -50% 0px' }).observe(cover);
  }
  function initTips() {
    const tip = $('[data-tip]');
    const show = (el) => { const k = el.dataset.p; tip.innerHTML = `<b>${k}</b><span class="tip-t">${esc(PR[k])}</span>`; sepify(tip.querySelector('.tip-t')); const r = el.getBoundingClientRect(); tip.classList.add('on'); fixSeps(tip);
      const w = tip.offsetWidth, h = tip.offsetHeight; const x = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12); let y = r.top - h - 8; if (y < 80) y = r.bottom + 8; tip.style.left = x + 'px'; tip.style.top = y + 'px'; };
    const hide = () => tip.classList.remove('on');
    document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-p]'); if (el) show(el); else hide(); });
    document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-p]'); if (el) show(el); });
    document.addEventListener('focusout', hide); addEventListener('scroll', hide, { passive: true });
  }
  function initKeys() {
    addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test((e.target && e.target.tagName) || '')) return;
      if ($('[data-lb]') && $('[data-lb]').open) return;
      const a = e.key === '1' ? $('[data-open="1"]') : e.key === '2' ? $('[data-open="2"]') : null;
      if (a) { e.preventDefault(); location.href = a.href; }
    });
  }

  /* ───────── boot ───────── */
  /* every step is isolated: one failing section never blanks the page (all reveals are forced visible instead) */
  let failed = false;
  const safe = (fn) => { try { const r = fn(); if (r && r.catch) r.catch((e) => console.error('[hub]', e)); } catch (e) { failed = true; console.error('[hub]', e); } };
  [renderCover, renderHero, renderThesis, () => renderBA('desk'), renderFlow, () => renderBA('akte'), renderAutonomy, renderGlass, renderAustria, renderLanes, renderMetrics, renderAppendix,
    refreshLinks, initTypo, initReveal, initSpy, initTips, initKeys, initLightbox, heroTilt, watchBA].forEach(safe);
  if (failed) $$('.rv').forEach((el) => el.classList.add('in'));
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(layoutLanes);
  window.DoclineHub = { blocks, contrast: contrastRows };
})();
