// Options-Seite: Konten, Absender, Sende-Wächter, Später senden, Klassenzimmer,
// Farben, Schnell-Tabs, Kalender, Auto-Tags, Textbausteine.
// Jede Änderung wird sofort gespeichert; Textfelder mit kurzer Verzögerung.
import {
  MODES,
  MODE_LABELS,
  DEFAULT_SNIPPETS,
  normalizeSettings,
  effectiveColors,
  formatDateTime,
  isFocusActive,
} from "../shared/logic.mjs";
import { STORAGE_KEY, loadSettings, saveSettings, listAccounts, applyPageColors } from "../shared/settings.mjs";

const ASSIGNMENT_LABELS = { school: "Schule", private: "Privat", both: "Beide" };

let settings;
let accounts = [];
let saveTimer = null;

const $ = sel => document.querySelector(sel);

function showStatus(text) {
  $("#status").textContent = text;
}

async function save() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    await saveSettings(settings);
    showStatus(`Gespeichert um ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`);
  } catch (e) {
    console.error(e);
    showStatus(`Speichern fehlgeschlagen: ${e.message}`);
  }
}

function saveLater() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 400);
}

function renderMode() {
  const pill = $("#current-mode");
  pill.textContent = MODE_LABELS[settings.mode];
  pill.className = `pill ${settings.mode}`;
}

function renderAccounts() {
  const tbody = $("#accounts tbody");
  tbody.replaceChildren();
  for (const acc of accounts) {
    const tr = document.createElement("tr");

    const name = document.createElement("td");
    name.textContent = acc.name;

    const emails = document.createElement("td");
    emails.className = "dim";
    emails.textContent = acc.identities.map(i => i.email).join(", ") || "–";

    const cell = document.createElement("td");
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Workspace für ${acc.name}`);
    for (const [value, label] of Object.entries(ASSIGNMENT_LABELS)) {
      select.append(new Option(label, value));
    }
    select.value = settings.assignments[acc.id] ?? "both";
    select.addEventListener("change", () => {
      settings.assignments[acc.id] = select.value;
      renderIdentities();
      save();
    });
    cell.append(select);

    tr.append(name, emails, cell);
    tbody.append(tr);
  }
}

function renderIdentities() {
  for (const mode of ["school", "private"]) {
    const select = $(`#identity-${mode}`);
    select.replaceChildren(new Option(`Automatisch (erstes ${MODE_LABELS[mode]}-Konto)`, ""));
    for (const acc of accounts) {
      const a = settings.assignments[acc.id] ?? "both";
      if (a !== mode) {
        continue;
      }
      for (const idn of acc.identities) {
        const label = idn.name ? `${idn.name} <${idn.email}>` : idn.email;
        select.append(new Option(label, idn.id));
      }
    }
    const current = settings.defaultIdentity[mode] ?? "";
    select.value = [...select.options].some(o => o.value === current) ? current : "";
  }
}

function renderColors() {
  const colors = effectiveColors(settings.colors);
  for (const mode of MODES) {
    $(`#color-${mode}`).value = colors[mode];
    $(`.color-reset[data-mode="${mode}"]`).disabled = settings.colors[mode] === null;
  }
  applyPageColors(settings.colors);
}

function renderSnippets() {
  const list = $("#snippets");
  list.replaceChildren();
  const template = $("#snippet-template");
  settings.snippets.forEach((snippet, index) => {
    const li = template.content.firstElementChild.cloneNode(true);
    const title = li.querySelector(".snippet-title");
    const text = li.querySelector(".snippet-text");
    title.value = snippet.title;
    text.value = snippet.text;
    title.addEventListener("input", () => {
      snippet.title = title.value;
      saveLater();
    });
    text.addEventListener("input", () => {
      snippet.text = text.value;
      saveLater();
    });
    li.querySelector(".snippet-delete").addEventListener("click", () => {
      settings.snippets.splice(index, 1);
      renderSnippets();
      save();
    });
    list.append(li);
  });
}

