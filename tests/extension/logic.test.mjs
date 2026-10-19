// Unit-Tests fuer die reine Logik des Workspace Switchers.
// Ausfuehren: node --test tests/extension/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MODES,
  nextMode,
  normalizeSettings,
  hiddenAccountIds,
  workspaceOfIdentity,
  primaryAccountId,
  identityForCompose,
  shouldWarn,
  snippetToHtml,
  DEFAULT_SNIPPETS,
  MODE_COLORS,
  darkVariant,
  accentProperties,
  effectiveColors,
} from "../../extension-workspace-switcher/shared/logic.mjs";
import * as L from "../../extension-workspace-switcher/shared/logic.mjs";

const accounts = [
  { id: "account1", type: "imap", identities: [{ id: "id1", email: "a@schule.de" }] },
  { id: "account3", type: "imap", identities: [{ id: "id2", email: "b@nrw.schule" }] },
  { id: "account7", type: "imap", identities: [{ id: "id3", email: "c@outlook.com" }] },
  { id: "account2", type: "none", identities: [] },
];
const assignments = { account1: "school", account3: "school", account7: "private" };

test("MODES in Wechselreihenfolge", () => {
  assert.deepEqual(MODES, ["school", "private", "all"]);
});

test("nextMode zyklisch, unbekannt startet bei school", () => {
  assert.equal(nextMode("school"), "private");
  assert.equal(nextMode("private"), "all");
  assert.equal(nextMode("all"), "school");
  assert.equal(nextMode("quatsch"), "school");
});

test("normalizeSettings fuellt Defaults und verwirft Unsinn", () => {
  const s = normalizeSettings(undefined);
  assert.equal(s.mode, "all");
  assert.deepEqual(s.assignments, {});
  assert.deepEqual(s.defaultIdentity, { school: null, private: null });
  assert.equal(s.guardEnabled, true);
  assert.equal(s.snippets.length, DEFAULT_SNIPPETS.length);
  assert.ok(DEFAULT_SNIPPETS.length >= 4 && DEFAULT_SNIPPETS.length <= 5);

  const t = normalizeSettings({
    mode: "x",
    assignments: { a: "school", b: "evil", c: "both" },
    guardEnabled: false,
    snippets: [{ id: "s1", title: "T", text: "X" }, { title: 3 }],
  });
  assert.equal(t.mode, "all");
  assert.deepEqual(t.assignments, { a: "school", c: "both" });
  assert.equal(t.guardEnabled, false);
  assert.deepEqual(t.snippets, [{ id: "s1", title: "T", text: "X" }]);
});

test("normalizeSettings liefert eigene Kopien der Default-Snippets", () => {
  const s = normalizeSettings({});
  s.snippets[0].title = "geaendert";
  assert.notEqual(DEFAULT_SNIPPETS[0].title, "geaendert");
});

test("hiddenAccountIds: Schule blendet Privat aus, unzugeordnet bleibt sichtbar", () => {
  assert.deepEqual(hiddenAccountIds("school", accounts, assignments), ["account7"]);
  assert.deepEqual(hiddenAccountIds("private", accounts, assignments), ["account1", "account3"]);
  assert.deepEqual(hiddenAccountIds("all", accounts, assignments), []);
  assert.deepEqual(hiddenAccountIds("school", accounts, { ...assignments, account7: "both" }), []);
});

test("workspaceOfIdentity", () => {
  assert.equal(workspaceOfIdentity("id2", accounts, assignments), "school");
  assert.equal(workspaceOfIdentity("id3", accounts, assignments), "private");
  assert.equal(workspaceOfIdentity("unbekannt", accounts, assignments), "both");
});

test("primaryAccountId nutzt Standard-Identitaet, sonst erstes Konto des Modus", () => {
  const def = { school: "id2", private: null };
  assert.equal(primaryAccountId("school", accounts, assignments, def), "account3");
  assert.equal(primaryAccountId("private", accounts, assignments, def), "account7");
  assert.equal(primaryAccountId("all", accounts, assignments, def), null);
  // Standard-Identitaet gehoert zum falschen Modus: ignorieren
  assert.equal(primaryAccountId("school", accounts, assignments, { school: "id3" }), "account1");
  assert.equal(primaryAccountId("private", accounts, {}, {}), null);
});

