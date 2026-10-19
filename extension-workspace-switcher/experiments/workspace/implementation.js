/* Experiment-API "workspace" für Thunderbird 128+ (getestet mit 158).
 *
 * Die MailExtension-APIs können Konten im Ordnerbaum nicht ausblenden. Dieses
 * Experiment greift darum direkt auf das Hauptfenster (messenger.xhtml) und die
 * darin eingebetteten 3-Pane-Tabs (about:3pane) zu:
 *
 *   - data-workspace="school|private|all" auf dem Root-Element beider Dokumente
 *     (Vertrag mit theme-css/userChrome.css)
 *   - data-ws-privacy="blur" und data-ws-focus="true" auf denselben Roots
 *   - eigene Akzentfarben als --ws-custom-* im Inline-Style beider Root-Elemente
 *   - Klasse .workspace-hidden auf den Konto-Zeilen #folderTree li[data-server-key]
 *   - data-ws-folder-color + --ws-folder-color auf farbigen Ordnerzeilen
 *   - Schnell-Tab-Leiste #ws-pinned-folders-bar über #threadTree
 *   - Abruf ausgeblendeter Konten pausieren (keine Töne/Popups), mit Sicherung
 *   - Posteingang des primären Kontos anzeigen (focusInbox)
 *   - Kalender: auflisten, Sichtbarkeit, belegte Zeiten, Termin-Dialog
 *   - data-ws-compose="school|private" im Verfassen-Fenster
 *
 * Thunderbird baut den Ordnerbaum bei jedem Wechsel des Ordnermodus neu auf.
 * Ein MutationObserver pro Ordnerbaum setzt die Klassen danach erneut.
 * Beim Deaktivieren der Erweiterung wird alles zurückgenommen. */

"use strict";

/* global ChromeUtils, Ci, Services */

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { ExtensionSupport } = ChromeUtils.importESModule(
  "resource:///modules/ExtensionSupport.sys.mjs"
);
var { MailServices } = ChromeUtils.importESModule(
  "resource:///modules/MailServices.sys.mjs"
);

const LISTENER_ID = "school-workspace-suite";
const MESSENGER_URL = "chrome://messenger/content/messenger.xhtml";
const HIDDEN_CLASS = "workspace-hidden";
const BAR_ID = "ws-pinned-folders-bar";
const MESSAGE_FLAVOR = "text/x-moz-message";
// Sicherung der Abruf-Einstellungen gedämpfter Konten; überlebt Neustarts.
const MUTE_PREF = "extensions.school-workspace-suite.mutedServers";
// Nur diese Variablen und Werte gelangen in den Inline-Style der Chrome-Dokumente.
const ACCENT_KEY = /^--ws-custom-(school|private|all)(-dark)?$/;
const HEX = /^#[0-9a-f]{6}$/;

// Zustand der Erweiterung, gilt für alle Fenster.
const wsState = {
  mode: null,
  hiddenServerKeys: new Set(),
  accent: new Map(),
  privacy: false,
  focus: false,
  folderColors: new Map(),
  pinned: [],
  listening: false,
};
// Pro about:3pane-Dokument ein Observer; pro Hauptfenster ein Tab-Monitor.
const observers = new Map();
const tabMonitors = new Map();

function serverKeyOf(accountId) {
  try {
    return MailServices.accounts.getAccount(accountId)?.incomingServer?.key ?? null;
  } catch (e) {
    console.error(`[workspace] Konto ${accountId} nicht gefunden`, e);
    return null;
  }
}

/** Übernimmt nur gültige Schlüssel/Werte; alles andere wird verworfen. */
function sanitizeAccent(props) {
  const accent = new Map();
  if (props && typeof props === "object") {
    for (const [key, value] of Object.entries(props)) {
      if (ACCENT_KEY.test(key) && typeof value === "string" && HEX.test(value)) {
        accent.set(key, value);
      } else {
        console.error(`[workspace] Akzentfarbe verworfen: ${key}`);
      }
    }
  }
  return accent;
}

function sanitizeFolderColors(map) {
  const result = new Map();
  for (const [uri, color] of Object.entries(map ?? {})) {
    if (typeof color === "string" && HEX.test(color)) {
      result.set(uri, color);
    }
  }
  return result;
}

