// Hintergrundlogik: Workspace wechseln, Absender wählen, vor dem Senden prüfen,
// später senden, Auto-Tags, Nachrichten-Aktionen, Kalender.
//
// Einziger Weg, Einstellungen zu ändern, ist das Speichern in storage.local.
// storage.onChanged wendet sie dann an. So landen Klick, Tastenkürzel,
// Kontextmenü und Options-Seite alle im selben Codepfad.
import {
  MODES,
  MODE_LABELS,
  MODE_COLORS,
  DONE_TAG,
  nextMode,
  normalizeSettings,
  hiddenAccountIds,
  primaryAccountId,
  identityForCompose,
  workspaceOfIdentity,
  accentProperties,
  isFocusActive,
  pinnedFoldersFor,
  calendarVisibility,
  evaluateSendGuard,
  moveRecipientsToBcc,
  footerChange,
  stripPlainTextQuotes,
  QUOTE_SELECTORS,
  computeFreeSlots,
  formatSlot,
  formatDateTime,
  dueDrafts,
  matchAutoTags,
  tagKey,
  htmlToText,
  archiveFileName,
  extractDateTime,
  ticketMarkdown,
} from "./shared/logic.mjs";
import { STORAGE_KEY, loadSettings, updateSettings, listAccounts } from "./shared/settings.mjs";

const MENU_OPTIONS = "ws-options";
const MENU_PRIVACY = "ws-privacy";
const MENU_FOCUS = "ws-focus";
const FOCUS_MINUTES = 60;
const ALARM_FOCUS = "focus-end";
const ALARM_SEND = "send:";
const FOLDER_COLORS = {
  Rot: "#dc2626",
  Orange: "#ea580c",
  Gelb: "#ca8a04",
  Grün: "#16a34a",
  Blau: "#2563eb",
  Lila: "#7c3aed",
};

// ------------------------------------------------------------ Modus anwenden

async function applyMode(settings, { focus }) {
  const accounts = await listAccounts();
  const mode = settings.mode;
  try {
    await browser.workspace.apply(
      mode,
      hiddenAccountIds(mode, accounts, settings.assignments),
      accentProperties(settings.colors),
      {
        privacyBlur: settings.privacyBlur,
        focus: isFocusActive(settings, Date.now()),
        folderColors: settings.folderColors,
        pinnedFolders: pinnedFoldersFor(mode, settings.pinnedFolders).map(p => ({
          folderURI: p.folderURI,
          label: p.label,
          color: p.color ?? settings.folderColors[p.folderURI] ?? undefined,
        })),
      }
    );
    if (focus) {
      const accountId = primaryAccountId(mode, accounts, settings.assignments, settings.defaultIdentity);
      if (accountId) {
        await browser.workspace.focusInbox(accountId);
      }
    }
  } catch (e) {
    console.error("[workspace] Anwenden fehlgeschlagen", e);
  }
  const visibility = calendarVisibility(mode, settings.calendarAssignments);
  if (Object.keys(visibility).length) {
    browser.workspace.syncCalendarVisibility(visibility).catch(e => console.error("[workspace] Kalender", e));
  }
  await updateUi(settings);
}

// ------------------------------------------------------------ Toolbar-Icon

const ICON_SIZES = [16, 32];

