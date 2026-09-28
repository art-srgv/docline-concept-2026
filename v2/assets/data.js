/* Docline prototype — shared fictional dataset (single source of truth for desk.html, akte.html, index.html).
   "Today" = Montag, 28.09.2026 · Kassenpraxis (PVE) · Dr. Johannes Berger (Allgemeinmedizin) · Zimmer 2.
   Story (clinically reviewed by a GP lens):
   - Ali Demir (49, turns 50 on 11.10.) · Reflux K21.9 on Pantoprazol since 06/2026 · Kreuzschmerz M54.5 · works in a warehouse (ÖBB Rail Cargo → BVAEB).
   - 14.08.: before the planned PPI reduction the doctor ordered labs (BB, Ferritin, Krea, CRP). Blood drawn 24.09. by the assistant.
   - 25.09.: lab report arrives: Ferritin 22 ng/ml (L), Hb slightly drifting. ELGA e-Medikation shows OTC Ibuprofen (19.09.) on top of prescribed Naproxen.
   - The system connects the dots before the visit (iron deficiency + 2 NSAR + reflux). In the consultation the doctor discusses it,
     stops Ibuprofen, keeps Pantoprazol until work-up, refers to gastroscopy/colonoscopy, certifies sick leave until "nächsten Dienstag"
     (ambiguous → resolved once for eAUM end + Termin).
   All persons and data are fictional. */

