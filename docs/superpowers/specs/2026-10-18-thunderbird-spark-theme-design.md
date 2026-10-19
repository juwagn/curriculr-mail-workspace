# Thunderbird-Theme im Spark-Look – Design

Datum: 2026-10-18

## Ziel

Thunderbird 158 (Windows) soll optisch dem E-Mail-Programm Spark ähneln, in Hell und Dunkel. Das Theme ist für den Eigengebrauch gedacht, nicht für den Add-on-Store.

## Entscheidungen des Nutzers

- Ansatz: Kombination aus Manifest-Theme (Farben) und `userChrome.css` (Layout).
- Varianten: Hell und Dunkel, Umschaltung folgt dem System (`prefers-color-scheme`).
- Zielversion: Thunderbird 158.0. Profile auf dem Rechner: `8veadpjh.default-release`, `cbx1vnpp.default`.

## Annahmen

- Es werden keine Spark-Assets, -Logos oder -Icons kopiert. Der Look wird nur nachgebildet (Farben, Abstände, Rundungen).
- Kein Store-Release, keine Signierung.
- Nach größeren Thunderbird-Updates können einzelne Selektoren nachgezogen werden müssen.

## Struktur

```
spark-theme/
  manifest.json          Theme: theme (hell) + dark_theme (dunkel)
  chrome/
    userChrome.css       Layout der Oberfläche
    userContent.css      Lesebereich und Verfassen-Fenster (optional)
  install.ps1            Kopiert chrome/ ins gewählte Profil
  uninstall.ps1          Macht die Installation rückgängig
```

## Komponenten

### `manifest.json`

WebExtension-Theme mit `theme` und `dark_theme`. Setzt Farben für Toolbar, Seitenleiste, Listen, Auswahl, Felder und Akzent. Der Akzent ist ein Blau in Sparks Richtung. Das Manifest enthält keinen Code.

### `chrome/userChrome.css`

Farben als CSS-Variablen auf `:root`, im Dunkelmodus per `@media (prefers-color-scheme: dark)` überschrieben. Darauf bauen die Layout-Regeln:

- Nachrichtenliste: mehr Zeilenhöhe, abgerundete Auswahl-„Karten", dünnere Trennlinien.
- Toolbar: flache Pill-Buttons, kein Rahmen im Ruhezustand.
- Ordnerleiste: ruhigere Optik, abgerundete aktive Zeile.
- Tabs und Suchfeld: abgerundet, an die Palette angepasst.

### `chrome/userContent.css`

Optional. Passt Lesebereich und Verfassen-Fenster an die Palette an. Fällt weg, wenn es beim Test Probleme macht.

### `install.ps1` / `uninstall.ps1`

`install.ps1`:

1. Profil wählen (Parameter oder Auswahl der gefundenen Profile).
2. Vorhandenen `chrome/`-Ordner im Profil sichern.
3. `chrome/` kopieren.
4. In `user.js` die Einstellung `toolkit.legacyUserProfileCustomizations.stylesheets` auf `true` setzen.

`uninstall.ps1` stellt die Sicherung wieder her und entfernt die eigenen Einträge. Thunderbird darf beim Ausführen nicht laufen. Das Skript prüft das und bricht sonst ab.

Das Manifest-Theme wird separat installiert. Thunderbird-Release verlangt signierte Add-ons. Zwei Wege:

- Temporär: `about:debugging` → „Dieser Thunderbird" → „Temporäres Add-on laden". Gilt nur bis zum Neustart.
- Dauerhaft: `.xpi` bei addons.thunderbird.net als „unlisted" (Selbstverteilung) kostenlos signieren lassen und per Add-ons-Manager installieren.

Die `userChrome.css` wirkt unabhängig davon. Ohne das Manifest-Theme fehlen nur die Basisfarben, die CSS-Variablen decken die wichtigsten Flächen trotzdem ab.

## Datenfluss

Thunderbird liest beim Start `user.js`, aktiviert damit benutzerdefinierte Stylesheets und lädt `chrome/userChrome.css`. Das Manifest-Theme setzt die Standardfarben. Die CSS-Variablen aus `userChrome.css` gleichen die übrigen Flächen daran an.

## Fehlerbehandlung

- Thunderbird läuft: Skript bricht mit Hinweis ab.
- Profil nicht gefunden: Skript listet die vorhandenen Profile.
- Bestehendes `chrome/`: wird vor dem Überschreiben gesichert.
- Selektor trifft nicht mehr (Update): Die Stelle fällt auf Thunderbirds Standard zurück. Das Theme bricht nicht ab.

## Test

- Thunderbird mit frischem Wegwerf-Profil starten (`thunderbird -profile <Temp-Ordner>`), nicht mit den echten Mail-Profilen.
- Screenshots in Hell und Dunkel (Systemmodus bzw. `ui.systemUsesDarkTheme`) von: Nachrichtenliste, Ordnerleiste, Toolbar, Lesebereich, Verfassen-Fenster.
- `install.ps1` und `uninstall.ps1` gegen das Wegwerf-Profil laufen lassen. Prüfen, dass nach dem Deinstallieren der Ausgangszustand zurück ist.
- Echte Profile werden erst nach Freigabe durch den Nutzer angefasst.

## Außerhalb des Umfangs

- Store-Veröffentlichung und Signierung.
- Eigene Icons, Spark-Smart-Inbox, Funktionen statt Optik.
- macOS und Linux.