/** Rendert icons/<mode>.svg in der Farbe `hex` als ImageData je Größe. */
async function tintedIcon(mode, hex) {
  const svg = await (await fetch(`icons/${mode}.svg`)).text();
  const imageData = {};
  for (const size of ICON_SIZES) {
    // Feste Größe im SVG, sonst zeichnet Gecko es nicht auf das Canvas.
    const sized = svg
      .replaceAll(MODE_COLORS[mode], hex)
      .replace("<svg ", `<svg width="${size}" height="${size}" `);
    const img = new Image(size, size);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  return imageData;
}

async function updateIcon(mode, colors) {
  const hex = colors?.[mode];
  if (hex) {
    try {
      await browser.browserAction.setIcon({ imageData: await tintedIcon(mode, hex) });
      return;
    } catch (e) {
      console.error("[workspace] Icon nicht eingefärbt", e);
    }
  }
  await browser.browserAction.setIcon({ path: `icons/${mode}.svg` });
}

async function updateUi(settings) {
  const { mode, colors } = settings;
  const label = MODE_LABELS[mode];
  await browser.browserAction.setLabel({ label });
  await browser.browserAction.setTitle({ title: `Workspace: ${label} – klicken oder Strg+Umschalt+Y zum Wechseln` });
  await updateIcon(mode, colors);
  for (const m of MODES) {
    await browser.menus.update(`ws-mode-${m}`, { checked: m === mode });
  }
  await browser.menus.update(MENU_PRIVACY, { checked: settings.privacyBlur });
  await browser.menus.update(MENU_FOCUS, { checked: isFocusActive(settings, Date.now()) });
}

function setMode(mode) {
  return updateSettings(s => {
    s.mode = mode;
  });
}

async function cycleMode() {
  const settings = await loadSettings();
  await setMode(nextMode(settings.mode));
}

function notify(title, message) {
  return browser.notifications
    .create({ type: "basic", iconUrl: "icons/school.svg", title, message })
    .catch(e => console.error("[workspace] Benachrichtigung", e));
}

// ------------------------------------------------------------ Bedienung

browser.browserAction.onClicked.addListener(() => cycleMode());

browser.commands.onCommand.addListener(command => {
  if (command === "cycle-workspace") {
    cycleMode();
  }
});

for (const m of MODES) {
  browser.menus.create({
    id: `ws-mode-${m}`,
    type: "radio",
    title: MODE_LABELS[m],
    contexts: ["browser_action"],
  });
}
browser.menus.create({ id: "ws-sep", type: "separator", contexts: ["browser_action"] });
browser.menus.create({ id: MENU_PRIVACY, type: "checkbox", title: "Sichtschutz (Klassenzimmer)", contexts: ["browser_action"] });
browser.menus.create({ id: MENU_FOCUS, type: "checkbox", title: `Fokus-Modus (${FOCUS_MINUTES} Min.)`, contexts: ["browser_action"] });
browser.menus.create({ id: "ws-sep2", type: "separator", contexts: ["browser_action"] });
browser.menus.create({ id: MENU_OPTIONS, title: "Einstellungen …", contexts: ["browser_action"] });

// Ordner-Kontextmenü: Schnell-Tab anheften und Ordnerfarbe.
browser.menus.create({ id: "ws-pin", title: "Als Schnell-Tab anheften", contexts: ["folder_pane"] });
browser.menus.create({ id: "ws-pin-school", parentId: "ws-pin", title: "Schule", contexts: ["folder_pane"] });
browser.menus.create({ id: "ws-pin-private", parentId: "ws-pin", title: "Privat", contexts: ["folder_pane"] });
browser.menus.create({ id: "ws-pin-remove", parentId: "ws-pin", title: "Schnell-Tab lösen", contexts: ["folder_pane"] });
browser.menus.create({ id: "ws-color", title: "Ordnerfarbe", contexts: ["folder_pane"] });
for (const [name, hex] of Object.entries(FOLDER_COLORS)) {
  browser.menus.create({ id: `ws-color-${hex}`, parentId: "ws-color", title: name, contexts: ["folder_pane"] });
}
browser.menus.create({ id: "ws-color-none", parentId: "ws-color", title: "Keine Farbe", contexts: ["folder_pane"] });

async function toggleFocus(on) {
  await updateSettings(s => {
    s.focusModeUntil = on ? Date.now() + FOCUS_MINUTES * 60000 : null;
  });
}

async function onFolderMenu(menuItemId, folder) {
  if (!folder?.accountId) {
    return;
  }
  const folderURI = await browser.workspace.getFolderURI(folder.accountId, folder.path);
  await updateSettings(s => {
    if (menuItemId === "ws-pin-school" || menuItemId === "ws-pin-private") {
      s.pinnedFolders = s.pinnedFolders.filter(p => p.folderURI !== folderURI);
      s.pinnedFolders.push({
        folderURI,
        label: folder.name,
        color: null,
        workspace: menuItemId === "ws-pin-school" ? "school" : "private",
      });
    } else if (menuItemId === "ws-pin-remove") {
      s.pinnedFolders = s.pinnedFolders.filter(p => p.folderURI !== folderURI);
    } else if (menuItemId === "ws-color-none") {
      delete s.folderColors[folderURI];
    } else if (menuItemId.startsWith("ws-color-#")) {
      s.folderColors[folderURI] = menuItemId.slice("ws-color-".length);
    }
  });
}

browser.menus.onClicked.addListener(async info => {
  const id = String(info.menuItemId);
  try {
    if (id === MENU_OPTIONS) {
      await browser.runtime.openOptionsPage();
    } else if (id === MENU_PRIVACY) {
      await updateSettings(s => {
        s.privacyBlur = info.checked;
      });
    } else if (id === MENU_FOCUS) {
      await toggleFocus(info.checked);
    } else if (id.startsWith("ws-pin-") || id.startsWith("ws-color-")) {
      await onFolderMenu(id, info.selectedFolders?.[0] ?? info.selectedFolder);
    } else {
      const mode = id.replace("ws-mode-", "");
      if (MODES.includes(mode)) {
        await setMode(mode);
      }
    }
  } catch (e) {
    console.error("[workspace] Menü", e);
  }
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) {
    return;
  }
  const before = normalizeSettings(changes[STORAGE_KEY].oldValue);
  const after = normalizeSettings(changes[STORAGE_KEY].newValue);
  applyMode(after, { focus: before.mode !== after.mode });
  syncAlarms(after);
  if (JSON.stringify(before.autoTagRules) !== JSON.stringify(after.autoTagRules)) {
    ensureTags(after).catch(e => console.error("[workspace] Tags", e));
  }
});