function wireStaticControls() {
  for (const mode of ["school", "private"]) {
    $(`#identity-${mode}`).addEventListener("change", e => {
      settings.defaultIdentity[mode] = e.target.value || null;
      save();
    });
  }
  for (const mode of MODES) {
    const input = $(`#color-${mode}`);
    // input: Vorschau auf dieser Seite; change: speichern, wenn der Farbwähler schließt.
    input.addEventListener("input", () => {
      settings.colors[mode] = input.value.toLowerCase();
      applyPageColors(settings.colors);
    });
    input.addEventListener("change", () => {
      settings.colors[mode] = input.value.toLowerCase();
      renderColors();
      save();
    });
    $(`.color-reset[data-mode="${mode}"]`).addEventListener("click", () => {
      settings.colors[mode] = null;
      renderColors();
      save();
    });
  }
  $("#guard").addEventListener("change", e => {
    settings.guardEnabled = e.target.checked;
    save();
  });
  $("#add-snippet").addEventListener("click", () => {
    settings.snippets.push({ id: crypto.randomUUID(), title: "Neuer Baustein", text: "" });
    renderSnippets();
    save();
    $("#snippets li:last-child .snippet-title").select();
  });
  $("#reset-snippets").addEventListener("click", () => {
    if (!confirm("Alle Textbausteine durch die Standardvorlagen ersetzen?")) {
      return;
    }
    settings.snippets = DEFAULT_SNIPPETS.map(s => ({ ...s }));
    renderSnippets();
    save();
  });
  // Ungespeicherte Texteingaben beim Schließen sichern.
  window.addEventListener("pagehide", () => {
    if (saveTimer) {
      save();
    }
  });
}

// ------------------------------------------------------------ v0.2.0-Sektionen

const csv = text =>
  text
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const hoursToTime = h => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const timeToHours = t => {
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
};
const WEEKDAY_LABELS = [
  [1, "Mo"],
  [2, "Di"],
  [3, "Mi"],
  [4, "Do"],
  [5, "Fr"],
  [6, "Sa"],
  [0, "So"],
];

function renderGuard() {
  const g = settings.guardConfig;
  $("#guard").checked = settings.guardEnabled;
  $("#guard-domains").value = g.internalDomains.join(", ");
  $("#guard-threshold").value = g.bccThreshold;
  $("#guard-keywords").value = g.sensitiveKeywords.join(", ");
  $("#guard-afterhours").value = g.afterHoursStart;
  $("#guard-sendlater").value = g.defaultSendLaterTime;
  $("#footer").value = settings.availabilityFooter;
}

function wireGuard() {
  const g = () => settings.guardConfig;
  $("#guard-domains").addEventListener("input", e => {
    g().internalDomains = csv(e.target.value);
    saveLater();
  });
  $("#guard-keywords").addEventListener("input", e => {
    g().sensitiveKeywords = csv(e.target.value);
    saveLater();
  });
  $("#guard-threshold").addEventListener("change", e => {
    g().bccThreshold = Number.parseInt(e.target.value, 10);
    save();
  });
  $("#guard-afterhours").addEventListener("change", e => {
    g().afterHoursStart = e.target.value;
    save();
  });
  $("#guard-sendlater").addEventListener("change", e => {
    g().defaultSendLaterTime = e.target.value;
    save();
  });
  $("#footer").addEventListener("input", e => {
    settings.availabilityFooter = e.target.value;
    saveLater();
  });
}

function renderScheduled() {
  const tbody = $("#scheduled tbody");
  tbody.replaceChildren();
  const drafts = [...settings.scheduledDrafts].sort((a, b) => a.sendAt - b.sendAt);
  $("#scheduled").hidden = drafts.length === 0;
  $("#scheduled-empty").hidden = drafts.length > 0;
  for (const draft of drafts) {
    const tr = document.createElement("tr");
    const subject = document.createElement("td");
    subject.textContent = draft.subject || "(ohne Betreff)";
    const when = document.createElement("td");
    when.textContent = formatDateTime(new Date(draft.sendAt));
    const actions = document.createElement("td");
    actions.className = "row";
    const now = Object.assign(document.createElement("button"), { type: "button", textContent: "Jetzt senden" });
    now.addEventListener("click", () => browser.runtime.sendMessage({ type: "send-now", id: draft.id }));
    const drop = Object.assign(document.createElement("button"), {
      type: "button",
      className: "danger",
      textContent: "Nicht senden",
      title: "Aus der Planung nehmen; der Entwurf bleibt im Entwürfe-Ordner.",
    });
    drop.addEventListener("click", () => {
      settings.scheduledDrafts = settings.scheduledDrafts.filter(d => d.id !== draft.id);
      renderScheduled();
      save();
    });
    actions.append(now, drop);
    tr.append(subject, when, actions);
    tbody.append(tr);
  }
}

