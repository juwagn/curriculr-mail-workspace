# Ist-Zustand: Thunderbird School & Work/Private Suite (Stand 2026-10-18)

Dieser Text beschreibt, was im Repository bereits existiert. Er dient als Kontext für Recherche- und Planungs-Prompts. Neue Vorschläge sollen darauf aufbauen und nichts davon doppeln oder umbenennen.

## Umgebung

- Thunderbird 158 (Release, nicht ESR) unter Windows 11. `strict_min_version` ist 128.0.
- Das Repo liegt in einem Nextcloud-Ordner. Nextcloud (Cloud Files API) blockiert Symlinks und Hardlinks.
- Theme und Add-on sind im echten Profil installiert und laufen. Die Sende-Warnung ist im Alltag getestet.
- Konten: Schule = account1 (Schuldomain, Standard) und account3 (Bezirksdomain). Privat = account7 (Freemail).
- Ergänzend installierte Fremd-Add-ons: Send Later, Quicktext, Identity Chooser, Thunderbird Conversations, QuickFolders, CardBook, Shrunked Image Resizer.

## Ordner

| Ordner | Inhalt |
|---|---|
| `theme-css/` | `userChrome.css` (346 Zeilen), `userContent.css` (30 Zeilen) |
| `extension-workspace-switcher/` | MailExtension „School Workspace Suite“ v0.1.0, ID `school-workspace-suite@local` |
| `scripts/` | `install-dev.ps1/.sh`, `build-xpi.ps1/.sh`, `profile-lib.ps1` |
| `spark-theme/` | Älteres, eigenständiges Theme. Wird nicht weiterentwickelt, `install-dev` ersetzt es. |
| `tests/` | PowerShell-Checks für Theme, Installation und Add-on; `node --test` für die Add-on-Logik |
| `dist/` | `school-workspace-suite.xpi` |

## Add-on `extension-workspace-switcher/` (existiert, funktioniert)

**Manifest:** MV2, Hintergrundseite als ES-Modul. Berechtigungen: `accountsRead`, `compose`, `storage`, `menus`. Keine Berechtigungen für `messagesRead`, `messagesTags`, `messagesModify`, `clipboardWrite`, `downloads` oder `notifications`.

**Workspace-Modi:** `school`, `private`, `all`. Jedes Konto ist `school`, `private` oder `both` zugeordnet. Nicht zugeordnete Konten gelten als `both` und sind immer sichtbar.

**Bedienung:**
- `browser_action`-Button in der Hauptleiste: Ein Klick wechselt reihum Schule → Privat → Alle. Das Icon wird in der Workspace-Farbe eingefärbt, das Label zeigt den Modus.
- Tastenkürzel `Ctrl+Shift+Y` (Befehl `cycle-workspace`) macht dasselbe.
- Rechtsklick auf den Button öffnet Radio-Menüpunkte für die drei Modi und „Einstellungen …“.
- Es gibt keinen Button in der Spaces Toolbar.

**Experiment-API `workspace`** (`experiments/workspace/`), zwei Funktionen:
- `apply(mode, hiddenAccountIds, accentProperties)`:
  - setzt `data-workspace="school|private|all"` auf das Root-Element von `messenger.xhtml` und von jedem `about:3pane`-Tab,
  - setzt die Klasse `.workspace-hidden` auf `#folderTree li[data-server-key]` der ausgeblendeten Konten,
  - setzt eigene Farben als `--ws-custom-(school|private|all)(-dark)` inline (nur `#rrggbb`, alles andere wird verworfen),
  - gilt auch für später geöffnete Fenster und Tabs: WindowListener, TabMonitor und MutationObserver, weil Thunderbird den Ordnerbaum neu aufbaut,
  - nimmt beim Deaktivieren des Add-ons alles zurück.
- `focusInbox(accountId)`: öffnet beim Moduswechsel den Posteingang des primären Kontos und klappt den Baum auf.
- Die API kann **nicht**: Klassen wie Blur oder Fokus setzen, Benachrichtigungen unterdrücken, Prefs ändern, Nachrichten lesen.