// Konten hinzugefügt, entfernt oder umbenannt: Ausblendung neu berechnen.
for (const event of ["onCreated", "onDeleted", "onUpdated"]) {
  browser.accounts[event]?.addListener(async () => applyMode(await loadSettings(), { focus: false }));
}

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    browser.runtime.openOptionsPage();
  }
});

// ------------------------------------------------------------ Verfassen-Fenster

function isEmptyNewMessage(details) {
  const empty = v => (Array.isArray(v) ? v.length === 0 : !v);
  return details.type === "new" && empty(details.to) && empty(details.cc) && empty(details.bcc) && !details.subject;
}

/** Färbt den Kopf des Verfassen-Fensters nach dem Workspace der Absender-Identität. */
async function markCompose(tabId, identityId) {
  const settings = await loadSettings();
  const accounts = await listAccounts();
  const ws = workspaceOfIdentity(identityId, accounts, settings.assignments);
  await browser.workspace.markCompose(tabId, ws === "both" ? "" : ws);
}

browser.tabs.onCreated.addListener(async tab => {
  if (tab.type !== "messageCompose") {
    return;
  }
  try {
    const details = await browser.compose.getComposeDetails(tab.id);
    let identityId = details.identityId;
    if (isEmptyNewMessage(details)) {
      const settings = await loadSettings();
      const accounts = await listAccounts();
      const wanted = identityForCompose(settings.mode, accounts, settings.assignments, settings.defaultIdentity);
      if (wanted && wanted !== identityId) {
        await browser.compose.setComposeDetails(tab.id, { identityId: wanted });
        identityId = wanted;
      }
    }
    await markCompose(tab.id, identityId);
  } catch (e) {
    console.error("[workspace] Verfassen-Fenster nicht vorbereitet", e);
  }
});