function sanitizePinned(list) {
  return (list ?? [])
    .filter(p => typeof p?.folderURI === "string" && typeof p.label === "string")
    .map(p => ({ folderURI: p.folderURI, label: p.label, color: HEX.test(p.color ?? "") ? p.color : null }));
}

function applyAccent(root) {
  for (const name of Array.from(root.style)) {
    if (name.startsWith("--ws-custom-") && !wsState.accent.has(name)) {
      root.style.removeProperty(name);
    }
  }
  for (const [name, value] of wsState.accent) {
    root.style.setProperty(name, value);
  }
}

function clearAccent(root) {
  for (const name of Array.from(root.style)) {
    if (name.startsWith("--ws-custom-")) {
      root.style.removeProperty(name);
    }
  }
}

function toggleAttr(el, name, value) {
  if (value) {
    el.setAttribute(name, value);
  } else {
    el.removeAttribute(name);
  }
}

function setRootAttribute(doc) {
  const root = doc?.documentElement;
  if (!root) {
    return;
  }
  toggleAttr(root, "data-workspace", wsState.mode);
  toggleAttr(root, "data-ws-privacy", wsState.privacy && "blur");
  toggleAttr(root, "data-ws-focus", wsState.focus && "true");
  applyAccent(root);
}

function clearRoot(root) {
  for (const name of ["data-workspace", "data-ws-privacy", "data-ws-focus"]) {
    root.removeAttribute(name);
  }
  clearAccent(root);
}

function applyFolderColor(row, color) {
  if (color) {
    row.dataset.wsFolderColor = color;
    row.style.setProperty("--ws-folder-color", color);
  } else if (row.dataset.wsFolderColor) {
    delete row.dataset.wsFolderColor;
    row.style.removeProperty("--ws-folder-color");
  }
}

function applyRows(doc) {
  const tree = doc.getElementById("folderTree");
  if (!tree) {
    return;
  }
  for (const row of tree.querySelectorAll("li[data-server-key]")) {
    row.classList.toggle(HIDDEN_CLASS, wsState.hiddenServerKeys.has(row.dataset.serverKey));
  }
  for (const row of tree.querySelectorAll('li[is="folder-tree-row"]')) {
    applyFolderColor(row, wsState.folderColors.get(row.uri));
  }
}

// ------------------------------------------------------------ Schnell-Tabs

function folderForURI(uri) {
  try {
    return MailServices.folderLookup.getFolderForURL(uri);
  } catch (e) {
    return null;
  }
}

/** Verschiebt (oder mit Strg kopiert) gezogene Nachrichten in `targetFolder`, wie about3Pane. */
function dropMessages(win, event, targetFolder) {
  const dt = event.dataTransfer;
  const headers = [];
  for (let i = 0; i < dt.mozItemCount; i++) {
    const uri = dt.mozGetDataAt(MESSAGE_FLAVOR, i);
    if (uri) {
      headers.push(MailServices.messageServiceFromURI(uri).messageURIToMsgHdr(uri));
    }
  }
  if (!headers.length) {
    return;
  }
  // shortcut: Nachrichten aus mehreren Ordnern (Suchansicht) gehen alle vom Ordner der ersten aus.
  const source = headers[0].folder;
  const isMove =
    dt.dropEffect !== "copy" &&
    source.canDeleteMessages &&
    !(source.flags & Ci.nsMsgFolderFlags.Newsgroup);
  MailServices.copy.copyMessages(source, headers, targetFolder, isMove, null, win.top.msgWindow, true);
}

function createTab(doc, pin) {
  const win = doc.defaultView;
  const button = doc.createElement("button");
  button.className = "ws-pinned-folder";
  button.dataset.folderUri = pin.folderURI;
  button.textContent = pin.label;
  button.title = `${pin.label} öffnen – Nachrichten hierher ziehen zum Verschieben`;
  if (pin.color) {
    button.style.setProperty("--ws-pin-color", pin.color);
  }
  if (win.gFolder?.URI === pin.folderURI) {
    button.classList.add("ws-current");
  }
  button.addEventListener("click", () => win.displayFolder?.(pin.folderURI));
  button.addEventListener("dragover", event => {
    if (event.dataTransfer.types.includes(MESSAGE_FLAVOR)) {
      event.preventDefault();
      button.classList.add("ws-drop-target");
    }
  });
  button.addEventListener("dragleave", () => button.classList.remove("ws-drop-target"));
  button.addEventListener("drop", event => {
    event.preventDefault();
    button.classList.remove("ws-drop-target");
    const target = folderForURI(pin.folderURI);
    if (!target) {
      console.error(`[workspace] Ordner nicht gefunden: ${pin.folderURI}`);
      return;
    }
    try {
      dropMessages(win, event, target);
    } catch (e) {
      console.error("[workspace] Verschieben fehlgeschlagen", e);
    }
  });
  return button;
}