test("identityForCompose", () => {
  const def = { school: "id2", private: null };
  assert.equal(identityForCompose("school", accounts, assignments, def), "id2");
  assert.equal(identityForCompose("private", accounts, assignments, def), "id3");
  assert.equal(identityForCompose("all", accounts, assignments, def), null);
  assert.equal(identityForCompose("private", accounts, {}, def), null);
});

test("shouldWarn nur bei Identitaet aus dem anderen Workspace", () => {
  assert.equal(shouldWarn("private", "id1", accounts, assignments, true), true);
  assert.equal(shouldWarn("school", "id3", accounts, assignments, true), true);
  assert.equal(shouldWarn("school", "id1", accounts, assignments, true), false);
  assert.equal(shouldWarn("all", "id3", accounts, assignments, true), false);
  assert.equal(shouldWarn("private", "id1", accounts, assignments, false), false);
  assert.equal(shouldWarn("private", "unbekannt", accounts, assignments, true), false);
});

test("snippetToHtml escaped HTML und setzt Zeilenumbrueche", () => {
  assert.equal(snippetToHtml('a<b> & "c"\nzwei'), "a&lt;b&gt; &amp; &quot;c&quot;<br>zwei");
  assert.equal(snippetToHtml("x\r\ny"), "x<br>y");
});

test("normalizeSettings: Farben nur als #rrggbb, sonst null", () => {
  assert.deepEqual(normalizeSettings({}).colors, { school: null, private: null, all: null });
  const s = normalizeSettings({ colors: { school: "#FF8800", private: "red", all: "#12345" } });
  assert.deepEqual(s.colors, { school: "#ff8800", private: null, all: null });
});

test("effectiveColors faellt auf die Standardfarben zurueck", () => {
  assert.deepEqual(effectiveColors({ school: "#ff8800", private: null, all: null }), {
    school: "#ff8800",
    private: MODE_COLORS.private,
    all: MODE_COLORS.all,
  });
});

test("darkVariant hellt auf (50 % Weiss)", () => {
  assert.equal(darkVariant("#000000"), "#808080");
  assert.equal(darkVariant("#ffffff"), "#ffffff");
  assert.equal(darkVariant("#00467d"), "#80a3be"); // = Dunkel-Token Schule
});

test("accentProperties nur fuer eigene Farben, mit Dark-Variante", () => {
  assert.deepEqual(accentProperties({ school: null, private: null, all: null }), {});
  assert.deepEqual(accentProperties({ school: "#000000", private: null, all: "#ffffff" }), {
    "--ws-custom-school": "#000000",
    "--ws-custom-school-dark": "#808080",
    "--ws-custom-all": "#ffffff",
    "--ws-custom-all-dark": "#ffffff",
  });
});

// ---------------------------------------------------------------- v0.2.0

const SUN = new Date(2026, 9, 18, 20, 15); // So 18.10.2026 20:15
const MON_DAY = new Date(2026, 9, 19, 10, 0); // Mo 19.10.2026 10:00
const MON_EVENING = new Date(2026, 9, 19, 18, 5);
const base = () => L.normalizeSettings({ mode: "school", assignments });

test("normalizeSettings v0.2.0: Defaults und Rueckwaertskompatibilitaet", () => {
  const s = L.normalizeSettings({ mode: "school" });
  assert.equal(s.privacyBlur, false);
  assert.equal(s.focusModeUntil, null);
  assert.deepEqual(s.pinnedFolders, []);
  assert.deepEqual(s.folderColors, {});
  assert.deepEqual(s.calendarAssignments, {});
  assert.deepEqual(s.freeSlotConfig, L.DEFAULT_FREE_SLOT_CONFIG);
  assert.deepEqual(s.guardConfig, L.DEFAULT_GUARD_CONFIG);
  assert.deepEqual(s.scheduledDrafts, []);
  assert.equal(s.autoTagRules.length, L.DEFAULT_AUTO_TAG_RULES.length);
  assert.equal(s.availabilityFooter, "");
});