browser.compose.onIdentityChanged.addListener((tab, identityId) => {
  markCompose(tab.id, identityId).catch(e => console.error("[workspace] Absender-Markierung", e));
});

// ------------------------------------------------------------ Sende-Wächter (ein Dialog)

const pendingConfirms = new Map(); // requestId -> { resolve, windowId }
const autoSendTabs = new Set(); // Tabs, die „Später senden“ gerade selbst abschickt

function askConfirm(params) {
  return new Promise(resolve => {
    const requestId = crypto.randomUUID();
    const query = new URLSearchParams({ requestId, data: JSON.stringify(params) });
    pendingConfirms.set(requestId, { resolve, windowId: null });
    browser.windows
      .create({
        type: "popup",
        url: `confirm/confirm.html?${query}`,
        width: 520,
        height: 460,
      })
      .then(win => {
        const entry = pendingConfirms.get(requestId);
        if (entry) {
          entry.windowId = win.id;
        }
      })
      .catch(e => {
        console.error("[workspace] Dialog nicht geöffnet", e);
        pendingConfirms.delete(requestId);
        resolve({ action: "send" }); // Senden nicht blockieren, wenn der Dialog nicht aufgeht
      });
  });
}

function settleConfirm(requestId, answer) {
  const entry = pendingConfirms.get(requestId);
  if (!entry) {
    return;
  }
  pendingConfirms.delete(requestId);
  entry.resolve(answer);
}

// Fenster geschlossen ohne Antwort: nicht senden.
browser.windows.onRemoved.addListener(windowId => {
  for (const [requestId, entry] of pendingConfirms) {
    if (entry.windowId === windowId) {
      settleConfirm(requestId, { action: "cancel" });
    }
  }
});

