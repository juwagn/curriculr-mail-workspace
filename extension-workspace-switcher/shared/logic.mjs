// Reine Logik des Workspace Switchers: keine browser.*-Aufrufe, damit sie
// mit Node getestet werden kann (tests/extension/logic.test.mjs).
//
// Begriffe:
//   mode        "school" | "private" | "all" – der aktive Workspace
//   assignment  "school" | "private" | "both" – Zuordnung eines Kontos;
//               nicht zugeordnete Konten gelten als "both" (immer sichtbar)
//   accounts    Ergebnis von browser.accounts.list(): [{ id, type, identities: [{ id, ... }] }]

export const MODES = ["school", "private", "all"];
export const ASSIGNMENTS = ["school", "private", "both"];

export const MODE_LABELS = {
  school: "Schule",
  private: "Privat",
  all: "Alle",
};

export const MODE_COLORS = {
  school: "#00467d",
  private: "#2b7550",
  all: "#8a5a0b",
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const DEFAULT_SNIPPETS = [
  {
    id: "eltern",
    title: "Eltern-Rückmeldung",
    text:
      "Sehr geehrte Eltern,\n\nvielen Dank für Ihre Nachricht. Ich habe Ihr Anliegen aufgenommen " +
      "und melde mich bis spätestens ____ mit einer Rückmeldung bei Ihnen.\n\nMit freundlichen Grüßen",
  },
  {
    id: "beratung",
    title: "Beratungstermin-Vorschlag",
    text:
      "gerne biete ich Ihnen folgende Termine für ein Beratungsgespräch an:\n\n" +
      "{{freie_termine}}\n\n" +
      "Bitte geben Sie mir kurz Bescheid, welcher Termin Ihnen passt. Das Gespräch findet in Raum ____ statt.",
  },
  {
    id: "it-support",
    title: "IT-Support-Rückfrage",
    text:
      "danke für die Meldung. Damit ich das Problem eingrenzen kann, brauche ich noch ein paar Angaben:\n\n" +
      "- Raum / Gerät:\n- Was genau passiert (gern mit Foto der Fehlermeldung)?\n- Seit wann tritt es auf?",
  },
  {
    id: "kenntnis",
    title: "Kurze Kenntnisnahme",
    text: "vielen Dank, ich habe es zur Kenntnis genommen.",
  },
  {
    id: "termin",
    title: "Terminbestätigung",
    text: "hiermit bestätige ich den Termin am ____ um ____ Uhr. Ich freue mich auf das Gespräch.",
  },
];

// Text des Beratungs-Bausteins bis v0.1.0; wird beim Laden auf {{freie_termine}} umgestellt.
const LEGACY_BERATUNG_TEXT =
  "gerne biete ich Ihnen folgende Termine für ein Beratungsgespräch an:\n\n" +
  "- ____ um ____ Uhr\n- ____ um ____ Uhr\n\n" +
  "Bitte geben Sie mir kurz Bescheid, welcher Termin Ihnen passt. Das Gespräch findet in Raum ____ statt.";

export const DEFAULT_GUARD_CONFIG = {
  bccThreshold: 3,
  internalDomains: [],
  sensitiveKeywords: ["Beratung", "Schweigepflicht", "Jugendamt", "BEM", "Nachteilsausgleich", "Attest", "Tadel"],
  afterHoursStart: "18:00",
  defaultSendLaterTime: "07:30",
};

export const DEFAULT_FREE_SLOT_CONFIG = {
  workdays: [1, 2, 3, 4, 5],
  startHour: 8,
  endHour: 15.5,
  durationMinutes: 30,
};

export const DEFAULT_AUTO_TAG_RULES = [
  {
    tag: "Beratung/Vertraulich",
    color: "#dc2626",
    keywords: ["Beratung", "Schweigepflicht", "Jugendamt", "vertraulich", "Nachteilsausgleich", "Attest"],
  },
  {
    tag: "IT/Digitalisierung",
    color: "#2563eb",
    keywords: ["iPad", "Tablet", "WLAN", "Beamer", "Drucker", "Moodle", "IServ", "Passwort", "Digitalisierung"],
  },
  {
    tag: "Oberstufe/Klausuren",
    color: "#7c3aed",
    keywords: ["Klausur", "Klausuren", "Abitur", "Oberstufe", "Facharbeit", "Q1", "Q2", "EF"],
  },
  { tag: "Schulleitung", color: "#ea580c", keywords: ["Schulleitung", "Dienstbesprechung", "Lehrerkonferenz", "Erlass"] },
  { tag: "Wartet auf Antwort", color: "#ca8a04", keywords: ["Bitte um Rückmeldung", "Bitte um Antwort", "Rückmeldung bis"] },
];

/** Tag, den „PDF/Attest archivieren“ setzt. */
export const DONE_TAG = { tag: "Erledigt", color: "#16a34a" };

export function nextMode(mode) {
  const i = MODES.indexOf(mode);
  return i === -1 ? MODES[0] : MODES[(i + 1) % MODES.length];
}

function isSnippet(s) {
  return (
    s !== null &&
    typeof s === "object" &&
    typeof s.id === "string" &&
    typeof s.title === "string" &&
    typeof s.text === "string"
  );
}

/** Bringt gespeicherte Einstellungen in eine gültige Form. */
export function normalizeSettings(raw) {
  const src = raw && typeof raw === "object" ? raw : {};

  const assignments = {};
  if (src.assignments && typeof src.assignments === "object") {
    for (const [accountId, value] of Object.entries(src.assignments)) {
      if (ASSIGNMENTS.includes(value)) {
        assignments[accountId] = value;
      }
    }
  }

  const defaultIdentity = { school: null, private: null };
  if (src.defaultIdentity && typeof src.defaultIdentity === "object") {
    for (const key of ["school", "private"]) {
      if (typeof src.defaultIdentity[key] === "string") {
        defaultIdentity[key] = src.defaultIdentity[key];
      }
    }
  }

  const beratungText = DEFAULT_SNIPPETS.find(s => s.id === "beratung").text;
  const snippets = Array.isArray(src.snippets)
    ? src.snippets
        .filter(isSnippet)
        .map(s => ({ id: s.id, title: s.title, text: s.text === LEGACY_BERATUNG_TEXT ? beratungText : s.text }))
    : DEFAULT_SNIPPETS.map(s => ({ ...s }));

  const colors = { school: null, private: null, all: null };
  if (src.colors && typeof src.colors === "object") {
    for (const key of MODES) {
      const value = src.colors[key];
      if (typeof value === "string" && HEX_COLOR.test(value)) {
        colors[key] = value.toLowerCase();
      }
    }
  }

  return {
    mode: MODES.includes(src.mode) ? src.mode : "all",
    assignments,
    defaultIdentity,
    guardEnabled: typeof src.guardEnabled === "boolean" ? src.guardEnabled : true,
    snippets,
    colors,
    privacyBlur: src.privacyBlur === true,
    focusModeUntil: Number.isFinite(src.focusModeUntil) ? src.focusModeUntil : null,
    pinnedFolders: normalizePinnedFolders(src.pinnedFolders),
    folderColors: normalizeColorMap(src.folderColors),
    calendarAssignments: normalizeCalendarAssignments(src.calendarAssignments),
    freeSlotConfig: normalizeFreeSlotConfig(src.freeSlotConfig),
    guardConfig: normalizeGuardConfig(src.guardConfig),
    scheduledDrafts: normalizeScheduledDrafts(src.scheduledDrafts),
    autoTagRules: normalizeAutoTagRules(src.autoTagRules),
    availabilityFooter: typeof src.availabilityFooter === "string" ? src.availabilityFooter : "",
  };
}

const isObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
const isHex = v => typeof v === "string" && HEX_COLOR.test(v);
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const stringList = v => (Array.isArray(v) ? v.filter(x => typeof x === "string" && x.trim()).map(x => x.trim()) : null);

function normalizePinnedFolders(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(p => isObject(p) && typeof p.folderURI === "string" && ["school", "private"].includes(p.workspace))
    .map(p => ({
      folderURI: p.folderURI,
      label: typeof p.label === "string" && p.label ? p.label : decodeURIComponent(p.folderURI.split("/").pop()),
      color: isHex(p.color) ? p.color.toLowerCase() : null,
      workspace: p.workspace,
    }));
}

function normalizeColorMap(raw) {
  const map = {};
  if (isObject(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (isHex(value)) {
        map[key] = value.toLowerCase();
      }
    }
  }
  return map;
}

function normalizeCalendarAssignments(raw) {
  const map = {};
  if (isObject(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (ASSIGNMENTS.includes(value)) {
        map[key] = value;
      }
    }
  }
  return map;
}

function normalizeFreeSlotConfig(raw) {
  const src = isObject(raw) ? raw : {};
  const d = DEFAULT_FREE_SLOT_CONFIG;
  const hour = (v, fallback) => (Number.isFinite(v) && v >= 0 && v <= 24 ? v : fallback);
  const workdays = Array.isArray(src.workdays)
    ? [...new Set(src.workdays.filter(n => Number.isInteger(n) && n >= 0 && n <= 7).map(n => n % 7))]
    : [...d.workdays];
  let startHour = hour(src.startHour, d.startHour);
  let endHour = hour(src.endHour, d.endHour);
  if (endHour <= startHour) {
    [startHour, endHour] = [d.startHour, d.endHour];
  }
  return {
    workdays,
    startHour,
    endHour,
    durationMinutes: [15, 30, 45, 60].includes(src.durationMinutes) ? src.durationMinutes : d.durationMinutes,
  };
}

function normalizeGuardConfig(raw) {
  const src = isObject(raw) ? raw : {};
  const d = DEFAULT_GUARD_CONFIG;
  return {
    bccThreshold: Number.isInteger(src.bccThreshold) && src.bccThreshold >= 0 ? src.bccThreshold : d.bccThreshold,
    internalDomains: (stringList(src.internalDomains) ?? d.internalDomains).map(x => x.toLowerCase().replace(/^@/, "")),
    sensitiveKeywords: stringList(src.sensitiveKeywords) ?? [...d.sensitiveKeywords],
    afterHoursStart: HH_MM.test(src.afterHoursStart) ? src.afterHoursStart : d.afterHoursStart,
    defaultSendLaterTime: HH_MM.test(src.defaultSendLaterTime) ? src.defaultSendLaterTime : d.defaultSendLaterTime,
  };
}

function normalizeScheduledDrafts(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter(
      x => isObject(x) && typeof x.id === "string" && typeof x.headerMessageId === "string" && Number.isFinite(x.sendAt)
    )
    .map(x => ({
      id: x.id,
      headerMessageId: x.headerMessageId,
      accountId: typeof x.accountId === "string" ? x.accountId : null,
      sendAt: x.sendAt,
      subject: typeof x.subject === "string" ? x.subject : "",
    }));
}

function normalizeAutoTagRules(raw) {
  if (!Array.isArray(raw)) {
    return DEFAULT_AUTO_TAG_RULES.map(r => ({ ...r, keywords: [...r.keywords] }));
  }
  return raw
    .filter(r => isObject(r) && typeof r.tag === "string" && r.tag.trim())
    .map(r => ({
      tag: r.tag.trim(),
      color: isHex(r.color) ? r.color.toLowerCase() : "#64748b",
      keywords: stringList(r.keywords) ?? [],
    }));
}

/** Eigene Farben, wo gesetzt, sonst die Standardfarben. */
export function effectiveColors(colors) {
  const result = {};
  for (const mode of MODES) {
    result[mode] = colors?.[mode] ?? MODE_COLORS[mode];
  }
  return result;
}

/** Hellere Variante für das dunkle Farbschema: 50 % Weiß dazumischen (trifft die Dunkel-Tokens der Palette). */
export function darkVariant(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return (
    "#" +
    channels
      .map(c => Math.round(c + (255 - c) * 0.5).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** CSS-Variablen für das Experiment: nur für eigene Farben, jeweils mit Dark-Variante. */
export function accentProperties(colors) {
  const props = {};
  for (const mode of MODES) {
    const hex = colors?.[mode];
    if (hex) {
      props[`--ws-custom-${mode}`] = hex;
      props[`--ws-custom-${mode}-dark`] = darkVariant(hex);
    }
  }
  return props;
}

function assignmentOf(accountId, assignments) {
  return assignments[accountId] ?? "both";
}

function isVisibleIn(mode, accountId, assignments) {
  const a = assignmentOf(accountId, assignments);
  return mode === "all" || a === "both" || a === mode;
}

/** Konto-IDs, die im Modus `mode` ausgeblendet werden. */
export function hiddenAccountIds(mode, accounts, assignments) {
  return accounts.filter(acc => !isVisibleIn(mode, acc.id, assignments)).map(acc => acc.id);
}

function accountOfIdentity(identityId, accounts) {
  return accounts.find(acc => acc.identities?.some(idn => idn.id === identityId)) ?? null;
}

/** "school" | "private" | "both" für eine Absender-Identität. */
export function workspaceOfIdentity(identityId, accounts, assignments) {
  const acc = accountOfIdentity(identityId, accounts);
  return acc ? assignmentOf(acc.id, assignments) : "both";
}

/** Erstes Konto mit Identität, das ausdrücklich diesem Modus zugeordnet ist. */
function firstAssignedAccount(mode, accounts, assignments) {
  return (
    accounts.find(acc => assignmentOf(acc.id, assignments) === mode && acc.identities?.length) ?? null
  );
}

/**
 * Konto, dessen Posteingang beim Wechsel in `mode` geöffnet wird:
 * das Konto der Standard-Identität des Modus, sonst das erste zugeordnete.
 * Im Modus "all" wird nichts umgeschaltet (null).
 */
export function primaryAccountId(mode, accounts, assignments, defaultIdentity) {
  if (mode === "all") {
    return null;
  }
  const idnId = defaultIdentity?.[mode];
  if (idnId) {
    const acc = accountOfIdentity(idnId, accounts);
    if (acc && assignmentOf(acc.id, assignments) === mode) {
      return acc.id;
    }
  }
  return firstAssignedAccount(mode, accounts, assignments)?.id ?? null;
}

/** Absender-Identität für ein neues, leeres Verfassen-Fenster (null = Thunderbird entscheidet). */
export function identityForCompose(mode, accounts, assignments, defaultIdentity) {
  if (mode === "all") {
    return null;
  }
  const idnId = defaultIdentity?.[mode];
  if (idnId && workspaceOfIdentity(idnId, accounts, assignments) === mode) {
    return idnId;
  }
  return firstAssignedAccount(mode, accounts, assignments)?.identities[0].id ?? null;
}

/** true, wenn im Modus `mode` von einer Identität des anderen Workspace gesendet wird. */
export function shouldWarn(mode, identityId, accounts, assignments, guardEnabled) {
  if (!guardEnabled || mode === "all") {
    return false;
  }
  const ws = workspaceOfIdentity(identityId, accounts, assignments);
  return ws !== "both" && ws !== mode;
}

/** Textbaustein als HTML für den HTML-Editor. */
export function snippetToHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, "<br>");
}

// ======================================================================
// v0.2.0: Sende-Wächter, Später senden, Platzhalter, Kalender, Parser
// ======================================================================

/** Gilt der Fokus-Modus zum Zeitpunkt `now` (ms)? */
export function isFocusActive(settings, now) {
  return settings.focusModeUntil !== null && settings.focusModeUntil > now;
}

/** Gepinnte Ordner, die im Modus `mode` als Tab erscheinen. */
export function pinnedFoldersFor(mode, pinnedFolders) {
  return pinnedFolders.filter(p => mode === "all" || p.workspace === mode);
}

/**
 * Sichtbarkeit je zugeordnetem Kalender im Modus `mode`: { calendarId: boolean }.
 * Nicht zugeordnete Kalender fehlen und bleiben, wie sie sind.
 */
export function calendarVisibility(mode, calendarAssignments) {
  const result = {};
  for (const [id, a] of Object.entries(calendarAssignments)) {
    result[id] = mode === "all" || a === "both" || a === mode;
  }
  return result;
}

// ------------------------------------------------------------ Adressen

/** Empfängerfeld der ComposeDetails als Liste von Strings (Kontakt-Objekte fallen weg). */
export function recipientList(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.filter(r => typeof r === "string" && r.trim());
}

/** "Max Muster <max@x.de>" -> { name: "Max Muster", email: "max@x.de" } */
export function parseAddress(str) {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(str);
  if (m) {
    return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  }
  return { name: "", email: str.trim().toLowerCase() };
}

/** Intern = Domain gleich oder Subdomain einer internen Domain. */
export function isInternalAddress(email, internalDomains) {
  const domain = email.split("@").pop().toLowerCase();
  return internalDomains.some(d => domain === d || domain.endsWith(`.${d}`));
}

/** Externe Empfänger, die offen in An oder CC stehen. */
export function visibleExternalRecipients(details, internalDomains) {
  return [...recipientList(details.to), ...recipientList(details.cc)].filter(
    r => !isInternalAddress(parseAddress(r).email, internalDomains)
  );
}

/** Verschiebt `recipients` aus An/CC nach BCC. Gibt { to, cc, bcc } zurück. */
export function moveRecipientsToBcc(details, recipients) {
  const move = new Set(recipients);
  const bcc = recipientList(details.bcc);
  return {
    to: recipientList(details.to).filter(r => !move.has(r)),
    cc: recipientList(details.cc).filter(r => !move.has(r)),
    bcc: [...bcc, ...recipients.filter(r => !bcc.includes(r))],
  };
}

// ------------------------------------------------------------ Inhalt

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Schlagwort als ganzes Wort (Unicode), ohne Groß-/Kleinschreibung. */
function keywordRegExp(keyword) {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(keyword)}(?![\\p{L}\\p{N}])`, "iu");
}

/** Schlagwörter aus `keywords`, die in `text` als ganzes Wort vorkommen. */
export function matchKeywords(text, keywords) {
  return keywords.filter(k => keywordRegExp(k).test(text));
}

/** Grober Klartext aus HTML, nur für Schlagwort-Suche und Parser. */
export function htmlToText(html) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

const PLAIN_FORWARD_MARK = /^-{3,} ?(Original|Weitergeleitet|Forwarded).*$/im;

/** Enthält der Body einen Zitat- oder Weiterleitungsblock? */
export function hasQuotedContent(details) {
  if (details.isPlainText) {
    const text = details.plainTextBody ?? "";
    return /^>/m.test(text) || PLAIN_FORWARD_MARK.test(text);
  }
  return /<blockquote\b|moz-cite-prefix|moz-forward-container/i.test(details.body ?? "");
}

/** Klartext der Mail aus Betreff und Body. */
function composeText(details) {
  const body = details.isPlainText ? details.plainTextBody ?? "" : htmlToText(details.body ?? "");
  return `${details.subject ?? ""}\n${body}`;
}

/** Selektoren für Zitat- und Weiterleitungsblöcke (Entfernen per DOM im Hintergrund). */
export const QUOTE_SELECTORS = "blockquote[type='cite'], .moz-cite-prefix, .moz-forward-container";

/** Entfernt Zitatzeilen ("> …") und alles ab einem Weiterleitungs-Trenner aus Klartext. */
export function stripPlainTextQuotes(text) {
  const cut = text.search(PLAIN_FORWARD_MARK);
  const head = cut === -1 ? text : text.slice(0, cut);
  return head
    .split(/\r?\n/)
    .filter(line => !line.startsWith(">"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

// ------------------------------------------------------------ Zeit

/** "18:30" -> 1110 (Minuten seit Mitternacht) */
export function parseTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const isWorkday = (date, workdays) => workdays.includes(date.getDay()) || (date.getDay() === 0 && workdays.includes(7));

/** Nach Feierabend: Wochenende, ab afterHoursStart oder vor der Später-senden-Zeit. */
export function isAfterHours(date, guardConfig, workdays) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (
    !isWorkday(date, workdays) ||
    minutes >= parseTime(guardConfig.afterHoursStart) ||
    minutes < parseTime(guardConfig.defaultSendLaterTime)
  );
}

/**
 * Nächster Schultag um `time` ("07:30") nach `now`.
 * shortcut: Ferien und Feiertage zählen als Schultag; bei Bedarf Ferienkalender einbeziehen.
 */
export function nextSchoolDayAt(now, time, workdays) {
  const minutes = parseTime(time);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, minutes);
  for (let i = 0; i < 15; i++) {
    if (d > now && isWorkday(d, workdays)) {
      return d;
    }
    d.setDate(d.getDate() + 1);
  }
  return d;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const pad = n => String(n).padStart(2, "0");
const dateDe = d => `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
const timeDe = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** "Di, 20.10.2026, 13:30–14:00 Uhr" */
export function formatSlot(start, end) {
  return `${dateDe(start)}, ${timeDe(start)}–${timeDe(end)} Uhr`;
}

/** "Mo, 19.10.2026, 07:30 Uhr" */
export function formatDateTime(date) {
  return `${dateDe(date)}, ${timeDe(date)} Uhr`;
}

/**
 * Freie Zeitfenster ab morgen in den nächsten 14 Werktagen.
 * busy: [{ start, end }] in ms. Pro Tag höchstens ein Vorschlag, damit Eltern
 * zwischen verschiedenen Tagen wählen können. Raster 15 Minuten.
 */
export function computeFreeSlots(busy, config, now, count = 3) {
  const duration = config.durationMinutes * 60000;
  const startMin = Math.round(config.startHour * 60);
  const endMin = Math.round(config.endHour * 60);
  const slots = [];
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let workdaysSeen = 0; workdaysSeen < 14 && slots.length < count; ) {
    day.setDate(day.getDate() + 1);
    if (!isWorkday(day, config.workdays)) {
      continue;
    }
    workdaysSeen++;
    for (let m = startMin; m + config.durationMinutes <= endMin; m += 15) {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m);
      const end = new Date(start.getTime() + duration);
      if (!busy.some(b => b.start < end.getTime() && b.end > start.getTime())) {
        slots.push({ start, end });
        break;
      }
    }
  }
  return slots;
}