/** Baut die Leiste neu (oder entfernt sie, wenn keine Tabs da sind). */
function renderPinnedBar(doc) {
  doc.getElementById(BAR_ID)?.remove();
  const tree = doc.getElementById("threadTree");
  if (!tree || !wsState.pinned.length) {
    return;
  }
  const bar = doc.createElement("div");
  bar.id = BAR_ID;
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Schnell-Tabs");
  for (const pin of wsState.pinned) {
    if (folderForURI(pin.folderURI)) {
      bar.append(createTab(doc, pin));
    }
  }
  tree.before(bar);
}

/** Markiert den Tab des angezeigten Ordners. */
function markCurrentTab(doc) {
  const current = doc.defaultView.gFolder?.URI;
  for (const button of doc.querySelectorAll(`#${BAR_ID} .ws-pinned-folder`)) {
    button.classList.toggle("ws-current", button.dataset.folderUri === current);
  }
}

// ------------------------------------------------------------ Dokumente und Fenster

/** Wendet den Zustand auf ein about:3pane-Dokument an und beobachtet dessen Ordnerbaum. */
function apply3PaneDocument(doc) {
  setRootAttribute(doc);
  applyRows(doc);
  renderPinnedBar(doc);
  if (observers.has(doc)) {
    return;
  }
  const tree = doc.getElementById("folderTree");
  if (!tree) {
    return;
  }
  const observer = new doc.defaultView.MutationObserver(() => applyRows(doc));
  observer.observe(tree, { childList: true, subtree: true });
  const onFolderSelect = () => markCurrentTab(doc);
  tree.addEventListener("select", onFolderSelect);
  observers.set(doc, { observer, tree, onFolderSelect });
  doc.defaultView.addEventListener(
    "unload",
    () => {
      observer.disconnect();
      observers.delete(doc);
    },
    { once: true }
  );
}

function is3PaneTab(tab) {
  return tab?.mode?.name === "mail3PaneTab";
}

/** Wendet den Zustand auf einen 3-Pane-Tab an, sobald dessen Dokument geladen ist. */
function apply3PaneTab(tab, attempt = 0) {
  const browser = tab.chromeBrowser;
  const doc = browser?.contentDocument;
  const ready =
    doc?.documentURI?.startsWith("about:3pane") &&
    doc.readyState !== "loading" &&
    doc.getElementById("folderTree");
  if (ready) {
    apply3PaneDocument(doc);
    return;
  }
  // about:3pane lädt asynchron; kurz warten, aber nicht endlos.
  if (attempt < 40 && browser?.ownerGlobal) {
    browser.ownerGlobal.setTimeout(() => apply3PaneTab(tab, attempt + 1), 250);
  }
}

function applyWindow(win) {
  setRootAttribute(win.document);
  const tabmail = win.document.getElementById("tabmail");
  for (const tab of tabmail?.tabInfo ?? []) {
    if (is3PaneTab(tab)) {
      apply3PaneTab(tab);
    }
  }
}

function setupWindow(win) {
  applyWindow(win);
  const tabmail = win.document.getElementById("tabmail");
  if (!tabmail || tabMonitors.has(win)) {
    return;
  }
  const monitor = {
    monitorName: LISTENER_ID,
    onTabTitleChanged() {},
    onTabClosing() {},
    onTabPersist() {},
    onTabRestored() {},
    onTabOpened(tab) {
      if (is3PaneTab(tab)) {
        apply3PaneTab(tab);
      }
    },
    onTabSwitched(tab) {
      if (is3PaneTab(tab)) {
        apply3PaneTab(tab);
      }
    },
  };
  tabmail.registerTabMonitor(monitor);
  tabMonitors.set(win, monitor);
}