function stripHtmlQuotes(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll(QUOTE_SELECTORS).forEach(el => el.remove());
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

browser.compose.onBeforeSend.addListener(async (tab, details) => {
  if (autoSendTabs.has(tab.id)) {
    return {};
  }
  const settings = await loadSettings();
  const accounts = await listAccounts();
  const issues = evaluateSendGuard({ settings, accounts, details, now: new Date() });
  let answer = { action: "send" };
  if (issues.length) {
    const fromIdentity = accounts.flatMap(a => a.identities).find(i => i.id === details.identityId);
    answer = await askConfirm({ mode: settings.mode, from: fromIdentity?.email ?? "", issues });
  }
  if (answer.action === "cancel") {
    return { cancel: true };
  }

  const changes = {};
  const bcc = issues.find(i => i.type === "bcc");
  if (bcc && answer.moveBcc) {
    Object.assign(changes, moveRecipientsToBcc(details, bcc.recipients));
  }
  if (issues.some(i => i.type === "sensitive") && answer.stripQuotes) {
    if (details.isPlainText) {
      changes.plainTextBody = stripPlainTextQuotes(details.plainTextBody ?? "");
    } else {
      changes.body = stripHtmlQuotes(details.body ?? "");
    }
  }
  if (workspaceOfIdentity(details.identityId, accounts, settings.assignments) === "school") {
    const footer = footerChange({ ...details, ...changes }, settings.availabilityFooter, settings.guardConfig.internalDomains);
    Object.assign(changes, footer);
  }

  if (answer.action === "later") {
    // Erst den Sendevorgang abbrechen, dann Änderungen übernehmen und als Entwurf planen.
    setTimeout(async () => {
      try {
        if (Object.keys(changes).length) {
          await browser.compose.setComposeDetails(tab.id, changes);
        }
        await scheduleSend(tab.id, answer.sendAt);
      } catch (e) {
        console.error("[workspace] Später senden fehlgeschlagen", e);
        notify("Später senden fehlgeschlagen", e.message);
      }
    }, 300);
    return { cancel: true };
  }
  return Object.keys(changes).length ? { details: changes } : {};
});

// ------------------------------------------------------------ Später senden

/** Speichert die Nachricht als Entwurf, merkt sie zum Senden vor und schließt das Fenster. */
async function scheduleSend(tabId, sendAt) {
  if (!Number.isFinite(sendAt) || sendAt <= Date.now()) {
    throw new Error("Sendezeitpunkt liegt nicht in der Zukunft");
  }
  const details = await browser.compose.getComposeDetails(tabId);
  const saved = await browser.compose.saveMessage(tabId, { mode: "draft" });
  const message = saved?.messages?.[0];
  if (!message?.headerMessageId) {
    throw new Error("Entwurf wurde nicht gespeichert");
  }
  await updateSettings(s => {
    s.scheduledDrafts.push({
      id: crypto.randomUUID(),
      headerMessageId: message.headerMessageId,
      accountId: message.folder?.accountId ?? null,
      sendAt,
      subject: details.subject ?? "",
    });
  });
  const tab = await browser.tabs.get(tabId);
  await browser.windows.remove(tab.windowId);
  notify("Später senden", `„${details.subject || "(ohne Betreff)"}“ geht am ${formatDateTime(new Date(sendAt))} raus.`);
}

/** Alarme spiegeln settings.scheduledDrafts und den Fokus-Modus (Alarme überleben keinen Neustart). */
async function syncAlarms(settings) {
  const wanted = new Map(settings.scheduledDrafts.map(d => [ALARM_SEND + d.id, d.sendAt]));
  if (settings.focusModeUntil) {
    wanted.set(ALARM_FOCUS, settings.focusModeUntil);
  }
  for (const alarm of await browser.alarms.getAll()) {
    if (wanted.get(alarm.name) !== alarm.scheduledTime) {
      await browser.alarms.clear(alarm.name);
    } else {
      wanted.delete(alarm.name);
    }
  }
  for (const [name, when] of wanted) {
    browser.alarms.create(name, { when: Math.max(when, Date.now() + 1000) });
  }
}

async function findDraft(headerMessageId) {
  const result = await browser.messages.query({ headerMessageId });
  const messages = Array.isArray(result) ? result : result.messages;
  return messages.find(m => m.folder?.specialUse?.includes("drafts") || m.folder?.type === "drafts") ?? messages[0];
}

async function sendScheduled(draftId) {
  const settings = await loadSettings();
  const draft = settings.scheduledDrafts.find(d => d.id === draftId);
  if (!draft || !dueDrafts([draft], Date.now()).length) {
    return;
  }
  // Zuerst austragen: ein Fehler soll nicht bei jedem Start erneut senden.
  await updateSettings(s => {
    s.scheduledDrafts = s.scheduledDrafts.filter(d => d.id !== draftId);
  });
  const title = draft.subject || "(ohne Betreff)";
  const message = await findDraft(draft.headerMessageId).catch(() => null);
  if (!message) {
    notify("Später senden fehlgeschlagen", `Entwurf „${title}“ nicht gefunden.`);
    return;
  }
  let tab;
  try {
    tab = await browser.compose.beginNew(message.id);
    autoSendTabs.add(tab.id);
    await browser.compose.sendMessage(tab.id, { mode: "sendNow" });
    // beginNew öffnet den Entwurf als Kopie; das Original in den Papierkorb.
    await browser.messages.delete([message.id], false);
    notify("Gesendet", `„${title}“ wurde wie geplant gesendet.`);
  } catch (e) {
    console.error("[workspace] Geplantes Senden fehlgeschlagen", e);
    notify("Später senden fehlgeschlagen", `„${title}“: ${e.message}. Das Fenster bleibt offen.`);
  } finally {
    if (tab) {
      autoSendTabs.delete(tab.id);
    }
  }
}

browser.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name === ALARM_FOCUS) {
    await updateSettings(s => {
      if (s.focusModeUntil && s.focusModeUntil <= Date.now()) {
        s.focusModeUntil = null;
      }
    });
  } else if (alarm.name.startsWith(ALARM_SEND)) {
    await sendScheduled(alarm.name.slice(ALARM_SEND.length));
  }
});