// ------------------------------------------------------------ Sende-Wächter

/**
 * Alle Prüfungen vor dem Senden in einem Durchgang. Gibt eine Liste von Befunden zurück:
 *   { type: "mismatch", fromWorkspace }
 *   { type: "bcc", recipients }
 *   { type: "sensitive", keywords }
 *   { type: "afterHours", sendAt }   (sendAt in ms)
 * B–D gelten nur für Absender aus dem Workspace "school".
 */
export function evaluateSendGuard({ settings, accounts, details, now }) {
  if (!settings.guardEnabled) {
    return [];
  }
  const issues = [];
  const { guardConfig } = settings;
  const fromWorkspace = workspaceOfIdentity(details.identityId, accounts, settings.assignments);
  if (shouldWarn(settings.mode, details.identityId, accounts, settings.assignments, true)) {
    issues.push({ type: "mismatch", fromWorkspace });
  }
  if (fromWorkspace !== "school") {
    return issues;
  }
  const external = visibleExternalRecipients(details, guardConfig.internalDomains);
  if (external.length > guardConfig.bccThreshold) {
    issues.push({ type: "bcc", recipients: external });
  }
  if (details.type === "forward" && hasQuotedContent(details)) {
    const keywords = matchKeywords(composeText(details), guardConfig.sensitiveKeywords);
    if (keywords.length) {
      issues.push({ type: "sensitive", keywords });
    }
  }
  if (isAfterHours(now, guardConfig, settings.freeSlotConfig.workdays)) {
    const sendAt = nextSchoolDayAt(now, guardConfig.defaultSendLaterTime, settings.freeSlotConfig.workdays);
    issues.push({ type: "afterHours", sendAt: sendAt.getTime() });
  }
  return issues;
}