test("normalizeSettings v0.2.0 verwirft Unsinn", () => {
  const s = L.normalizeSettings({
    privacyBlur: "ja",
    focusModeUntil: "bald",
    pinnedFolders: [
      { folderURI: "imap://a@x/INBOX/Klasse%207b", workspace: "school", color: "#ABCDEF" },
      { folderURI: "x", workspace: "both" },
      null,
    ],
    folderColors: { u1: "#112233", u2: "blau" },
    calendarAssignments: { c1: "school", c2: "work" },
    freeSlotConfig: { workdays: [1, 3, 9], startHour: 16, endHour: 10, durationMinutes: 45 },
    guardConfig: { bccThreshold: -1, internalDomains: ["@Schule.DE"], afterHoursStart: "25:00" },
    scheduledDrafts: [{ id: "1", headerMessageId: "m@x", sendAt: 5 }, { id: "2" }],
    autoTagRules: [{ tag: " Test ", keywords: ["a", 3] }, { tag: "" }],
  });
  assert.equal(s.privacyBlur, false);
  assert.equal(s.focusModeUntil, null);
  assert.deepEqual(s.pinnedFolders, [
    { folderURI: "imap://a@x/INBOX/Klasse%207b", label: "Klasse 7b", color: "#abcdef", workspace: "school" },
  ]);
  assert.deepEqual(s.folderColors, { u1: "#112233" });
  assert.deepEqual(s.calendarAssignments, { c1: "school" });
  assert.deepEqual(s.freeSlotConfig, { workdays: [1, 3], startHour: 8, endHour: 15.5, durationMinutes: 45 });
  assert.equal(s.guardConfig.bccThreshold, 3);
  assert.deepEqual(s.guardConfig.internalDomains, ["schule.de"]);
  assert.equal(s.guardConfig.afterHoursStart, "18:00");
  assert.deepEqual(s.scheduledDrafts, [{ id: "1", headerMessageId: "m@x", accountId: null, sendAt: 5, subject: "" }]);
  assert.deepEqual(s.autoTagRules, [{ tag: "Test", color: "#64748b", keywords: ["a"] }]);
});

test("Beratungs-Baustein aus v0.1.0 wird auf {{freie_termine}} migriert", () => {
  const old = {
    id: "beratung",
    title: "B",
    text:
      "gerne biete ich Ihnen folgende Termine für ein Beratungsgespräch an:\n\n" +
      "- ____ um ____ Uhr\n- ____ um ____ Uhr\n\n" +
      "Bitte geben Sie mir kurz Bescheid, welcher Termin Ihnen passt. Das Gespräch findet in Raum ____ statt.",
  };
  const s = L.normalizeSettings({ snippets: [old, { id: "x", title: "X", text: "- ____ um ____ Uhr" }] });
  assert.ok(s.snippets[0].text.includes("{{freie_termine}}"));
  assert.equal(s.snippets[1].text, "- ____ um ____ Uhr");
});

test("Fokus, gepinnte Ordner, Kalender-Sichtbarkeit", () => {
  assert.equal(L.isFocusActive({ focusModeUntil: 100 }, 50), true);
  assert.equal(L.isFocusActive({ focusModeUntil: 100 }, 100), false);
  assert.equal(L.isFocusActive({ focusModeUntil: null }, 0), false);
  const pins = [{ workspace: "school" }, { workspace: "private" }];
  assert.equal(L.pinnedFoldersFor("school", pins).length, 1);
  assert.equal(L.pinnedFoldersFor("all", pins).length, 2);
  assert.deepEqual(L.calendarVisibility("private", { a: "school", b: "private", c: "both" }), {
    a: false,
    b: true,
    c: true,
  });
  assert.deepEqual(L.calendarVisibility("all", { a: "school" }), { a: true });
});

test("Adressen: parsen, intern/extern, BCC verschieben", () => {
  assert.deepEqual(L.parseAddress('"Muster, Max" <Max@X.de>'), { name: "Muster, Max", email: "max@x.de" });
  assert.deepEqual(L.parseAddress("a@b.de"), { name: "", email: "a@b.de" });
  const dom = ["schule.example", "bezirk.example"];
  assert.equal(L.isInternalAddress("k@schule.example", dom), true);
  assert.equal(L.isInternalAddress("k@mail.schule.example", dom), true);
  assert.equal(L.isInternalAddress("k@fake-schule.example", dom), false);
  const details = { to: ["a@web.de", "k@schule.example"], cc: "b@gmx.de", bcc: ["c@t-online.de"] };
  assert.deepEqual(L.visibleExternalRecipients(details, dom), ["a@web.de", "b@gmx.de"]);
  assert.deepEqual(L.moveRecipientsToBcc(details, ["a@web.de", "b@gmx.de"]), {
    to: ["k@schule.example"],
    cc: [],
    bcc: ["c@t-online.de", "a@web.de", "b@gmx.de"],
  });
  assert.deepEqual(L.recipientList([{ id: "c1", type: "contact" }, "x@y.de", ""]), ["x@y.de"]);
});