// ------------------------------------------------------------ Kalender: freie Termine

async function getNextFreeSlots(settings) {
  const ids = Object.entries(settings.calendarAssignments)
    .filter(([, a]) => a === "school" || a === "both")
    .map(([id]) => id);
  if (!ids.length) {
    return [];
  }
  const now = new Date();
  // 14 Werktage passen sicher in 21 Kalendertage.
  const busy = await browser.workspace.getBusyTimes(ids, now.getTime(), now.getTime() + 21 * 86400000);
  return computeFreeSlots(busy, settings.freeSlotConfig, now).map(s => formatSlot(s.start, s.end));
}

// ------------------------------------------------------------ Auto-Tagging

async function ensureTags(settings) {
  const existing = new Set((await browser.messages.tags.list()).map(t => t.key));
  for (const { tag, color } of [...settings.autoTagRules, DONE_TAG]) {
    const key = tagKey(tag);
    if (!existing.has(key)) {
      await browser.messages.tags.create(key, tag, color);
      existing.add(key);
    }
  }
}

async function addTags(message, keys) {
  const tags = [...new Set([...(message.tags ?? []), ...keys])];
  if (tags.length !== (message.tags ?? []).length) {
    await browser.messages.update(message.id, { tags });
  }
}

browser.messages.onNewMailReceived.addListener(async (folder, messageList) => {
  try {
    const settings = await loadSettings();
    if ((settings.assignments[folder.accountId] ?? "both") !== "school") {
      return;
    }
    await ensureTags(settings);
    let page = messageList;
    for (;;) {
      for (const message of page.messages) {
        const keys = matchAutoTags(settings.autoTagRules, `${message.subject}\n${message.author}`);
        if (keys.length) {
          await addTags(message, keys);
        }
      }
      if (!page.id) {
        break;
      }
      page = await browser.messages.continueList(page.id);
    }
  } catch (e) {
    console.error("[workspace] Auto-Tagging", e);
  }
});

// ------------------------------------------------------------ Nachrichten-Aktionen

async function messageText(messageId) {
  try {
    const parts = await browser.messages.listInlineTextParts(messageId);
    const plain = parts.find(p => p.contentType === "text/plain");
    if (plain) {
      return plain.content;
    }
    const html = parts.find(p => p.contentType === "text/html");
    return html ? htmlToText(html.content) : "";
  } catch (e) {
    console.error("[workspace] Nachrichtentext nicht gelesen", e);
    return "";
  }
}