/** Entwürfe, deren Sendezeit erreicht ist. */
export function dueDrafts(scheduledDrafts, now) {
  return scheduledDrafts.filter(d => d.sendAt <= now);
}

// ------------------------------------------------------------ Platzhalter

/**
 * Ersetzt Platzhalter in einem Baustein:
 *   {{anrede_du_sie}}, {{gruss_du_sie}}, {{vorname}}, {{name}}, {{freie_termine}}
 * Maßgeblich ist der erste Empfänger in An: intern = Kollegium (du), sonst Sie.
 * freeSlots: Liste formatierter Strings oder null (nicht abgefragt).
 */
export function fillPlaceholders(text, { to, internalDomains, freeSlots }) {
  const first = recipientList(to)[0];
  const { name, email } = first ? parseAddress(first) : { name: "", email: "" };
  const internal = email !== "" && isInternalAddress(email, internalDomains);
  const vorname = name.split(/\s+/)[0] ?? "";
  let anrede;
  if (internal) {
    anrede = vorname ? `Hallo ${vorname},` : "Hallo,";
  } else {
    anrede = name ? `Sehr geehrte(r) ${name},` : "Sehr geehrte Damen und Herren,";
  }
  const termine = freeSlots?.length
    ? freeSlots.map(s => `- ${s}`).join("\n")
    : "- ____ um ____ Uhr\n- ____ um ____ Uhr";
  return text
    .replaceAll("{{anrede_du_sie}}", anrede)
    .replaceAll("{{gruss_du_sie}}", internal ? "Viele Grüße" : "Mit freundlichen Grüßen")
    .replaceAll("{{vorname}}", vorname)
    .replaceAll("{{name}}", name)
    .replaceAll("{{freie_termine}}", termine);
}

