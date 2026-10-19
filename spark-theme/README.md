# Spark Look für Thunderbird 158

Helles und dunkles Theme im Stil moderner Mail-Clients. Folgt dem System (Hell/Dunkel).

## Installation

**Einfach:** Thunderbird komplett beenden, dann `Installieren.cmd` doppelklicken. Die Datei findet das Standardprofil aus `profiles.ini` selbst und zeigt am Ende den Pfad an.

**Bestimmtes Profil:** In PowerShell im Ordner `spark-theme`:

```powershell
.\install.ps1 -ProfilePath "C:\Users\<Name>\AppData\Roaming\Thunderbird\Profiles\<profil>"
```

Ohne `-ProfilePath` und ohne `-Auto` listet das Skript die vorhandenen Profile auf.

Danach Thunderbird starten. Die Nachrichtenliste muss in der Karten-Ansicht stehen (in 158 der Standard, sonst: Nachrichtenliste → Anzeigen → Karten-Ansicht).

## Basisfarben (Manifest-Theme)

Thunderbird verlangt signierte Add-ons. Zwei Wege:

- **Temporär:** `about:debugging` → „Dieser Thunderbird" → „Temporäres Add-on laden" → `manifest.json` wählen. Gilt bis zum Neustart.
- **Dauerhaft:** Ordnerinhalt als `.xpi` packen, bei addons.thunderbird.net als „unlisted" kostenlos signieren lassen und per Add-ons-Manager installieren.

Ohne das Manifest-Theme sieht das Ergebnis fast gleich aus, weil `userChrome.css` die wichtigsten Flächen selbst färbt.

## Entfernen

`Deinstallieren.cmd` doppelklicken, oder:

```powershell
.\uninstall.ps1 -ProfilePath "<profil>"
```

Entfernt werden nur die Dateien des Themes. Eigene Dateien in `chrome/` bleiben. Ein vorher vorhandener `chrome/`-Ordner wird aus `chrome.spark-look-backup` zurückgestellt. Änderungen an `userChrome.css` und `userContent.css` des Themes gehen beim Neuinstallieren oder Entfernen verloren.

## Grenzen

- Getestet mit Thunderbird 158. Nach größeren Updates können Selektoren in `userChrome.css` nachgezogen werden müssen.
- Kein Store-Release, keine Spark-Assets.
