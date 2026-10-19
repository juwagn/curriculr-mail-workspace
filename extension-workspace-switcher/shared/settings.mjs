// Laden und Speichern der Einstellungen in browser.storage.local.
// Alles liegt unter einem Schlüssel, damit storage.onChanged alte und neue
// Einstellungen in einem Rutsch liefert.
import { normalizeSettings, accentProperties } from "./logic.mjs";

export const STORAGE_KEY = "settings";

export async function loadSettings() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return normalizeSettings(stored[STORAGE_KEY]);
}

export async function saveSettings(settings) {
  await browser.storage.local.set({ [STORAGE_KEY]: normalizeSettings(settings) });
}

/** Lädt, ändert über `fn` und speichert. Gibt die gespeicherten Einstellungen zurück. */
export async function updateSettings(fn) {
  const settings = await loadSettings();
  fn(settings);
  await saveSettings(settings);
  return normalizeSettings(settings);
}

/** Setzt die eigenen Farben als --ws-custom-* auf eine Erweiterungsseite (siehe ui.css). */
export function applyPageColors(colors, root = document.documentElement) {
  const props = accentProperties(colors);
  for (const name of Array.from(root.style)) {
    if (name.startsWith("--ws-custom-") && !(name in props)) {
      root.style.removeProperty(name);
    }
  }
  for (const [name, value] of Object.entries(props)) {
    root.style.setProperty(name, value);
  }
}

/** Konten ohne Ordnerbaum, damit der Aufruf auch bei großen Postfächern schnell bleibt. */
export function listAccounts() {
  return browser.accounts.list(false);
}