test("matchKeywords nur ganze Woerter, ohne Gross/Klein", () => {
  const kw = ["BEM", "Attest", "Rückmeldung bis"];
  assert.deepEqual(L.matchKeywords("Bitte das ATTEST und BEM-Gespräch", kw), ["BEM", "Attest"]);
  assert.deepEqual(L.matchKeywords("Bemerkung zum Attestat", kw), []);
  assert.deepEqual(L.matchKeywords("rückmeldung bis Freitag", kw), ["Rückmeldung bis"]);
});

test("Zitate erkennen und aus Klartext entfernen", () => {
  assert.equal(
    L.hasQuotedContent({ body: '<div class="moz-cite-prefix">Am …</div><blockquote type="cite">x</blockquote>' }),
    true
  );
  assert.equal(L.hasQuotedContent({ body: '<div class="moz-forward-container">x</div>' }), true);
  assert.equal(L.hasQuotedContent({ body: "<p>Hallo</p>" }), false);
  assert.equal(L.hasQuotedContent({ isPlainText: true, plainTextBody: "Hi\n> alt" }), true);
  assert.equal(L.stripPlainTextQuotes("Neu\n\n> alt\n> alt2"), "Neu");
  assert.equal(L.stripPlainTextQuotes("Neu\n-------- Weitergeleitete Nachricht --------\nGeheim"), "Neu");
});

test("Feierabend und naechster Schultag 07:30", () => {
  const g = L.DEFAULT_GUARD_CONFIG;
  const wd = [1, 2, 3, 4, 5];
  const at = (...a) => new Date(...a).getTime();
  assert.equal(L.isAfterHours(MON_DAY, g, wd), false);
  assert.equal(L.isAfterHours(MON_EVENING, g, wd), true);
  assert.equal(L.isAfterHours(SUN, g, wd), true);
  assert.equal(L.isAfterHours(new Date(2026, 9, 20, 6, 0), g, wd), true);
  assert.equal(L.nextSchoolDayAt(SUN, "07:30", wd).getTime(), at(2026, 9, 19, 7, 30));
  assert.equal(L.nextSchoolDayAt(MON_EVENING, "07:30", wd).getTime(), at(2026, 9, 20, 7, 30));
  assert.equal(L.nextSchoolDayAt(new Date(2026, 9, 20, 6, 0), "07:30", wd).getTime(), at(2026, 9, 20, 7, 30));
  // Freitagabend -> Montag
  assert.equal(L.nextSchoolDayAt(new Date(2026, 9, 23, 19, 0), "07:30", wd).getTime(), at(2026, 9, 26, 7, 30));
});

test("formatSlot / formatDateTime", () => {
  assert.equal(
    L.formatSlot(new Date(2026, 9, 20, 13, 30), new Date(2026, 9, 20, 14, 0)),
    "Di, 20.10.2026, 13:30–14:00 Uhr"
  );
  assert.equal(L.formatDateTime(new Date(2026, 9, 19, 7, 30)), "Mo, 19.10.2026, 07:30 Uhr");
});

test("computeFreeSlots: ab morgen, ein Slot pro Werktag, Termine blockieren", () => {
  const cfg = L.DEFAULT_FREE_SLOT_CONFIG;
  const busy = [
    // Mo komplett belegt
    { start: new Date(2026, 9, 19, 7, 0).getTime(), end: new Date(2026, 9, 19, 16, 0).getTime() },
    // Di bis 13:30 belegt
    { start: new Date(2026, 9, 20, 8, 0).getTime(), end: new Date(2026, 9, 20, 13, 30).getTime() },
  ];
  const slots = L.computeFreeSlots(busy, cfg, SUN).map(s => L.formatSlot(s.start, s.end));
  assert.deepEqual(slots, [
    "Di, 20.10.2026, 13:30–14:00 Uhr",
    "Mi, 21.10.2026, 08:00–08:30 Uhr",
    "Do, 22.10.2026, 08:00–08:30 Uhr",
  ]);
  // 45-Minuten-Slot muss bis 15:30 enden: Mo ab 15:15 frei reicht nicht
  const late = [{ start: new Date(2026, 9, 19, 8, 0).getTime(), end: new Date(2026, 9, 19, 15, 15).getTime() }];
  const one = L.computeFreeSlots(late, { ...cfg, durationMinutes: 45 }, SUN, 1)[0];
  assert.equal(L.formatSlot(one.start, one.end), "Di, 20.10.2026, 08:00–08:45 Uhr");
  // Alles belegt: leer
  assert.deepEqual(L.computeFreeSlots([{ start: 0, end: new Date(2027, 0, 1).getTime() }], cfg, SUN), []);
});