/**
 * Erreichbarkeits-Footer anhängen: nur wenn gesetzt, noch nicht enthalten und
 * mindestens ein externer Empfänger (An/CC/BCC) dabei ist. Gibt die Body-Änderung oder null zurück.
 */
export function footerChange(details, footer, internalDomains) {
  if (!footer.trim()) {
    return null;
  }
  const all = [...recipientList(details.to), ...recipientList(details.cc), ...recipientList(details.bcc)];
  if (!all.some(r => !isInternalAddress(parseAddress(r).email, internalDomains))) {
    return null;
  }
  if (details.isPlainText) {
    const body = details.plainTextBody ?? "";
    return body.includes(footer) ? null : { plainTextBody: `${body}\n\n${footer}` };
  }
  const body = details.body ?? "";
  const escaped = snippetToHtml(footer);
  if (body.includes(escaped)) {
    return null;
  }
  const html = `<p class="ws-footer" style="color:#6e6e76;font-size:0.9em">${escaped}</p>`;
  return { body: /<\/body>/i.test(body) ? body.replace(/<\/body>/i, `${html}</body>`) : body + html };
}

// ------------------------------------------------------------ Parser für Nachrichten

/** Raumnummer aus Text, z. B. "Raum A1.03" -> "A1.03" */
export function extractRoom(text) {
  return /(?:Raum|R\.|Zimmer)\s*([A-Z0-9.-]+)/i.exec(text)?.[1]?.replace(/[.-]+$/, "") || null;
}