function startListening() {
  if (wsState.listening) {
    return;
  }
  wsState.listening = true;
  // Ruft onLoadWindow auch für bereits offene Hauptfenster auf.
  ExtensionSupport.registerWindowListener(LISTENER_ID, {
    chromeURLs: [MESSENGER_URL],
    onLoadWindow: setupWindow,
    onUnloadWindow(win) {
      tabMonitors.delete(win);
    },
  });
}

function forEachMessengerWindow(fn) {
  for (const win of Services.wm.getEnumerator("mail:3pane")) {
    if (!win.closed) {
      fn(win);
    }
  }
}

// ------------------------------------------------------------ Konten stummschalten

function readMuteBackup() {
  try {
    return JSON.parse(Services.prefs.getStringPref(MUTE_PREF, "{}"));
  } catch (e) {
    return {};
  }
}

function writeMuteBackup(backup) {
  if (Object.keys(backup).length) {
    Services.prefs.setStringPref(MUTE_PREF, JSON.stringify(backup));
  } else {
    Services.prefs.clearUserPref(MUTE_PREF);
  }
}

function serverByKey(key) {
  try {
    return MailServices.accounts.getIncomingServer(key);
  } catch (e) {
    return null;
  }
}

/**
 * Thunderbird kennt keinen Benachrichtigungs-Schalter pro Konto. Darum wird für
 * ausgeblendete Konten der automatische Abruf (check_new_mail) und IMAP IDLE
 * pausiert: ohne Abruf keine Töne und Popups. Beim Einblenden kommen die
 * gesicherten Werte zurück. shortcut: IDLE-Änderung greift erst nach erneuter Verbindung.
 */
function syncMutedServers(muteKeys) {
  const backup = readMuteBackup();
  for (const [key, saved] of Object.entries(backup)) {
    if (muteKeys.has(key)) {
      continue;
    }
    const server = serverByKey(key);
    if (server) {
      server.doBiff = saved.doBiff;
      if (saved.useIdle !== null) {
        server.setBoolValue("use_idle", saved.useIdle);
      }
    }
    delete backup[key];
  }
  for (const key of muteKeys) {
    if (backup[key]) {
      continue;
    }
    const server = serverByKey(key);
    if (!server) {
      continue;
    }
    backup[key] = {
      doBiff: server.doBiff,
      useIdle: server.type === "imap" ? server.getBoolValue("use_idle") : null,
    };
    server.doBiff = false;
    if (server.type === "imap") {
      server.setBoolValue("use_idle", false);
    }
  }
  writeMuteBackup(backup);
}

// ------------------------------------------------------------ Verfassen-Fenster

const COMPOSE_ATTR = "data-ws-compose";

function clearComposeMarks() {
  for (const win of Services.wm.getEnumerator("msgcompose")) {
    win.document.documentElement.removeAttribute(COMPOSE_ATTR);
  }
}

// ------------------------------------------------------------ Aufräumen

/** Nimmt alle DOM-Änderungen zurück (Deaktivieren/Deinstallieren der Erweiterung). */
function resetAll() {
  if (wsState.listening) {
    ExtensionSupport.unregisterWindowListener(LISTENER_ID);
    wsState.listening = false;
  }
  for (const [win, monitor] of tabMonitors) {
    try {
      win.document.getElementById("tabmail")?.unregisterTabMonitor(monitor);
    } catch (e) {
      console.error("[workspace] Tab-Monitor nicht entfernt", e);
    }
  }
  tabMonitors.clear();
  for (const [doc, { observer, tree, onFolderSelect }] of observers) {
    observer.disconnect();
    tree.removeEventListener("select", onFolderSelect);
    if (doc.documentElement) {
      clearRoot(doc.documentElement);
    }
    for (const row of doc.querySelectorAll(`#folderTree li.${HIDDEN_CLASS}`)) {
      row.classList.remove(HIDDEN_CLASS);
    }
    for (const row of doc.querySelectorAll("#folderTree li[data-ws-folder-color]")) {
      applyFolderColor(row, null);
    }
    doc.getElementById(BAR_ID)?.remove();
  }
  observers.clear();
  forEachMessengerWindow(win => clearRoot(win.document.documentElement));
  clearComposeMarks();
  try {
    syncMutedServers(new Set());
  } catch (e) {
    console.error("[workspace] Abruf-Einstellungen nicht wiederhergestellt", e);
  }
  wsState.mode = null;
  wsState.hiddenServerKeys = new Set();
  wsState.accent = new Map();
  wsState.privacy = false;
  wsState.focus = false;
  wsState.folderColors = new Map();
  wsState.pinned = [];
}