test("evaluateSendGuard sammelt alle Befunde in einem Durchgang", () => {
  const many = ["a@web.de", "b@gmx.de", "c@t-online.de", "d@aol.com"];
  // Schul-Absender, 4 Externe offen, Weiterleitung mit sensiblem Zitat, Sonntagabend
  const issues = L.evaluateSendGuard({
    settings: base(),
    accounts,
    now: SUN,
    details: {
      identityId: "id1",
      type: "forward",
      to: many,
      subject: "WG: Beratung Schüler",
      body: '<div class="moz-forward-container">Jugendamt</div>',
    },
  });
  assert.deepEqual(
    issues.map(i => i.type),
    ["bcc", "sensitive", "afterHours"]
  );
  assert.deepEqual(issues[0].recipients, many);
  assert.deepEqual(issues[1].keywords, ["Beratung", "Jugendamt"]);
  assert.equal(issues[2].sendAt, new Date(2026, 9, 19, 7, 30).getTime());
});

test("evaluateSendGuard: Mismatch, Schwelle, Privat ohne Schul-Checks, aus", () => {
  const s = { ...base(), mode: "private" };
  const three = { identityId: "id1", type: "new", to: ["a@web.de", "b@web.de", "c@web.de"], body: "" };
  assert.deepEqual(L.evaluateSendGuard({ settings: s, accounts, now: MON_DAY, details: three }), [
    { type: "mismatch", fromWorkspace: "school" },
  ]);
  const priv = {
    identityId: "id3",
    type: "forward",
    to: ["a@web.de", "b@web.de", "c@web.de", "d@web.de"],
    body: "<blockquote>Attest</blockquote>",
  };
  assert.deepEqual(
    L.evaluateSendGuard({ settings: base(), accounts, now: SUN, details: priv }).map(i => i.type),
    ["mismatch"]
  );
  assert.deepEqual(
    L.evaluateSendGuard({ settings: { ...base(), guardEnabled: false }, accounts, now: SUN, details: priv }),
    []
  );
  // Antwort (keine Weiterleitung) mit Zitat: kein Schweigepflicht-Befund
  const reply = { identityId: "id1", type: "reply", to: ["k@schule.example"], body: "<blockquote>Attest</blockquote>" };
  assert.deepEqual(L.evaluateSendGuard({ settings: base(), accounts, now: MON_DAY, details: reply }), []);
});

test("dueDrafts", () => {
  const d = [
    { id: "a", sendAt: 10 },
    { id: "b", sendAt: 20 },
  ];
  assert.deepEqual(
    L.dueDrafts(d, 15).map(x => x.id),
    ["a"]
  );
});

test("fillPlaceholders: du/Sie nach Empfaenger-Domain, freie Termine", () => {
  const dom = ["schule.example"];
  const text = "{{anrede_du_sie}}\n{{freie_termine}}\n{{gruss_du_sie}}";
  assert.equal(
    L.fillPlaceholders(text, {
      to: ["Anna Kollegin <anna@schule.example>"],
      internalDomains: dom,
      freeSlots: ["Di, 20.10.2026, 13:30–14:00 Uhr"],
    }),
    "Hallo Anna,\n- Di, 20.10.2026, 13:30–14:00 Uhr\nViele Grüße"
  );
  assert.equal(
    L.fillPlaceholders(text, { to: ["Petra Meier <p@web.de>"], internalDomains: dom, freeSlots: [] }),
    "Sehr geehrte(r) Petra Meier,\n- ____ um ____ Uhr\n- ____ um ____ Uhr\nMit freundlichen Grüßen"
  );
  assert.equal(
    L.fillPlaceholders("{{anrede_du_sie}}", { to: [], internalDomains: dom, freeSlots: null }),
    "Sehr geehrte Damen und Herren,"
  );
});