/**
 * Erstes Datum (mit optionaler Uhrzeit) im Text.
 * Formate: 20.10.2026, 20.10.26, 20.10. – Uhrzeit: "13:30", "13.30 Uhr", "13 Uhr".
 * Ohne Jahr: dieses Jahr, liegt das Datum zurück, nächstes Jahr.
 * Gibt { start, end, allDay } zurück (Dauer 45 min, ohne Uhrzeit ganztägig) oder null.
 */
export function extractDateTime(text, now) {
  const m = /\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2}(?!\d))?/.exec(text);
  if (!m) {
    return null;
  }
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  let year = m[3] ? Number(m[3]) : now.getFullYear();
  if (m[3]?.length === 2) {
    year += 2000;
  }
  if (day < 1 || day > 31 || month < 0 || month > 11) {
    return null;
  }
  const rest = text.slice(m.index + m[0].length, m.index + m[0].length + 40);
  const t = /^\D{0,15}?(\d{1,2}):(\d{2})|^\D{0,15}?(\d{1,2})(?:\.(\d{2}))?\s*(?:Uhr|h\b)/.exec(rest);
  const hour = t ? Number(t[1] ?? t[3]) : null;
  const minute = t ? Number(t[2] ?? t[4] ?? 0) : 0;
  if (hour !== null && (hour > 23 || minute > 59)) {
    return null;
  }
  let start = new Date(year, month, day, hour ?? 0, minute);
  if (start.getDate() !== day) {
    return null;
  }
  if (!m[3] && start < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    start = new Date(year + 1, month, day, hour ?? 0, minute);
  }
  const allDay = hour === null;
  const end = allDay
    ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
    : new Date(start.getTime() + 45 * 60000);
  return { start, end, allDay };
}