function focusInbox(accountId) {
  const server = MailServices.accounts.getAccount(accountId)?.incomingServer;
  if (!server) {
    throw new ExtensionCommon.ExtensionError(`Konto ${accountId} nicht gefunden`);
  }
  const root = server.rootFolder;
  const target = root.getFolderWithFlags(Ci.nsMsgFolderFlags.Inbox) ?? root;

  const win = Services.wm.getMostRecentWindow("mail:3pane");
  const tabmail = win?.document.getElementById("tabmail");
  if (!tabmail) {
    return;
  }
  if (!is3PaneTab(tabmail.currentTabInfo)) {
    const first = tabmail.tabInfo.find(is3PaneTab);
    if (!first) {
      return;
    }
    tabmail.switchToTab(first);
  }
  const about3Pane = tabmail.currentAbout3Pane;
  if (typeof about3Pane?.displayFolder === "function") {
    // displayFolder klappt die Vorfahren auf und wählt den Ordner aus.
    about3Pane.displayFolder(target.URI);
  }
}

/** MailFolder (accountId + path) -> Ordner-URI, wie Thunderbird selbst rechnet. */
function folderURI(accountId, path) {
  try {
    const { folderPathToURI } = ChromeUtils.importESModule("resource:///modules/ExtensionAccounts.sys.mjs");
    return folderPathToURI(accountId, path);
  } catch (e) {
    // shortcut: Fallback stimmt nur für IMAP-Pfade ohne Sonderzeichen; ältere TB-Versionen.
    const root = MailServices.accounts.getAccount(accountId)?.incomingServer?.rootFolder;
    if (!root) {
      throw new ExtensionCommon.ExtensionError(`Konto ${accountId} nicht gefunden`);
    }
    return path === "/" ? root.URI : root.URI + path;
  }
}

// ------------------------------------------------------------ Kalender

function calUtils() {
  return ChromeUtils.importESModule("resource:///modules/calendar/calUtils.sys.mjs").cal;
}

function calendarById(cal, id) {
  const calendar = cal.manager.getCalendarById(id);
  if (!calendar) {
    throw new ExtensionCommon.ExtensionError(`Kalender ${id} nicht gefunden`);
  }
  return calendar;
}

function listCalendars() {
  const cal = calUtils();
  return cal.manager.getCalendars().map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    color: c.getProperty("color") ?? null,
    visible: c.getProperty("calendar-main-in-composite") !== false,
  }));
}

/** Blendet Kalender in Kalender-Ansicht und Today Pane ein/aus (wie die Checkbox der Kalenderliste). */
function syncCalendarVisibility(visibility) {
  const cal = calUtils();
  const win = Services.wm.getMostRecentWindow("mail:3pane");
  const composite = win ? cal.view.getCompositeCalendar(win) : null;
  for (const [id, visible] of Object.entries(visibility)) {
    const calendar = cal.manager.getCalendarById(id);
    if (!calendar) {
      continue;
    }
    if (composite) {
      if (visible) {
        composite.addCalendar(calendar);
      } else {
        composite.removeCalendar(calendar);
      }
    } else {
      calendar.setProperty("calendar-main-in-composite", visible);
    }
  }
}

/**
 * Belegte Zeiten in den Kalendern zwischen startMs und endMs: [{ start, end }] in ms.
 * Transparente Termine („frei“) zählen nicht. shortcut: Ganztägige Termine
 * (Geburtstage, Ferien) blockieren nicht; bei Bedarf als belegt werten.
 */
