// Popup in der Kopfleiste einer Nachricht: archivieren, Termin anlegen, Ticket kopieren.
// Die Arbeit macht der Hintergrund; nur die Zwischenablage braucht dieses Popup.
const $ = sel => document.querySelector(sel);

function show(id, text) {
  for (const el of ["#status", "#error"]) {
    $(el).hidden = true;
  }
  $(id).textContent = text;
  $(id).hidden = false;
}

async function displayedMessage() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const result = await browser.messageDisplay.getDisplayedMessages(tab.id);
  const messages = Array.isArray(result) ? result : result.messages;
  if (messages.length !== 1) {
    throw new Error("Bitte genau eine Nachricht auswählen.");
  }
  return messages[0];
}

for (const button of document.querySelectorAll("[data-action]")) {
  button.addEventListener("click", async () => {
    const action = button.dataset.action;
    try {
      const message = await displayedMessage();
      const result = await browser.runtime.sendMessage({ type: "message-action", action, messageId: message.id });
      if (action === "ticket") {
        await navigator.clipboard.writeText(result);
        show("#status", "In die Zwischenablage kopiert.");
      } else {
        show("#status", result);
      }
    } catch (e) {
      console.error(e);
      show("#error", e.message);
    }
  });
}

document.querySelector("[data-action]").focus();