async function archivePdfs(messageId) {
  const message = await browser.messages.get(messageId);
  const pdfs = (await browser.messages.listAttachments(messageId)).filter(
    a => a.contentType === "application/pdf" || /\.pdf$/i.test(a.name)
  );
  if (!pdfs.length) {
    throw new Error("Keine PDF-Anhänge in dieser Nachricht");
  }
  for (const attachment of pdfs) {
    const file = await browser.messages.getAttachmentFile(messageId, attachment.partName);
    const url = URL.createObjectURL(file);
    try {
      await browser.downloads.download({
        url,
        filename: archiveFileName(new Date(message.date), message.author, attachment.name),
        conflictAction: "uniquify",
        saveAs: false,
      });
    } finally {
      // Der Download liest die Blob-URL asynchron; erst später freigeben.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }
  await ensureTags(await loadSettings());
  await addTags(message, [tagKey(DONE_TAG.tag)]);
  return `${pdfs.length} PDF(s) in „Schul-Archiv“ gespeichert.`;
}

async function createEventFromMessage(messageId) {
  const settings = await loadSettings();
  const message = await browser.messages.get(messageId);
  const text = await messageText(messageId);
  const found = extractDateTime(`${message.subject}\n${text}`, new Date());
  const fallback = new Date();
  fallback.setHours(fallback.getHours() + 1, 0, 0, 0);
  const start = found?.start ?? fallback;
  const end = found?.end ?? new Date(start.getTime() + 45 * 60000);
  const calendarId = Object.entries(settings.calendarAssignments).find(([, a]) => a === "school")?.[0];
  await browser.workspace.openNewEventDialog({
    calendarId,
    title: message.subject,
    startDate: start.getTime(),
    endDate: end.getTime(),
    allDay: found?.allDay ?? false,
    description: `Von: ${message.author}\n\n${text.trim().slice(0, 1500)}`,
  });
  return found ? "Termin-Dialog geöffnet." : "Kein Datum gefunden – bitte im Dialog eintragen.";
}

async function ticketFromMessage(messageId) {
  const message = await browser.messages.get(messageId);
  return ticketMarkdown({
    author: message.author,
    subject: message.subject,
    date: new Date(message.date),
    text: await messageText(messageId),
  });
}

// ------------------------------------------------------------ Nachrichten von Seiten

browser.runtime.onMessage.addListener(message => {
  switch (message?.type) {
    case "workspace-confirm":
      settleConfirm(message.requestId, message.answer);
      return undefined;
    case "free-slots":
      return loadSettings().then(getNextFreeSlots);
    case "schedule-send":
      return scheduleSend(message.tabId, message.sendAt);
    case "list-calendars":
      return browser.workspace.listCalendars();
    case "open-calendar-wizard":
      return browser.workspace.openCalendarWizard();
    case "send-now":
      return updateSettings(s => {
        const d = s.scheduledDrafts.find(x => x.id === message.id);
        if (d) {
          d.sendAt = Date.now();
        }
      });
    case "message-action":
      return MESSAGE_ACTIONS[message.action]?.(message.messageId);
    default:
      return undefined;
  }
});

const MESSAGE_ACTIONS = {
  archive: archivePdfs,
  event: createEventFromMessage,
  ticket: ticketFromMessage,
};

// Dieselben Aktionen im Rechtsklick-Menü der Nachrichtenliste: funktioniert auch,
// wenn der Kopfbereich-Button fehlt (z. B. andere Nachrichtenansicht).
browser.menus.create({ id: "ws-msg", title: "Schul-Aktionen", contexts: ["message_list"] });
browser.menus.create({ id: "ws-msg-archive", parentId: "ws-msg", title: "PDF/Attest archivieren", contexts: ["message_list"] });
browser.menus.create({ id: "ws-msg-event", parentId: "ws-msg", title: "Termin im Schul-Kalender anlegen", contexts: ["message_list"] });
browser.menus.create({ id: "ws-msg-ticket", parentId: "ws-msg", title: "Als IT-Ticket / To-Do kopieren", contexts: ["message_list"] });

browser.menus.onClicked.addListener(async info => {
  const action = String(info.menuItemId).replace("ws-msg-", "");
  if (!String(info.menuItemId).startsWith("ws-msg-") || !MESSAGE_ACTIONS[action]) {
    return;
  }
  const message = info.selectedMessages?.messages?.[0];
  if (!message) {
    return;
  }
  try {
    const result = await MESSAGE_ACTIONS[action](message.id);
    if (action === "ticket") {
      // clipboardWrite erlaubt das Schreiben ohne Nutzergeste auf Erweiterungsseiten.
      await navigator.clipboard.writeText(result);
      notify("Schul-Aktionen", "Ticket in die Zwischenablage kopiert.");
    } else {
      notify("Schul-Aktionen", result);
    }
  } catch (e) {
    console.error("[workspace] Schul-Aktion", e);
    notify("Schul-Aktion fehlgeschlagen", e.message);
  }
});

// ------------------------------------------------------------ Start

loadSettings().then(settings => {
  applyMode(settings, { focus: false });
  syncAlarms(settings);
  ensureTags(settings).catch(e => console.error("[workspace] Tags", e));
});
