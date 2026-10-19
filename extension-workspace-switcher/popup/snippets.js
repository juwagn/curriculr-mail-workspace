// Popup im Verfassen-Fenster: Textbausteine einfügen und „Später senden“.
// Bausteine laufen per tabs.executeScript im Editor-Dokument; execCommand fügt
// dort an der aktuellen Auswahl ein (Rückgängig funktioniert). Platzhalter wie
// {{anrede_du_sie}} und {{freie_termine}} werden vorher ersetzt.
import { snippetToHtml, fillPlaceholders, nextSchoolDayAt } from "../shared/logic.mjs";
import { loadSettings } from "../shared/settings.mjs";

const $ = sel => document.querySelector(sel);

function showError(text) {
  const el = $("#error");
  el.textContent = text;
  el.hidden = false;
}

async function composeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function insertSnippet(text, settings) {
  const tab = await composeTab();
  const details = await browser.compose.getComposeDetails(tab.id);
  const freeSlots = text.includes("{{freie_termine}}")
    ? await browser.runtime.sendMessage({ type: "free-slots" }).catch(e => {
        console.error("[workspace] Freie Termine", e);
        return null;
      })
    : null;
  const filled = fillPlaceholders(text, {
    to: details.to,
    internalDomains: settings.guardConfig.internalDomains,
    freeSlots,
  });
  const code = details.isPlainText
    ? `document.execCommand("insertText", false, ${JSON.stringify(filled)});`
    : `document.execCommand("insertHTML", false, ${JSON.stringify(snippetToHtml(filled))});`;
  await browser.tabs.executeScript(tab.id, { code });
}

const toLocalInput = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function initLater(settings) {
  const input = $("#send-at");
  input.value = toLocalInput(
    nextSchoolDayAt(new Date(), settings.guardConfig.defaultSendLaterTime, settings.freeSlotConfig.workdays)
  );
  $("#later").addEventListener("submit", async event => {
    event.preventDefault();
    const sendAt = new Date(input.value).getTime();
    if (!(sendAt > Date.now())) {
      showError("Bitte einen Zeitpunkt in der Zukunft wählen.");
      return;
    }
    try {
      const tab = await composeTab();
      // Schließt das Verfassen-Fenster (und damit dieses Popup).
      await browser.runtime.sendMessage({ type: "schedule-send", tabId: tab.id, sendAt });
    } catch (e) {
      console.error(e);
      showError(`Planen fehlgeschlagen: ${e.message}`);
    }
  });
}

async function init() {
  const settings = await loadSettings();
  initLater(settings);
  const { snippets } = settings;
  const list = $("#list");
  $("#empty").hidden = snippets.length > 0;
  for (const snippet of snippets) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "snippet";
    const title = document.createElement("span");
    title.className = "snippet-title";
    title.textContent = snippet.title;
    const preview = document.createElement("span");
    preview.className = "snippet-preview";
    preview.textContent = snippet.text.replace(/\s+/g, " ");
    button.append(title, preview);
    button.addEventListener("click", async () => {
      try {
        await insertSnippet(snippet.text, settings);
        window.close();
      } catch (e) {
        console.error(e);
        showError(`Einfügen fehlgeschlagen: ${e.message}`);
      }
    });
    li.append(button);
    list.append(li);
  }
  list.querySelector("button")?.focus();
  $("#edit").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
    window.close();
  });
}

init().catch(e => showError(e.message));
