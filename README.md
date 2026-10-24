# Curricu:lr Mail-Workspace

Teil der Curricu:lr-Familie. Thunderbird-Add-on und Theme für Lehrkräfte, die Schule und Privates im selben Mailprogramm trennen wollen.

Für Thunderbird 128+ (getestet mit 158 unter Windows 11). Alles läuft lokal: keine Server, kein Tracking, keine externen Schriften.

## Funktionen

- **Workspaces Schule, Privat, Alle:** blendet Konten aus, wählt den passenden Absender und färbt die Oberfläche je Modus (Schule in Curricu:lr-Marine, Privat in Salbei, Alle in Graphit).
- **Sende-Wächter:** warnt vor dem Senden bei falschem Absender, offen sichtbaren externen Empfängern, weitergeleiteten sensiblen Verläufen und Mails nach Feierabend.
- **Später senden, Textbausteine, Schnell-Tabs, Auto-Tags, Kalender-Kopplung.**
- **Klassenzimmer:** Sichtschutz (Unschärfe) und Fokus-Modus.
- **Theme:** ruhige Karten-Ansicht, Akzent je Workspace, warme Neutrale, Hell und Dunkel, Windows-Hochkontrast bleibt unangetastet, „Kontrast erhöhen“ verstärkt Ränder und Schrift.

## Installation

### Add-on

1. Die neueste `curriculr-mail-workspace.xpi` unter [Releases](https://github.com/juwagn/curriculr-mail-workspace/releases) herunterladen, oder selbst bauen (siehe unten).
2. Thunderbird: **Add-ons und Themes**, dann **Zahnrad**, dann **Add-on aus Datei installieren**.
3. Beim ersten Start öffnet sich die Einstellungsseite. Dort jedes Konto **Schule**, **Privat** oder **Beide** zuordnen und unter **Sende-Wächter** die eigenen Schuldomains eintragen.

Das Add-on nutzt eine Experiment-API (für das Ausblenden von Konten und die Färbung). Thunderbird fragt deshalb nach voller Berechtigung.

### Theme (optional, empfohlen)

Das Theme besteht aus `userChrome.css` und `userContent.css` und wird ins Thunderbird-Profil gelegt:

```powershell
.\scripts\install-dev.ps1          # Windows, Standardprofil
.\scripts\install-dev.ps1 -Remove  # rückgängig
```

```bash
./scripts/install-dev.sh           # macOS/Linux
```

Danach Thunderbird neu starten. Das Skript setzt Hardlinks, bei Cloud-Ordnern (Nextcloud, OneDrive) eine Stub-Datei mit `@import`. Änderungen im Repo wirken nach einem Neustart.

Empfehlung: **Einstellungen → Allgemein → Darstellung → Karten → 2 Zeilen**. Die Karten werden kompakter, Büroklammer und Stern stehen in der Betreffzeile.

## Bedienung

- Toolbar-Button oder `Strg+Umschalt+Y` wechselt zwischen Schule, Privat und Alle.
- Rechtsklick auf den Button wählt den Modus direkt oder öffnet die Einstellungen.
- Im Verfassen-Fenster fügt **Bausteine** einen Textbaustein an der Cursorposition ein.

## Entwicklung

| Ordner | Inhalt |
|---|---|
| `extension-workspace-switcher/` | MailExtension mit Experiment-API |
| `extension-workspace-switcher/shared/tokens.css` | Design-Tokens für Add-on und Theme (eine Quelle) |
| `theme-css/` | `userChrome.css` / `userContent.css` |
| `scripts/` | `install-dev` (Theme ins Profil) und `build-xpi` (Add-on packen), je `.ps1` und `.sh` |
| `spark-theme/` | Älteres, eigenständiges Theme, wird nicht weiterentwickelt |
| `docs/` | Design-Brief, Design-System mit Kontrastprüfung, Ist-Zustand |
| `tests/` | PowerShell-Checks und Node-Tests |

```powershell
.\scripts\build-xpi.ps1   # -> dist\curriculr-mail-workspace.xpi
```

Tests:

```powershell
node --test tests/extension/logic.test.mjs
pwsh -File tests/check-theme-css.ps1
pwsh -File tests/check-extension.ps1
pwsh -File tests/check-theme.ps1
pwsh -File tests/test-install-dev.ps1
```

Design-Regeln und Farbwerte stehen in [docs/design-system.md](docs/design-system.md). Die Marke folgt den Curricu:lr-Tokens aus [curriculr-terminplan](https://github.com/juwagn/curriculr-terminplan).

## Lizenz

[Mozilla Public License 2.0](LICENSE). Die Wortmarke „Curricu:lr“ und das Logo sind von der Lizenz ausgenommen und dürfen in abgeleiteten Projekten nicht als eigener Name verwendet werden.

Thunderbird ist eine Marke der MZLA Technologies Corporation. Dieses Projekt ist nicht mit Mozilla oder MZLA verbunden.