async function getBusyTimes(calendarIds, startMs, endMs) {
  const cal = calUtils();
  const tz = cal.dtz.defaultTimezone;
  const rangeStart = cal.dtz.jsDateToDateTime(new Date(startMs), tz);
  const rangeEnd = cal.dtz.jsDateToDateTime(new Date(endMs), tz);
  const filter = Ci.calICalendar.ITEM_FILTER_TYPE_EVENT | Ci.calICalendar.ITEM_FILTER_CLASS_OCCURRENCES;
  const busy = [];
  for (const id of calendarIds) {
    const calendar = cal.manager.getCalendarById(id);
    if (!calendar) {
      continue;
    }
    const items = await calendar.getItemsAsArray(filter, 0, rangeStart, rangeEnd);
    for (const item of items) {
      if (item.startDate?.isDate || item.getProperty("TRANSP") === "TRANSPARENT") {
        continue;
      }
      busy.push({
        start: cal.dtz.dateTimeToJsDate(item.startDate).getTime(),
        end: cal.dtz.dateTimeToJsDate(item.endDate ?? item.startDate).getTime(),
      });
    }
  }
  return busy;
}

function openNewEventDialog({ calendarId, title, startDate, endDate, description, allDay }) {
  const cal = calUtils();
  const { CalEvent } = ChromeUtils.importESModule("resource:///modules/CalEvent.sys.mjs");
  const win = Services.wm.getMostRecentWindow("mail:3pane");
  if (typeof win?.createEventWithDialog !== "function") {
    throw new ExtensionCommon.ExtensionError("Kalender-Dialog nicht verfügbar");
  }
  const calendar = calendarId ? calendarById(cal, calendarId) : null;
  const tz = cal.dtz.defaultTimezone;
  const event = new CalEvent();
  event.title = title ?? "";
  event.startDate = cal.dtz.jsDateToDateTime(new Date(startDate), tz);
  event.endDate = cal.dtz.jsDateToDateTime(new Date(endDate), tz);
  if (allDay) {
    event.startDate.isDate = true;
    event.endDate.isDate = true;
  }
  if (description) {
    event.setProperty("DESCRIPTION", description);
  }
  win.createEventWithDialog(calendar, null, null, null, event);
}

function openCalendarWizard() {
  const win = Services.wm.getMostRecentWindow("mail:3pane");
  if (!win) {
    throw new ExtensionCommon.ExtensionError("Kein Hauptfenster offen");
  }
  calUtils().window.openCalendarWizard(win);
}

// ------------------------------------------------------------ API

var workspace = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    if (isAppShutdown) {
      return;
    }
    resetAll();
  }

  getAPI(context) {
    return {
      workspace: {
        async apply(mode, hiddenAccountIds, accentProperties, options) {
          wsState.mode = mode;
          wsState.hiddenServerKeys = new Set(hiddenAccountIds.map(serverKeyOf).filter(Boolean));
          wsState.accent = sanitizeAccent(accentProperties);
          wsState.privacy = options?.privacyBlur === true;
          wsState.focus = options?.focus === true;
          wsState.folderColors = sanitizeFolderColors(options?.folderColors);
          wsState.pinned = sanitizePinned(options?.pinnedFolders);
          startListening();
          forEachMessengerWindow(applyWindow);
          try {
            syncMutedServers(options?.muteHidden === false ? new Set() : wsState.hiddenServerKeys);
          } catch (e) {
            console.error("[workspace] Konten nicht stummgeschaltet", e);
          }
        },
        async focusInbox(accountId) {
          focusInbox(accountId);
        },
        async getFolderURI(accountId, path) {
          return folderURI(accountId, path);
        },
        async markCompose(tabId, workspaceName) {
          const win = context.extension.tabManager.get(tabId)?.nativeTab;
          const root = win?.document?.documentElement;
          if (root) {
            toggleAttr(root, COMPOSE_ATTR, ["school", "private"].includes(workspaceName) && workspaceName);
          }
        },
        async listCalendars() {
          return listCalendars();
        },
        async syncCalendarVisibility(visibility) {
          syncCalendarVisibility(visibility);
        },
        async getBusyTimes(calendarIds, startMs, endMs) {
          return getBusyTimes(calendarIds, startMs, endMs);
        },
        async openNewEventDialog(details) {
          openNewEventDialog(details);
        },
        async openCalendarWizard() {
          openCalendarWizard();
        },
      },
    };
  }
};
