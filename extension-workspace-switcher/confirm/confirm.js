// Ein Dialog für alle Prüfungen vor dem Senden. Antwortet dem Hintergrund per
// Nachricht und schließt sich dann selbst. Schließen ohne Antwort = nicht senden.
import { MODE_LABELS, nextSchoolDayAt } from "../shared/logic.mjs";
import { loadSettings, applyPageColors } from "../shared/settings.mjs";

const params = new URLSearchParams(location.search);
const requestId = params.get("requestId");
const { mode, from, issues } = JSON.parse(params.get("data") || "{}");

const $ = sel => document.querySelector(sel);
const strong = text => Object.assign(document.createElement("strong"), { textContent: text });
const byType = Object.fromEntries((issues ?? []).map(i => [i.type, i]));

document.documentElement.style.setProperty("--ws-accent", `var(--ws-accent-${mode === "private" ? "private" : "school"})`);

function addIssue(type, fill) {
  const li = $(`#tpl-${type}`).content.firstElementChild.cloneNode(true);
  fill?.(li);
  $("#issues").append(li);
}

if (byType.mismatch) {
  addIssue("mismatch", li =>
    li.querySelector(".text").append(
      "Aktiv ist ",
      strong(MODE_LABELS[mode] ?? mode),
      ", gesendet würde aber von ",
      strong(from || "dieser Adresse"),
      ` (${MODE_LABELS[byType.mismatch.fromWorkspace] ?? byType.mismatch.fromWorkspace}).`
    )
  );
}
if (byType.bcc) {
  const n = byType.bcc.recipients.length;
  addIssue("bcc", li => {
    li.querySelector(".text").textContent = byType.bcc.recipients.join(", ");
    li.querySelector(".label").textContent = `Alle ${n} externen Empfänger automatisch in BCC verschieben`;
  });
}
if (byType.sensitive) {
  addIssue("sensitive", li =>
    li.querySelector(".text").append("Gefunden: ", strong(byType.sensitive.keywords.join(", ")), ". Der Zitatblock geht an Dritte.")
  );
}
if (byType.afterHours) {
  addIssue("afterHours");
}

// datetime-local erwartet lokale Zeit ohne Zeitzone.
const toLocalInput = ms => {
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const sendAtInput = $("#send-at");
loadSettings()
  .then(settings => {
    applyPageColors(settings.colors);
    const fallback = nextSchoolDayAt(new Date(), settings.guardConfig.defaultSendLaterTime, settings.freeSlotConfig.workdays);
    sendAtInput.value = toLocalInput(byType.afterHours?.sendAt ?? fallback.getTime());
  })
  .catch(e => console.error("[workspace] Einstellungen nicht geladen", e));

async function answer(action) {
  const result = {
    action,
    moveBcc: $("#move-bcc")?.checked ?? false,
    stripQuotes: $("#strip-quotes")?.checked ?? false,
    sendAt: new Date(sendAtInput.value).getTime(),
  };
  if (action === "later" && !(result.sendAt > Date.now())) {
    sendAtInput.setCustomValidity("Bitte einen Zeitpunkt in der Zukunft wählen.");
    sendAtInput.reportValidity();
    return;
  }
  await browser.runtime.sendMessage({ type: "workspace-confirm", requestId, answer: result });
  const win = await browser.windows.getCurrent();
  await browser.windows.remove(win.id);
}

sendAtInput.addEventListener("input", () => sendAtInput.setCustomValidity(""));
$("#cancel").addEventListener("click", () => answer("cancel"));
$("#later").addEventListener("click", () => answer("later"));
$("#send").addEventListener("click", () => answer("send"));
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    answer("cancel");
  }
});

// Hauptaktion: bei falschem Absender „Nicht senden“, nach Feierabend „Später senden“, sonst „Jetzt senden“.
const primary = byType.mismatch ? "#cancel" : byType.afterHours ? "#later" : "#send";
$(primary).classList.add("primary");
$(primary).focus();