**Absender:** Wird ein **neues, leeres** Verfassen-Fenster geöffnet (Typ `new`, ohne Empfänger und Betreff), setzt das Add-on die Standard-Identität des aktiven Modus. Antworten und Weiterleitungen bleiben unverändert.

**Sende-Wächter:** `compose.onBeforeSend` prüft nur eines: Gehört die Absender-Identität zum anderen Workspace (z. B. Schul-Absender im Modus Privat)? Wenn ja, öffnet sich ein eigenes Popup (`confirm/`) mit „Senden“ oder „Abbrechen“. Schließt man das Fenster, wird nicht gesendet. Im Modus `all` gibt es keine Warnung. Abschaltbar über `guardEnabled`.
Es gibt **keine** Prüfung von Empfängern (An, CC, BCC, extern/intern), Inhalt, Zitaten oder Uhrzeit.

**Textbausteine:** `compose_action`-Button „Bausteine“ im Verfassen-Fenster. Das Popup fügt einen Baustein an der Cursorposition ein: per `execCommand`, HTML-escaped, mit funktionierendem Rückgängig. Standardbausteine: Eltern-Rückmeldung, Beratungstermin-Vorschlag (mit Platzhaltern `____`), IT-Support-Rückfrage, Kurze Kenntnisnahme, Terminbestätigung. In den Optionen lassen sie sich bearbeiten, hinzufügen und zurücksetzen. Es gibt keine Du/Sie-Varianten und keine Auswahl nach Empfänger.

**Einstellungen** (`browser.storage.local`, ein Schlüssel `settings`, geprüft in `normalizeSettings`):

```
{ mode, assignments: {accountId: "school"|"private"|"both"},
  defaultIdentity: {school, private}, guardEnabled, snippets: [{id,title,text}],
  colors: {school, private, all} }
```

Jede Moduswechsel-Quelle (Klick, Kürzel, Menü, Optionen) schreibt in den Storage. Erst `storage.onChanged` wendet den Modus an. Neue Funktionen sollen diesem Muster folgen.

**Options-Seite** (eigener Tab, eine Seite ohne Reiter): Konten zuordnen, Standard-Absender je Modus, Sende-Wächter an/aus, Farben je Modus, Textbausteine.

**Code-Struktur:** Die reine Logik steht ohne `browser.*` in `shared/logic.mjs` und ist mit Node getestet (`tests/extension/logic.test.mjs`). Storage-Zugriff liegt in `shared/settings.mjs`, gemeinsames Seiten-CSS in `shared/ui.css`.

## Theme `theme-css/` (existiert, funktioniert)

- Alles in `@media (forced-colors: none)`. Bei Windows-Hochkontrast (Forced Colors) bleibt nur die Konto-Ausblendung aktiv. Bei `prefers-contrast: more` (macOS „Kontrast erhöhen“) bleibt das Theme an und verstärkt Ränder, Schrift, Tönungen und Fokusring.
- Hell und dunkel über `prefers-color-scheme`.
- Akzent je `data-workspace`: Schule `#3b82f6`, Privat `#10b981`, Alle `#8b5cf6`. Eigene Farben überschreiben über `--ws-custom-*`. Die Schriftfarbe auf Akzentflächen wird automatisch kontrastgerecht gewählt.
- Überschreibt Thunderbird-eigene Variablen für Flächen, Akzent und Radien. Deklarationen brauchen `!important` (User-Sheet gegen Author-Sheets).
- **Nachrichtenliste Kartenansicht:** Karten mit Radius und Abstand, Typografie, ungelesene Mails mit Akzentbalken links (`.card-container::before`), Stern bei neuen Mails im Akzent. Die Tabellenansicht ist nur leicht angepasst.
- **Ordnerliste:** ruhige Seitenleiste, Konto-Zeilen als kleine gedämpfte Überschrift. `#folderTree li[data-server-key].workspace-hidden { display: none }`.
- **Spaces Toolbar:** Seitenleiste in der getönten Fläche, der aktive Button als Pille mit Akzent-Symbol.
- **Toolbar:** Es gibt einen Modus-Indikator im Akzent, aber kein Text-Badge „SCHUL-MODUS/PRIVAT-MODUS“.
- **Bewegung:** Übergänge, respektiert `prefers-reduced-motion`.
- `userContent.css`: Zitate als dünne Linie, lesbare Zeilenlänge bei Klartext, dezenter Signaturtrenner.
- **Nicht vorhanden:** Tag-Pills (Schlagwörter färben weiterhin die Zeile), Privacy-Blur, Fokus-Modus, Styling für QuickFolders, Identity Chooser oder Conversations.