/** "Mustermann, Max" oder "Max Mustermann" -> { first, last } */
export function splitPersonName(name) {
  const clean = name.replace(/["']/g, "").trim();
  if (clean.includes(",")) {
    const [last, first] = clean.split(",").map(s => s.trim());
    return { first: first ?? "", last };
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  return { first: parts.length > 1 ? parts.slice(0, -1).join("-") : "", last: parts.at(-1) ?? "" };
}

const fileSafe = s =>
  s
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

/** "Schul-Archiv/2026-10-18_Mustermann_Max_Attest.pdf" (relativ zum Download-Ordner) */
export function archiveFileName(date, author, fileName) {
  const { name, email } = parseAddress(author);
  const { first, last } = splitPersonName(name || email.split("@")[0]);
  const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const parts = [stamp, fileSafe(last), fileSafe(first), fileSafe(fileName) || "Anhang.pdf"].filter(Boolean);
  return `Schul-Archiv/${parts.join("_")}`;
}

/** Markdown-Aufgabe für IT-Ticket / To-Do. */
export function ticketMarkdown({ author, subject, date, text }) {
  const room = extractRoom(`${subject}\n${text}`);
  const { name, email } = parseAddress(author);
  const stamp = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
  return [
    `- [ ] ${subject || "(ohne Betreff)"}${room ? ` – Raum ${room}` : ""}`,
    `  - Von: ${name ? `${name} <${email}>` : email}`,
    `  - Eingang: ${stamp}`,
  ].join("\n");
}

// ------------------------------------------------------------ Auto-Tagging

/** Tag-Schlüssel aus dem Namen: "Beratung/Vertraulich" -> "ws_beratung_vertraulich" */
export function tagKey(label) {
  const slug = label
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `ws_${slug || "tag"}`;
}

/** Tag-Schlüssel aller Regeln, deren Schlagwörter im Text vorkommen. */
export function matchAutoTags(rules, text) {
  return rules.filter(r => r.keywords.length && matchKeywords(text, r.keywords).length).map(r => tagKey(r.tag));
}