test("footerChange nur bei Externen und nur einmal", () => {
  const dom = ["schule.de"];
  assert.equal(L.footerChange({ to: ["a@web.de"], body: "<p>x</p>" }, "", dom), null);
  assert.equal(L.footerChange({ to: ["a@schule.de"], body: "<p>x</p>" }, "Sprechzeit Di", dom), null);
  const html = L.footerChange({ to: ["a@web.de"], body: "<html><body><p>x</p></body></html>" }, "Sprechzeit Di", dom);
  assert.match(html.body, /<p class="ws-footer"[^>]*>Sprechzeit Di<\/p><\/body>/);
  assert.equal(L.footerChange({ to: ["a@web.de"], body: html.body }, "Sprechzeit Di", dom), null);
  assert.deepEqual(L.footerChange({ to: ["a@web.de"], isPlainText: true, plainTextBody: "x" }, "F", dom), {
    plainTextBody: "x\n\nF",
  });
});

test("extractRoom", () => {
  assert.equal(L.extractRoom("Beamer in Raum A1.03 defekt."), "A1.03");
  assert.equal(L.extractRoom("im R. 214 geht nichts"), "214");
  assert.equal(L.extractRoom("Zimmer B-12"), "B-12");
  assert.equal(L.extractRoom("kein Ort"), null);
});

test("extractDateTime", () => {
  const r = L.extractDateTime("Elterngespräch am 20.10.2026 um 13:30 Uhr", SUN);
  assert.equal(r.start.getTime(), new Date(2026, 9, 20, 13, 30).getTime());
  assert.equal(r.end.getTime(), new Date(2026, 9, 20, 14, 15).getTime());
  assert.equal(r.allDay, false);
  assert.equal(L.extractDateTime("Treffen 3.11. 14 Uhr", SUN).start.getTime(), new Date(2026, 10, 3, 14, 0).getTime());
  assert.equal(L.extractDateTime("am 5.1. um 9.15 Uhr", SUN).start.getTime(), new Date(2027, 0, 5, 9, 15).getTime());
  const allDay = L.extractDateTime("Wandertag 22.10.26", SUN);
  assert.equal(allDay.allDay, true);
  assert.equal(allDay.end.getTime(), new Date(2026, 9, 23).getTime());
  assert.equal(L.extractDateTime("31.02.2026", SUN), null);
  assert.equal(L.extractDateTime("Version 1.2", SUN), null);
});

test("archiveFileName und splitPersonName", () => {
  const d = new Date(2026, 9, 18);
  assert.equal(
    L.archiveFileName(d, "Max Mustermann <m@web.de>", "Attest.pdf"),
    "Schul-Archiv/2026-10-18_Mustermann_Max_Attest.pdf"
  );
  assert.equal(
    L.archiveFileName(d, '"Meier, Petra" <p@web.de>', "a/b:c.pdf"),
    "Schul-Archiv/2026-10-18_Meier_Petra_abc.pdf"
  );
  assert.equal(L.archiveFileName(d, "eltern@web.de", "scan 1.pdf"), "Schul-Archiv/2026-10-18_eltern_scan-1.pdf");
  assert.deepEqual(L.splitPersonName("Anna Lena Schmidt"), { first: "Anna-Lena", last: "Schmidt" });
});

test("ticketMarkdown", () => {
  assert.equal(
    L.ticketMarkdown({
      author: "Hausmeister <h@schule.example>",
      subject: "Beamer defekt",
      date: SUN,
      text: "Raum C2.10 bitte prüfen",
    }),
    "- [ ] Beamer defekt – Raum C2.10\n  - Von: Hausmeister <h@schule.example>\n  - Eingang: 18.10.2026"
  );
});

test("tagKey und matchAutoTags", () => {
  assert.equal(L.tagKey("Beratung/Vertraulich"), "ws_beratung_vertraulich");
  assert.equal(L.tagKey("Größe Ü"), "ws_groesse_ue");
  const rules = L.normalizeSettings({}).autoTagRules;
  assert.deepEqual(L.matchAutoTags(rules, "Klausur Q1 im WLAN-Raum"), [
    "ws_it_digitalisierung",
    "ws_oberstufe_klausuren",
  ]);
  assert.deepEqual(L.matchAutoTags(rules, "Mittagessen"), []);
});