function renderClassroom() {
  $("#privacy").checked = settings.privacyBlur;
  const active = isFocusActive(settings, Date.now());
  $("#focus-toggle").textContent = active ? "Fokus-Modus beenden" : "Fokus-Modus 60 Min. starten";
  $("#focus-state").textContent = active
    ? `aktiv bis ${new Date(settings.focusModeUntil).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`
    : "";
}

function wireClassroom() {
  $("#privacy").addEventListener("change", e => {
    settings.privacyBlur = e.target.checked;
    save();
  });
  $("#focus-toggle").addEventListener("click", () => {
    settings.focusModeUntil = isFocusActive(settings, Date.now()) ? null : Date.now() + 60 * 60000;
    renderClassroom();
    save();
  });
}

const folderName = uri => decodeURIComponent(uri.replace(/^[a-z]+:\/\/[^/]*\/?/i, "")) || uri;

function renderPinned() {
  const list = $("#pinned");
  list.replaceChildren();
  $("#pinned-empty").hidden = settings.pinnedFolders.length > 0;
  const template = $("#pinned-template");
  settings.pinnedFolders.forEach((pin, index) => {
    const li = template.content.firstElementChild.cloneNode(true);
    li.title = folderName(pin.folderURI);
    const label = li.querySelector(".pin-label");
    label.value = pin.label;
    label.addEventListener("input", () => {
      pin.label = label.value;
      saveLater();
    });
    const ws = li.querySelector(".pin-workspace");
    ws.value = pin.workspace;
    ws.addEventListener("change", () => {
      pin.workspace = ws.value;
      save();
    });
    const color = li.querySelector(".pin-color");
    color.value = pin.color ?? settings.folderColors[pin.folderURI] ?? "#888888";
    color.addEventListener("change", () => {
      pin.color = color.value.toLowerCase();
      save();
    });
    li.querySelector(".pin-color-reset").addEventListener("click", () => {
      pin.color = null;
      renderPinned();
      save();
    });
    li.querySelector(".pin-remove").addEventListener("click", () => {
      settings.pinnedFolders.splice(index, 1);
      renderPinned();
      save();
    });
    list.append(li);
  });

  const colors = $("#folder-colors");
  colors.replaceChildren();
  const entries = Object.entries(settings.folderColors);
  $("#folder-colors-empty").hidden = entries.length > 0;
  for (const [uri, hex] of entries) {
    const li = $("#folder-color-template").content.firstElementChild.cloneNode(true);
    li.querySelector(".fc-name").textContent = folderName(uri);
    const input = li.querySelector(".fc-color");
    input.value = hex;
    input.addEventListener("change", () => {
      settings.folderColors[uri] = input.value.toLowerCase();
      save();
    });
    li.querySelector(".fc-remove").addEventListener("click", () => {
      delete settings.folderColors[uri];
      renderPinned();
      save();
    });
    colors.append(li);
  }
}

const CALENDAR_TYPES = { storage: "Lokal", ics: "iCal/ICS", caldav: "CalDAV" };

async function renderCalendars() {
  const tbody = $("#calendars tbody");
  tbody.replaceChildren();
  let calendars = [];
  try {
    calendars = await browser.runtime.sendMessage({ type: "list-calendars" });
  } catch (e) {
    $("#calendars-error").textContent = `Kalender nicht lesbar: ${e.message}`;
    $("#calendars-error").hidden = false;
  }
  for (const calendar of calendars) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = calendar.color ?? "transparent";
    name.append(dot, calendar.name);
    const type = document.createElement("td");
    type.className = "dim";
    type.textContent = CALENDAR_TYPES[calendar.type] ?? calendar.type;
    const cell = document.createElement("td");
    const select = document.createElement("select");
    select.setAttribute("aria-label", `Workspace für ${calendar.name}`);
    select.append(new Option("Nicht steuern", ""));
    for (const [value, label] of Object.entries(ASSIGNMENT_LABELS)) {
      select.append(new Option(label, value));
    }
    select.value = settings.calendarAssignments[calendar.id] ?? "";
    select.addEventListener("change", () => {
      if (select.value) {
        settings.calendarAssignments[calendar.id] = select.value;
      } else {
        delete settings.calendarAssignments[calendar.id];
      }
      save();
    });
    cell.append(select);
    tr.append(name, type, cell);
    tbody.append(tr);
  }
}