window.DOCLINE = {
  version: 3,
  now: { iso: '2026-09-28T09:45', weekday: 'Montag', date: '28.09.2026', time: '09:45', long: 'Montag, 28. September', quarter: 'Q3/2026' },

  practice: {
    name: 'PVE Wien-Mitte', room: 'Zimmer 2', kind: 'Kassenpraxis (ÖGK · BVAEB · SVS)',
    doctor: { name: 'Dr. Johannes Berger', short: 'Dr. Berger', initials: 'JB', role: 'Arzt', fach: 'Allgemeinmedizin', photo: 'assets/img/dr-berger.png' },
    assistant: { name: 'Sabine Wagner', short: 'S. Wagner', initials: 'SW', role: 'Ordinationsassistenz' },
  },

  /* System / service layer — permanently visible (brief ch.14). 'GINO' = e-card reader. */
  services: [
    { id: 'ecard', label: 'e-card-System', detail: 'GINO bereit · Anspruchsprüfung online', state: 'ok' },
    { id: 'elga', label: 'ELGA', detail: 'e-Befunde & e-Medikation erreichbar', state: 'ok' },
    { id: 'lab', label: 'Laborschnittstelle', detail: 'DaMe · letzte Übertragung 07:58', state: 'ok' },
    { id: 'abs', label: 'ABS / eKOS', detail: 'Bewilligungsservice erreichbar', state: 'ok' },
  ],

  patient: {
    id: 'p-ali-demir', firstName: 'Ali', lastName: 'Demir', name: 'Ali Demir', salutation: 'Hr. Demir', initials: 'AD',
    sex: 'm', sexLabel: 'männlich', dob: '11.10.1976', age: 49, turns50: '11.10.2026',
    photo: 'assets/img/patient-demir.png',   /* fictional patient portrait — UI falls back to initials */
    svnr: '1235 111076',                 /* LLL-P-TTMMJJ, mod-11 check digit verified (sum 104 → 5) */
    carrier: { short: 'BVAEB', long: 'Versicherungsanstalt öffentlich Bediensteter, Eisenbahnen und Bergbau', note: 'Behandlungsbeitrag 20 % — wird von der BVAEB im Nachhinein vorgeschrieben' },
    occupation: 'Lagerarbeiter · ÖBB Rail Cargo', phone: '+43 660 481 22 09', address: 'Wohnadresse lt. Stammdaten',
    fall: { code: 'RF', label: 'Regelfall', since: '23.07.2026', contactsThisQuarter: 4 },
    ecard: { state: 'present', source: 'e-card (Karte)', time: '09:31', by: 'S. Wagner', entitlement: 'Anspruch bestätigt', carrierConfirmed: 'BVAEB' },
    /* ELGA: only two observable states exist for a GDA — access (with expiry per module) or "keine Daten verfügbar" (cause not visible). */
    elga: { access: 'granted', until: '27.12.2026', daysLeft: 90,
      modules: [ { id: 'befunde', label: 'e-Befunde', until: '27.12.2026' }, { id: 'emed', label: 'e-Medikation', until: '27.12.2026' }, { id: 'impf', label: 'e-Impfpass', until: '26.10.2026' } ],
      logged: 'Zugriffe werden unter Dr. Berger protokolliert und sind für den Patienten einsehbar (§ 22 GTelG)' },
    consent: { ambient: 'informed', label: 'Mitschrift: informiert', by: 'S. Wagner', at: '09:31', note: 'Pat. informiert, kein Widerspruch · Widerspruch jederzeit möglich' },
    cave: { pre: { state: 'missing', label: 'Allergien nicht erhoben' }, post: { state: 'none', label: 'Keine bekannten Allergien', at: '28.09.2026', by: 'Dr. Berger' } },
    problems: [
      { code: 'K21.9', label: 'Gastroösophageale Refluxkrankheit', since: '06/2026', kind: 'Dauerdiagnose' },
      { code: 'M54.5', label: 'Kreuzschmerz', since: '04/2026', kind: 'Dauerdiagnose' },
    ],
    due: [
      { id: 'vu', text: 'Wird am 11.10. 50 — Vorsorgekoloskopie anbieten', kind: 'Vorsorge' },
      { id: 'flu', text: 'Influenza-Impfung Saison 2026/27 · e-Impfpass', kind: 'Impfung' },
    ],
    openLoops: [
      { id: 'ortho', text: 'Überweisung Orthopädie (25.06.) — kein Rückbefund', since: '25.06.2026', kind: 'Überweisung' },
    ],
    appointment: { time: '09:40', reason: 'Kontrolle Reflux · Laborbesprechung', arrived: '09:31', kind: 'Termin' },
    lastConsultation: { date: '14.08.2026', by: 'Dr. Berger', summary: 'Sodbrennen gebessert, Kreuzschmerz. Labor vor geplanter PPI-Reduktion angeordnet.' },
  },

  medications: [
    { id: 'm1', group: 'Dauer', name: 'Pantoprazol', strength: '20 mg', form: 'Tabletten', dose: '1-0-0', since: '08.06.2026', indication: 'K21.9', status: 'aktiv',
      chain: { steps: ['Anfrage', 'Entwurf', 'signiert', 'übermittelt', 'eingelöst'], pre: 4, post: 3 }, lastRx: { pre: '14.08.2026 · eingelöst 16.08.', post: 'heute 09:53 · übermittelt' } },
    { id: 'm2', group: 'Bei Bedarf', name: 'Naproxen', strength: '250 mg', form: 'Tabletten', dose: 'bei Bedarf, max. 2×/Tag', since: '23.07.2026', indication: 'M54.5', status: 'aktiv' },
    { id: 'm3', group: 'Extern', name: 'Ibuprofen', strength: '400 mg', form: 'Tabletten', dose: 'rezeptfrei', since: '19.09.2026', status: 'extern', source: 'ELGA e-Medikation · Apotheke zum Hirschen', post: 'abgesetzt · Pat. informiert 28.09.' },
  ],
  hint: {
    id: 'h-nsar', text: '2 NSAR gleichzeitig: Naproxen + Ibuprofen (rezeptfrei, e-Medikation 19.09.)',
    relevance: 'Relevant bei Refluxkrankheit und neuem Eisenmangel.', decision: 'Entscheidung bei Ihnen.',
    resolvedPost: 'Im Gespräch besprochen · 01:02 · Ibuprofen abgesetzt',
  },

  /* Labs: three draws. CRP in mg/dl as common in Austrian labs (confirm with client). series newest last. */
  labs: {
    draws: [
      { id: 'lab-1704', date: '17.04.2026', source: 'Labor Mitte · Laborschnittstelle (DaMe)', reviewed: { by: 'Dr. Berger', at: '20.04.2026 · 08:10', outcome: 'Kontrolle vereinbart' } },
      { id: 'lab-1408', date: '14.08.2026', source: 'Labor Mitte · Laborschnittstelle (DaMe)', reviewed: { by: 'Dr. Berger', at: '14.08.2026 · 17:05', outcome: 'Keine Aktion nötig' } },
      { id: 'lab-2509', date: '25.09.2026', source: 'Labor Mitte · Laborschnittstelle (DaMe) · auch in ELGA — Duplikat zusammengeführt', drawn: '24.09.2026 · S. Wagner', received: '25.09.2026 · 16:12', ordered: 'Dr. Berger · 14.08.' },
    ],
    analytes: [
      { key: 'Ferritin', unit: 'ng/ml', ref: '30–400', refMin: 30, refMax: 400, dec: 0, series: [ { d: '25.09.2026', v: 22, flag: 'L', isNew: true } ] },
      { key: 'Hämoglobin', unit: 'g/dl', ref: '13,5–17,5', refMin: 13.5, refMax: 17.5, dec: 1, series: [ { d: '17.04.2026', v: 14.6 }, { d: '14.08.2026', v: 14.4 }, { d: '25.09.2026', v: 14.0 } ] },
      { key: 'Kreatinin', unit: 'mg/dl', ref: '0,7–1,2', refMin: 0.7, refMax: 1.2, dec: 2, series: [ { d: '17.04.2026', v: 0.98 }, { d: '14.08.2026', v: 1.0 }, { d: '25.09.2026', v: 1.02 } ], derived: { key: 'eGFR', unit: 'ml/min/1,73 m²', v: 86 } },
      { key: 'CRP', unit: 'mg/dl', ref: '< 0,5', refMax: 0.5, dec: 2, series: [ { d: '17.04.2026', v: 0.84, flag: 'H' }, { d: '14.08.2026', v: 0.41 }, { d: '25.09.2026', v: 0.21 } ] },
    ],
  },
  vitals: [
    { label: 'Blutdruck', value: '135/85', unit: 'mmHg', date: 'heute', source: 'KI-Entwurf', post: true },
    { label: 'Blutdruck', value: '132/84', unit: 'mmHg', date: '14.08.2026', source: 'S. Wagner' },
    { label: 'Gewicht', value: '88,0', unit: 'kg', date: '14.08.2026', source: 'S. Wagner' },
  ],

  /* Karteikarte (Kartei) — quarter → contact day. k = Kürzel. Dekurs = running visit note (Austrian usage). */
  record: [
    { quarter: 'Q3/2026', summary: 'RF seit 23.07. · 4 Kontakte', days: [
      { id: 'd-2509', date: 'Fr 25.09.2026', kind: 'labor', title: 'Laborbefund', drawId: 'lab-2509' },
      { id: 'd-2409', date: 'Do 24.09.2026', kind: 'kontakt', title: 'Blutabnahme', by: 'S. Wagner', entries: [
        { k: 'not', text: 'Blutabnahme lt. Anordnung 14.08. (BB, Ferritin, Krea, CRP) · an Labor Mitte', by: 'S. Wagner', time: '07:48' } ] },
      { id: 'd-1509', date: 'Di 15.09.2026', kind: 'kontakt', title: 'Telefonat', by: 'S. Wagner', entries: [
        { k: 'kom', text: 'Pat. ruft an: Rücken wieder schlechter. Blutabnahme 24.09. und Kontrolle 28.09. vereinbart.', by: 'S. Wagner', time: '10:14' } ] },
      { id: 'd-1408', date: 'Fr 14.08.2026', kind: 'konsultation', title: 'Konsultation', by: 'Dr. Berger', duration: '12 Min', icd: ['M54.5', 'K21.9'], leistungen: 2, entries: [
        { k: 'dek', text: 'Sodbrennen unter Pantoprazol dtl. gebessert, nachts selten. Seit 3 Wo. LWS-Schmerz nach Heben im Lager.', by: 'Dr. Berger', time: '10:32',
          correction: { original: 'Sodbrennen unter Pantoprazol dtl. gebessert, nachts selten. Seit 3 Mon. LWS-Schmerz nach Heben im Lager.', at: '14.08.2026 · 10:40', by: 'Dr. Berger', reason: 'Tippfehler (Wo. statt Mon.)' } },
        { k: 'vit', text: 'RR 132/84 mmHg · Puls 72/min · Gewicht 88,0 kg', by: 'S. Wagner', time: '10:21' },
        { k: 'sta', text: 'LWS paravertebral dolent, Lasègue bds. neg., Kraft/Sens. seitengleich.', by: 'Dr. Berger', time: '10:36' },
        { k: 'dia', text: 'M54.5 Kreuzschmerz · K21.9 Refluxkrankheit (bekannt)', by: 'Dr. Berger', time: '10:38' },
        { k: 'the', text: 'Bewegungsprogramm (Physio-Handout). Vor PPI-Reduktion Labor: BB, Ferritin, Krea, CRP. Kontrolle Ende 09.', by: 'Dr. Berger', time: '10:41' },
        { k: 'rez', text: 'e-Rezept Pantoprazol 20 mg · 1 OP', by: 'Dr. Berger', time: '10:43', system: 'übermittelt · REZ-ID 5TQ2-8LMA-33KD · eingelöst 16.08.' } ] },
      { id: 'd-1408l', date: 'Fr 14.08.2026', kind: 'labor', title: 'Laborbefund', drawId: 'lab-1408' },
      { id: 'd-2307', date: 'Do 23.07.2026', kind: 'konsultation', title: 'Konsultation', by: 'Dr. Berger', duration: '9 Min', icd: ['M54.5'], leistungen: 1, entries: [
        { k: 'dek', text: 'Belastungsabhängiger Kreuzschmerz nach Heben im Lager, keine Ausstrahlung.', by: 'Dr. Berger', time: '11:02' },
        { k: 'rez', text: 'e-Rezept Naproxen 250 mg · b. Bed., max. 2×/Tag', by: 'Dr. Berger', time: '11:09', system: 'übermittelt · REZ-ID 7Q2M-94KD-1XPA · eingelöst 23.07.' } ] },
    ]},
    { quarter: 'Q2/2026', summary: 'RF · 3 Kontakte', days: [
      { id: 'd-2506', date: 'Do 25.06.2026', kind: 'konsultation', title: 'Konsultation', by: 'Dr. Berger', duration: '15 Min', icd: ['M54.5'], leistungen: 3, entries: [
        { k: 'dek', text: 'Akute Lumbalgie, keine Ausstrahlung, keine Red Flags.', by: 'Dr. Berger', time: '09:12' },
        { k: 'au', text: 'Krankenstand 25.06.–29.06.2026', by: 'Dr. Berger', time: '09:20', system: 'eAUM an BVAEB übermittelt · Arbeitgeber-Bestätigung an Pat. ausgehändigt' },
        { k: 'ueb', text: 'Überweisung Orthopädie · Fragestellung: therapieresistente Lumbalgie', by: 'Dr. Berger', time: '09:22', system: 'gültig bis 25.09.2026 · kein Rückbefund', loop: true } ] },
      { id: 'd-0806', date: 'Mo 08.06.2026', kind: 'konsultation', title: 'Konsultation', by: 'Dr. Berger', duration: '12 Min', icd: ['K21.9'], leistungen: 1, entries: [
        { k: 'dek', text: 'Sodbrennen seit 2 Mon., nachts betont. Keine Dysphagie, kein Gewichtsverlust.', by: 'Dr. Berger', time: '08:44' },
        { k: 'dia', text: 'K21.9 Gastroösophageale Refluxkrankheit ohne Ösophagitis', by: 'Dr. Berger', time: '08:50' },
        { k: 'rez', text: 'e-Rezept Pantoprazol 20 mg · 1-0-0', by: 'Dr. Berger', time: '08:52', system: 'übermittelt · REZ-ID 3HF8-22LC-QW71 · eingelöst 08.06.' } ] },
      { id: 'd-1704', date: 'Fr 17.04.2026', kind: 'labor', title: 'Laborbefund', drawId: 'lab-1704' },
    ]},
  ],

  documents: [
    { id: 'doc1', title: 'Laborbefund 25.09. · Labor Mitte', type: 'Befund', source: 'Laborschnittstelle + ELGA', pages: 2, date: '25.09.2026' },
    { id: 'doc2', title: 'Laborbefund 14.08. · Labor Mitte', type: 'Befund', source: 'Laborschnittstelle', pages: 1, date: '14.08.2026' },
    { id: 'doc3', title: 'Überweisung Orthopädie · Dr. Berger', type: 'Ausgestellt', source: 'Docline', pages: 1, date: '25.06.2026' },
    { id: 'doc4', title: 'Laborbefund 17.04. · Labor Mitte', type: 'Befund', source: 'Laborschnittstelle', pages: 1, date: '17.04.2026' },
  ],

  /* Workflow layer for this patient */
  openItems: {
    pre: [
      { id: 'o1', text: 'Laborbefund 25.09. vidieren · Ferritin L', owner: 'Dr. Berger', state: 'Wartet auf Arzt', due: 'heute', clinical: true },
      { id: 'o2', text: 'Allergien erheben (CAVE)', owner: 'Dr. Berger', state: 'Offen', due: 'bei Konsultation', clinical: true },
      { id: 'o3', text: 'Überweisung Orthopädie: Rückbefund fehlt', owner: 'S. Wagner', state: 'Rückfrage offen', due: 'diese Woche', clinical: false },
    ],
    post: [
      { id: 'p1', text: '2 KI-Entwürfe prüfen (Dekurs, Status)', owner: 'Dr. Berger', state: 'Wartet auf Arzt', due: 'heute', clinical: true },
      { id: 'p2', text: 'Laborbefund 25.09. vidieren · im Gespräch besprochen', owner: 'Dr. Berger', state: 'Vidierung offen', due: 'heute', clinical: true },
      { id: 'p3', text: 'Termin Gastroskopie/Koloskopie vereinbaren', owner: 'S. Wagner', state: 'Offen', due: 'diese Woche', clinical: false },
      { id: 'p4', text: 'Kontrolle Di 06.10. · 10:00', owner: 'Dr. Berger', state: 'gebucht', due: '06.10.', clinical: false, done: true },
    ],
  },
  activity: {
    pre: [
      { t: '09:31', text: 'e-card gelesen · Anspruch bestätigt (BVAEB)', by: 'S. Wagner' },
      { t: '09:31', text: 'ELGA-Zugriff bis 27.12. · e-Medikation & e-Befunde abgefragt (automatisch bei Check-in, im Auftrag von Dr. Berger)', by: 'Docline' },
      { t: '09:31', text: 'Mitschrift: Pat. informiert, kein Widerspruch', by: 'S. Wagner' },
      { t: '25.09. 16:12', text: 'Laborbefund eingegangen · Dr. Berger zugewiesen', by: 'Laborschnittstelle' },
    ],
    post: [
      { t: '09:53', text: 'e-Rezept Pantoprazol signiert · an e-card-System übermittelt', by: 'Dr. Berger' },
      { t: '09:53', text: 'Überweisung Gastroenterologie signiert', by: 'Dr. Berger' },
      { t: '09:53', text: 'eAUM signiert · an BVAEB übermittelt · Diagnose M54.5 freigegeben', by: 'Dr. Berger' },
      { t: '09:53', text: 'Termin Di 06.10. 10:00 gebucht · Leistungen (2) erfasst · CAVE gespeichert', by: 'Docline im Auftrag von Dr. Berger' },
      { t: '09:53', text: 'Mitschrift beendet · Audio gelöscht · Transkript 30 Tage für Nachweise', by: 'Docline' },
      { t: '09:46', text: 'Konsultation gestartet · Identität bestätigt (Name + Geburtsdatum)', by: 'Dr. Berger' },
    ],
  },

  /* Doctor's clinical inbox (only items that need clinical judgement — brief ch.10). Realistic volume, grouped. */
  clinicalInbox: {
    groups: [
      { id: 'befunde', label: 'Befunde', count: 7, detail: '2 auffällig · 5 unauffällig', flagged: 2 },
      { id: 'rezepte', label: 'Rezeptanfragen', count: 5, detail: 'Dauermedikation' },
      { id: 'abs', label: 'ABS-Rückfrage', count: 1, detail: 'Frist 01.10.', urgent: true },
    ],
    top: [
      { id: 'i1', type: 'ABS-Rückfrage', patient: 'Eva Pichler', text: 'Dapagliflozin · Rückfrage des Chefarztes', state: 'Frist 01.10.', urgent: true },
      { id: 'i2', type: 'Befund', patient: 'Ali Demir', text: 'Labor 25.09. · Ferritin 22 ng/ml L', state: 'Ungeprüft', flagged: true },
      { id: 'i3', type: 'Rezeptanfrage', patient: 'Gerhard Maurer', text: 'Ramipril 5 mg · Wiederholung', state: 'telefonisch 08:05 · S. Wagner' },
    ],
  },
  assistantQueue: { count: 5, items: [
    'Hr. Maurer: Rezeptanfrage an Dr. Berger übergeben', 'Fr. Pichler: ABS-Unterlagen nachreichen', 'Hr. Demir: Rückbefund Orthopädie anfordern',
    'Hr. Steiner: e-card vergessen — Ersatzbeleg, Nacherfassung', 'Visite 12:30 vorbereiten (Fr. Fuchs)' ] },

  /* Waiting room queue (Kassenpraxis reality: walk-ins + appointments). Anliegen captured at the front desk. */
  waiting: [
    { name: 'Ali Demir', age: 49, arrived: '09:31', anliegen: 'Kontrolle · Labor', termin: '09:40', ecard: true },
    { name: 'Karin Hofbauer', age: 63, arrived: '09:34', anliegen: 'nur Rezept', termin: null, ecard: true },
    { name: 'Stefan Brunner', age: 34, arrived: '09:35', anliegen: 'Akut · Fieber', termin: null, ecard: true },
    { name: 'Eva Pichler', age: 72, arrived: '09:38', anliegen: 'Vorsorgeuntersuchung', termin: '10:00', ecard: true },
    { name: 'Mario Kovač', age: 41, arrived: '09:39', anliegen: 'Krankenstand-Verlängerung', termin: null, ecard: true },
    { name: 'Anna Gruber', age: 58, arrived: '09:40', anliegen: 'Medikamentenbesprechung', termin: '10:20', ecard: true },
    { name: 'Leopold Steiner', age: 80, arrived: '09:41', anliegen: 'Befundbesprechung', termin: null, ecard: false, ecardNote: 'e-card vergessen · Ersatzbeleg' },
    { name: 'Jasmin Aydın', age: 27, arrived: '09:41', anliegen: 'nur Überweisung', termin: null, ecard: true },
    { name: 'Clara Novak', age: 17, arrived: '09:45', anliegen: 'Sportattest', termin: '10:40', ecard: true },
  ],
  dayStats: { termine: 22, erledigt: 11, visite: '12:30 Visite · Fr. Fuchs', naechsteLuecke: '12:10' },

  /* Patients for search / disambiguation */
  patients: [
    { name: 'Ali Demir', dob: '11.10.1976', age: 49, carrier: 'BVAEB', context: 'im Wartezimmer · Termin 09:40' },
    { name: 'Mehmet Demir', dob: '03.02.1951', age: 75, carrier: 'ÖGK', context: 'letzter Besuch 02.07.2026' },
    { name: 'Anna Gruber', dob: '14.02.1968', age: 58, carrier: 'ÖGK', context: 'im Wartezimmer · Termin 10:20' },
    { name: 'Eva Pichler', dob: '21.04.1954', age: 72, carrier: 'ÖGK · Zusatz Uniqa', context: 'im Wartezimmer · Termin 10:00' },
    { name: 'Franziska Kern', dob: '18.11.1965', age: 60, carrier: 'BVAEB · Zusatz Allianz', context: 'Laborbefund offen' },
    { name: 'Gerhard Maurer', dob: '02.05.1958', age: 68, carrier: 'ÖGK', context: 'Rezeptanfrage offen' },
    { name: 'Markus Huber', dob: '03.09.1981', age: 45, carrier: 'SVS', context: 'letzter Besuch 21.09.2026' },
  ],

  /* Ambient consultation (Desk scene C). t = seconds since start (real consultation time; playback is accelerated).
     who: 'arzt' | 'patient'. dictation: doctor dictates to the system (Status). span = phrase that produced the fact (for highlight + flight). */
  consultation: {
    start: '09:46', end: '09:53', durationSec: 400,
    identity: 'Im Raum: Ali Demir · *11.10.1976 — bestätigt',
    speakers: { arzt: 'Dr. Berger', patient: 'Hr. Demir' },
    transcript: [
      { id: 't1', t: 5,   who: 'arzt',    text: 'Grüß Gott, Herr Demir. Wie geht’s dem Magen?' },
      { id: 't2', t: 14,  who: 'patient', text: 'Das Sodbrennen ist viel besser. Aber der Rücken ist seit zwei Wochen wieder schlimmer.',
        facts: [ { id: 'f1', group: 'Beschwerden', text: 'Sodbrennen dtl. gebessert', span: 'Sodbrennen ist viel besser' }, { id: 'f2', group: 'Beschwerden', text: 'LWS-Schmerz seit 2 Wo. verstärkt', span: 'seit zwei Wochen wieder schlimmer' } ] },
      { id: 't3', t: 40,  who: 'arzt',    text: 'Nehmen Sie etwas dagegen?' },
      { id: 't4', t: 44,  who: 'patient', text: 'Das Naproxen – und letzte Woche hab ich mir in der Apotheke noch Ibuprofen geholt.',
        facts: [ { id: 'f3', group: 'Medikation', text: 'Ibuprofen rezeptfrei · deckt sich mit e-Medikation 19.09.', span: 'noch Ibuprofen geholt', hint: true } ] },
      { id: 't5', t: 62,  who: 'arzt',    text: 'Bitte nicht beides. Das Ibuprofen lassen Sie weg, Naproxen nur, wenn es gar nicht anders geht.',
        facts: [ { id: 'f4', group: 'Procedere', text: 'Ibuprofen absetzen · Naproxen nur b. Bed.', span: 'Ibuprofen lassen Sie weg' } ], resolves: 'h-nsar' },
      { id: 't6', t: 108, who: 'arzt',    text: 'Ihr Eisenwert ist niedrig. Mit den Schmerzmitteln müssen wir uns den Magen-Darm-Trakt anschauen – ich überweise Sie zur Magen- und Darmspiegelung.',
        facts: [ { id: 'f5', group: 'Befund', text: 'Ferritin 22 ng/ml (L) besprochen', span: 'Eisenwert ist niedrig' }, { id: 'f6', group: 'Procedere', text: 'Überweisung Gastroskopie + Koloskopie', span: 'Magen- und Darmspiegelung' } ], actions: [ 'ueberweisung' ], befundDiscussed: true },
      { id: 't7', t: 140, who: 'arzt',    text: 'Das Pantoprazol nehmen Sie bis dahin weiter, eine Tablette in der Früh. Ich schreib Ihnen eine Packung auf.',
        facts: [ { id: 'f7', group: 'Procedere', text: 'Pantoprazol 20 mg 1-0-0 bis Abklärung', span: 'eine Tablette in der Früh' } ], actions: [ 'rezept' ] },
      { id: 't8', t: 185, who: 'arzt',    text: 'Haben Sie Allergien auf Medikamente?' },
      { id: 't9', t: 188, who: 'patient', text: 'Nein, keine.',
        facts: [ { id: 'f8', group: 'Befund', text: 'Keine bekannten Allergien (Pat. verneint)', span: 'Nein, keine' } ], actions: [ 'cave' ] },
      { id: 't10', t: 250, who: 'arzt', dictation: true, text: 'Status: LWS paravertebral druckschmerzhaft, Lasègue beidseits negativ, Kraft und Sensibilität seitengleich, keine Red Flags. Blutdruck 135 zu 85.',
        facts: [ { id: 'f9', group: 'Status', text: 'LWS dolent · Lasègue bds. neg. · keine Red Flags', span: 'Lasègue beidseits negativ' }, { id: 'f10', group: 'Werte', text: 'RR 135/85 mmHg', span: 'Blutdruck 135 zu 85' } ], actions: [ 'kartei' ] },
      { id: 't11', t: 320, who: 'patient', text: 'Ich arbeite im Lager, heben geht diese Woche nicht.',
        facts: [ { id: 'f11', group: 'Beschwerden', text: 'Arbeitsbezug erwähnt (Heben im Lager)', span: 'arbeite im Lager' } ] },
      { id: 't12', t: 331, who: 'arzt',    text: 'Dann schreib ich Sie bis nächsten Dienstag krank – da sehen wir uns um zehn zur Kontrolle.',
        facts: [ { id: 'f12', group: 'Procedere', text: 'Krankenstand bis „nächsten Dienstag“', span: 'bis nächsten Dienstag krank' }, { id: 'f13', group: 'Procedere', text: 'Kontrolle „nächsten Dienstag, 10 Uhr“', span: 'um zehn zur Kontrolle' } ], actions: [ 'eaum', 'termin' ], ambiguity: true },
      { id: 't13', t: 362, who: 'arzt',    text: 'Und die Übungen aus dem Bewegungsprogramm bitte weitermachen.',
        facts: [ { id: 'f14', group: 'Procedere', text: 'Bewegungsprogramm fortsetzen', span: 'Bewegungsprogramm' } ], actions: [ 'leistungen' ] },
    ],
    /* The one genuine ambiguity: resolves Termin + eAUM end together. */
    ambiguity: { heard: '„nächsten Dienstag“', options: [ { id: 'next', label: 'Di 06.10.', detail: 'Dienstag nächster Woche', recommended: true }, { id: 'tomorrow', label: 'Di 29.09.', detail: 'morgen' } ] },

    /* Proposals. tier 1 = act + undo · 2 = pre-accepted draft (removable) · 3 = signature (doctor only, never in assistant UI).
       Field provenance: 'gehört' (quote+speaker+time) · 'aus Akte' · 'abgeleitet' (needs a choice/confirm) · 'Standard'. */
    actions: {
      rezept: { tier: 3, type: 'e-Rezept', icon: 'pill', title: 'Pantoprazol 20 mg Tabletten', evidence: { t: 140, who: 'Dr. Berger', quote: '…eine Tablette in der Früh. Ich schreib Ihnen eine Packung auf.' },
        fields: [
          { label: 'Wirkstoff', value: 'Pantoprazol', prov: 'gehört' },
          { label: 'Stärke', value: '20 mg', prov: 'aus Akte' },
          { label: 'Dosierung', value: '1-0-0 bis Abklärung', prov: 'gehört' },
          { label: 'Packung', value: null, prov: 'abgeleitet', choose: [ '30 Stk. (1 OP)', '60 Stk. (1 OP)' ], hint: '„eine Packung“ — Größe nicht gesagt' },
          { label: 'ABS', value: 'nicht erforderlich', prov: 'Standard' },
          { label: 'e-Medikation', value: 'speichern', prov: 'Standard', toggleOff: 'Nicht speichern (situativer Widerspruch)' },
        ],
        result: 'An e-card-System übermittelt · REZ-ID 8K3F-2QW9-7HXT · Storno möglich bis Einlösung', system: 'e-card-System', failResult: 'Übermittlung ausstehend — e-Rezept-Code für Apotheke ausgedruckt · Nacherfassung offen' },
      ueberweisung: { tier: 3, type: 'Überweisung', icon: 'send', title: 'Gastroenterologie · Gastroskopie + Koloskopie', evidence: { t: 108, who: 'Dr. Berger', quote: '…ich überweise Sie zur Magen- und Darmspiegelung.' },
        fields: [
          { label: 'Fachrichtung', value: 'Gastroenterologie', prov: 'gehört' },
          { label: 'Fragestellung', value: 'Eisenmangel (Ferritin 22 ng/ml) unter NSAR-Einnahme · Refluxkrankheit', prov: 'abgeleitet', confirm: true, hint: 'aus Befund 25.09. + Gespräch' },
          { label: 'Gültigkeit', value: '3 Monate', prov: 'Standard' },
        ],
        result: 'Erstellt · für Patient abrufbar (MeineSV) · gültig bis 28.12.2026', system: 'e-card-System' },
      eaum: { tier: 3, type: 'eAUM · Krankenstand', icon: 'file', title: 'arbeitsunfähig ab 28.09.2026', evidence: { t: 331, who: 'Dr. Berger', quote: '…schreib ich Sie bis nächsten Dienstag krank…' },
        fields: [
          { label: 'Ende (voraussichtlich)', value: 'Di 06.10.2026', prov: 'gehört', ambiguity: true },
          { label: 'Diagnose', value: 'M54.5 Kreuzschmerz (Text + ICD) — nur an BVAEB', prov: 'abgeleitet', linked: 'dia', hint: 'wird mit der Signatur als Kontaktgrund freigegeben' },
          { label: 'Ursache', value: null, prov: 'abgeleitet', choose: [ 'Krankheit', 'Arbeitsunfall' ], hint: 'Pat. erwähnt Heben im Lager (05:20) · Unfallversicherung bei ÖBB-Bediensteten: BVAEB' },
          { label: 'Ausgehzeiten', value: null, prov: 'abgeleitet', choose: [ 'Ausgang erlaubt', 'Bettruhe' ], hint: 'nicht besprochen' },
          { label: 'Aufenthalt', value: 'Wohnadresse', prov: 'aus Akte' },
          { label: 'Arbeitgeber', value: 'Bestätigung ohne Diagnose — an Patient (Druck / MeineSV-App)', prov: 'Standard' },
        ],
        result: 'An BVAEB übermittelt · Arbeitgeber-Bestätigung (ohne Diagnose) gedruckt', system: 'BVAEB', failResult: 'e-card-System gestört — Übermittlung wird automatisch nachgeholt · Nacherfassung offen (Aufgabe S. Wagner)' },
      termin: { tier: 2, type: 'Termin', icon: 'calendar', title: 'Di 06.10.2026 · 10:00 · Kontrolle', detail: '20 Min · Dr. Berger · Slot reserviert (keine SMS bis Freigabe)', evidence: { t: 331, who: 'Dr. Berger', quote: '…da sehen wir uns um zehn zur Kontrolle.' }, ambiguity: true,
        result: 'Gebucht · SMS-Erinnerung am Vortag', system: 'Kalender' },
      cave: { tier: 2, type: 'CAVE', icon: 'shield', title: 'Keine bekannten Allergien', detail: 'erhoben 28.09.2026 · Dr. Berger', evidence: { t: 188, who: 'Hr. Demir', quote: 'Nein, keine.' },
        result: 'Gespeichert', system: 'Akte' },
      leistungen: { tier: 2, type: 'Leistungen', icon: 'euro', title: '2 vorgeschlagen', detail: 'Ordination (Grundleistung) · Ausstellung Krankenstandsbestätigung — Positionen lt. Honorarordnung BVAEB', evidence: { t: 331, who: 'Dr. Berger', quote: 'Konsultation + Krankenstand' },
        result: '2 Leistungen erfasst · Kontaktgrund M54.5', system: 'Abrechnung' },
      kartei: { tier: 2, type: 'Kartei · 2 KI-Entwürfe', icon: 'file', title: 'Dekurs + Status', detail: 'werden in der Akte geprüft und übernommen', evidence: { t: 250, who: 'Dr. Berger', quote: 'Status: LWS paravertebral druckschmerzhaft…' }, toAkte: true,
        drafts: [
          { k: 'dek', text: 'Sodbrennen dtl. gebessert. LWS-Schmerz seit 2 Wo. verstärkt, rechtsbetont; zusätzl. Ibuprofen OTC (e-Medikation 19.09.). Ferritin 22 ng/ml ↓ besprochen. Proc.: Ibuprofen ex, Naproxen nur b. Bed., Pantoprazol 20 mg 1-0-0 bis Abklärung, ÜW Gastroskopie + Koloskopie, KS bis 06.10., Kontrolle 06.10.',
            support: [ { span: 'rechtsbetont', prov: 'nicht gehört', note: 'nicht im Gespräch — vermutlich aus Kartei 14.08. übernommen. Bitte prüfen' } ] },
          { k: 'sta', text: 'LWS paravertebral dolent, Lasègue bds. neg., Kraft/Sens. seitengleich, keine Red Flags. RR 135/85 mmHg.', support: [] },
        ],
        result: 'In der Akte zur Prüfung', system: 'Akte' },
    },
    report: {
      title: 'Konsultation 09:46–09:53 · abgeschlossen',
      lines: [ 'e-Rezept Pantoprazol übermittelt', 'Überweisung Gastroenterologie erstellt', 'eAUM bis 06.10. an BVAEB', 'Kontrolle Di 06.10. 10:00 gebucht', 'CAVE: keine bekannten Allergien', '2 Leistungen · Kontaktgrund M54.5' ],
      handoff: [ 'Termin 06.10. 10:00 ✓', 'Arbeitgeber-Bestätigung drucken', 'Termin Gastroskopie/Koloskopie vereinbaren' ],
      pending: '2 KI-Entwürfe (Dekurs, Status) warten in der Akte',
    },
  },

  /* Tier-1 demo (explicit command → act + undo): doctor → assistant handoff */
  tier1: { utter: 'Aufgabe an Frau Wagner: Frau Kern wegen Laborbefund zurückrufen', receipt: 'Aufgabe an S. Wagner · Rückruf Fr. Kern (Laborbefund)', undoSec: 8 },

  /* ICD suggestions (e-Health-Codierservice style — always confirmed by the doctor) */
  icd: [
    { term: 'hexenschuss', label: 'akute Lumbalgie', code: 'M54.5' },
    { term: 'kreuzschmerz', label: 'Kreuzschmerz', code: 'M54.5' },
    { term: 'lumboischialgie', label: 'Lumboischialgie', code: 'M54.4' },
    { term: 'sodbrennen', label: 'Gastroösophageale Refluxkrankheit ohne Ösophagitis', code: 'K21.9' },
    { term: 'reflux', label: 'Gastroösophageale Refluxkrankheit ohne Ösophagitis', code: 'K21.9' },
    { term: 'eisenmangel', label: 'Eisenmangelanämie, nicht näher bezeichnet', code: 'D50.9' },
  ],

  /* Kartei entry types (Austrian terms) + keyboard-first Tagkürzel. action: true = Kürzel triggers a staged act (Tier 3), not just a note.
     doctorOnly = absent in the Assistenz UI (§ 9 MABG). assistantAs = what the assistant gets instead. */
  kuerzel: [
    { k: 'dek', label: 'Dekurs', doctorOnly: true },
    { k: 'ana', label: 'Anamnese', doctorOnly: false, assistantAs: 'Patientenangabe (zur ärztlichen Bestätigung)' },
    { k: 'sta', label: 'Status', doctorOnly: true },
    { k: 'dia', label: 'Diagnose', doctorOnly: true },
    { k: 'the', label: 'Therapie', doctorOnly: true },
    { k: 'vit', label: 'Vitalwerte', doctorOnly: false },
    { k: 'kom', label: 'Kommunikation', doctorOnly: false },
    { k: 'not', label: 'Notiz', doctorOnly: false },
    { k: 'rez', label: 'e-Rezept', doctorOnly: true, action: true, assistantAs: 'Rezeptanfrage an Dr. Berger' },
    { k: 'ueb', label: 'Überweisung', doctorOnly: true, action: true },
    { k: 'au',  label: 'Krankenstand (eAUM)', doctorOnly: true, action: true },
    { k: 'lei', label: 'Leistung', doctorOnly: false },
  ],
};