## Skripte `scripts/` (existieren, funktionieren)

- `install-dev.ps1` (Windows) findet das Standardprofil über `%APPDATA%\Thunderbird\profiles.ini` (oder `-ProfilePath`). Es verknüpft beide CSS-Dateien als Hardlink in `chrome/`. Im Nextcloud-Ordner fällt es auf eine Stub-Datei mit `@import url("file:///…")` zurück, das ist in TB 158 geprüft. Es sichert vorhandene `spark-theme`-Dateien und schreibt `toolkit.legacyUserProfileCustomizations.stylesheets = true` idempotent in einen markierten Block in `user.js`. `-Remove` nimmt alles zurück.
- `install-dev.sh` macht dasselbe für macOS und Linux (inkl. Snap und Flatpak) mit Symlinks.
- `build-xpi.ps1/.sh` packt das Add-on nach `dist/school-workspace-suite.xpi`.
- `extensions.experiments.enabled` wird **nicht** gesetzt und ist nicht nötig. Das unsignierte XPI mit Experiment-API ließ sich in TB 158 über „Add-on aus Datei installieren“ installieren.

## Was neue Vorschläge beachten müssen

1. **Kein zweites Add-on.** Neue Funktionen kommen in `extension-workspace-switcher/`. Sonst laufen zwei `onBeforeSend`-Handler und zwei Workspace-Logiken gegeneinander.
2. **Es gibt nur einen Sende-Hook mit einem Bestätigungsdialog.** Neue Prüfungen (BCC, Zitat, Feierabend) müssen dort hinein und dürfen nicht mehrere Dialoge hintereinander öffnen.
3. **Bestehende Namen bleiben:** Modi `school/private/all`, Attribut `data-workspace`, Klasse `.workspace-hidden`, Variablen `--ws-custom-*`, Kürzel `Ctrl+Shift+Y`, Storage-Schlüssel `settings`.
4. **Windows und Nextcloud sind der Hauptfall.** Keine reinen Symlink-Lösungen. Die Skripte existieren schon.
5. **Nicht doppeln, was die Fremd-Add-ons können:** zeitversetztes Senden (Send Later), Textbausteine mit Variablen und Empfängername (Quicktext), Identitätswahl beim Verfassen (Identity Chooser), Ordner-Leiste (QuickFolders), Adressbuch (CardBook).
6. **Schon da und nur zu erweitern statt neu zu bauen:** Textbausteine „Beratungstermin-Vorschlag“ und „Kurze Kenntnisnahme“, automatischer Absender je Modus, Warnung bei falschem Absender, Konto-Ausblendung, Posteingang beim Wechsel aufklappen.
7. **Offen, zu recherchieren:**
   - Ob `browser.downloads` in Thunderbird mit Unterordner nutzbar ist, oder ob ein Speichern über `messages.getAttachmentFile` nötig ist.
   - Wie sich Benachrichtigungen pro Konto per Experiment stummschalten lassen (Server-Prefs vs. Notification-Observer).
   - Ob `compose.onBeforeSend` Empfänger und Body im Rückgabewert ändern darf (BCC verschieben, Zitat entfernen).
   - Die stabilen DOM-Selektoren der Fremd-Add-ons in TB 158.