function renderFreeSlots() {
  const cfg = settings.freeSlotConfig;
  const box = $("#workdays");
  box.replaceChildren();
  for (const [day, label] of WEEKDAY_LABELS) {
    const wrap = document.createElement("label");
    wrap.className = "check";
    const input = Object.assign(document.createElement("input"), { type: "checkbox", checked: cfg.workdays.includes(day) });
    input.addEventListener("change", () => {
      cfg.workdays = input.checked ? [...cfg.workdays, day] : cfg.workdays.filter(d => d !== day);
      save();
    });
    wrap.append(input, label);
    box.append(wrap);
  }
  $("#slot-start").value = hoursToTime(cfg.startHour);
  $("#slot-end").value = hoursToTime(cfg.endHour);
  $("#slot-duration").value = String(cfg.durationMinutes);
}

/** Ungültige Zeitfenster (Ende vor Beginn) setzt normalizeSettings zurück; die Anzeige folgt. */
async function saveSlots() {
  await save();
  settings.freeSlotConfig = normalizeSettings(settings).freeSlotConfig;
  renderFreeSlots();
}

function wireCalendars() {
  $("#subscribe").addEventListener("click", async () => {
    try {
      await browser.runtime.sendMessage({ type: "open-calendar-wizard" });
      showStatus("Nach dem Abonnieren die Seite neu laden, um den Kalender zuzuordnen.");
    } catch (e) {
      showStatus(`Kalender-Dialog nicht geöffnet: ${e.message}`);
    }
  });
  const cfg = () => settings.freeSlotConfig;
  $("#slot-start").addEventListener("change", e => {
    cfg().startHour = timeToHours(e.target.value);
    saveSlots();
  });
  $("#slot-end").addEventListener("change", e => {
    cfg().endHour = timeToHours(e.target.value);
    saveSlots();
  });
  $("#slot-duration").addEventListener("change", e => {
    cfg().durationMinutes = Number(e.target.value);
    save();
  });
}

function renderRules() {
  const list = $("#rules");
  list.replaceChildren();
  settings.autoTagRules.forEach((rule, index) => {
    const li = $("#rule-template").content.firstElementChild.cloneNode(true);
    const tag = li.querySelector(".rule-tag");
    tag.value = rule.tag;
    tag.addEventListener("input", () => {
      rule.tag = tag.value;
      saveLater();
    });
    const color = li.querySelector(".rule-color");
    color.value = rule.color;
    color.addEventListener("change", () => {
      rule.color = color.value.toLowerCase();
      save();
    });
    const keywords = li.querySelector(".rule-keywords");
    keywords.value = rule.keywords.join(", ");
    keywords.addEventListener("input", () => {
      rule.keywords = csv(keywords.value);
      saveLater();
    });
    li.querySelector(".rule-delete").addEventListener("click", () => {
      settings.autoTagRules.splice(index, 1);
      renderRules();
      save();
    });
    list.append(li);
  });
}

function wireRules() {
  $("#add-rule").addEventListener("click", () => {
    settings.autoTagRules.push({ tag: "Neues Schlagwort", color: "#64748b", keywords: [] });
    renderRules();
    save();
    $("#rules li:last-child .rule-tag").select();
  });
}

// Live nachziehen, was auch von außen kommt (Toolbar-Menü, Ordner-Kontextmenü,
// Später senden). Nur bei echter Änderung neu bauen, sonst gehen Eingaben verloren.
const LIVE_KEYS = {
  scheduledDrafts: renderScheduled,
  pinnedFolders: renderPinned,
  folderColors: renderPinned,
  privacyBlur: renderClassroom,
  focusModeUntil: renderClassroom,
};

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) {
    return;
  }
  const next = normalizeSettings(changes[STORAGE_KEY].newValue);
  settings.mode = next.mode;
  renderMode();
  const renders = new Set();
  for (const [key, render] of Object.entries(LIVE_KEYS)) {
    if (JSON.stringify(settings[key]) !== JSON.stringify(next[key])) {
      settings[key] = next[key];
      renders.add(render);
    }
  }
  renders.forEach(render => render());
});

async function init() {
  [settings, accounts] = await Promise.all([loadSettings(), listAccounts()]);
  renderMode();
  renderAccounts();
  renderIdentities();
  renderGuard();
  renderScheduled();
  renderClassroom();
  renderColors();
  renderPinned();
  renderFreeSlots();
  renderRules();
  renderSnippets();
  wireStaticControls();
  wireGuard();
  wireClassroom();
  wireCalendars();
  wireRules();
  await renderCalendars();
}

init().catch(e => {
  console.error(e);
  showStatus(`Fehler beim Laden: ${e.message}`);
});
