# Thunderbird Spark-Look Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein Thunderbird-158-Theme im Spark-Look (Hell und Dunkel, folgt dem System) aus Manifest-Theme, `userChrome.css`, `userContent.css` und Install-Skripten bauen.

**Architecture:** Thunderbird 158 steuert Farben, Rundungen und Abstände fast vollständig über CSS-Variablen (`--layout-background-0..4`, `--tree-card-*`, `--listbox-*`, `--selected-item-color`, `--button-border-radius`). `userChrome.css` überschreibt diese Variablen mit einer Spark-Palette und kommt mit wenigen strukturellen Regeln aus. Das macht das Theme robust gegen Updates. Das Manifest-Theme liefert die Basisfarben. PowerShell-Skripte installieren und entfernen die CSS-Dateien in einem Profil.

**Tech Stack:** CSS (Mozilla `light-dark()`, `color-mix()`), WebExtension-Theme-Manifest (MV2), PowerShell 5.1-kompatibel.

**Spec:** `docs/superpowers/specs/2026-10-18-thunderbird-spark-theme-design.md`

**Hinweis zu Git:** Der Projektordner ist kein Git-Repository. Der Plan enthält deshalb keine Commit-Schritte. Jede Task endet stattdessen mit einem Prüflauf. Optional: `git init` vor Task 1.

## Global Constraints

- Zielversion Thunderbird 158.0, Windows 11. Installiert unter `C:\Program Files\Mozilla Thunderbird\thunderbird.exe`.
- Hell und Dunkel, Umschaltung folgt dem System (`prefers-color-scheme`, `light-dark()`).
- Keine Spark-Assets, -Logos oder -Icons kopieren. Nur Farben, Abstände und Rundungen nachbilden.
- Alle Skripte laufen unter Windows PowerShell 5.1 und PowerShell 7 (keine Ternary-Operatoren, kein `??`).
- `user.js` wird ohne BOM geschrieben (UTF-8 ohne BOM).
- Tests und Sichtprüfungen laufen nur gegen Wegwerf-Profile unter `%TEMP%`, nie gegen `8veadpjh.default-release` oder `cbx1vnpp.default`.
- Variablen-Overrides in `userChrome.css` stehen in `@media not (prefers-contrast)`, damit der Kontrastmodus von Windows unverändert bleibt.
- Dateinamen: Ordner `spark-theme/`, Manifest-Name „Spark Look", Marker-Datei `.spark-look`, Backup-Ordner `chrome.spark-look-backup`.

## Review Focus

- Profil mit vorhandenem eigenem `chrome/`-Ordner: Die eigenen Dateien müssen nach Install und Uninstall unverändert zurück sein (Task 3).
- `install.ps1` zweimal ausführen: genau ein Pref-Block in `user.js`, kein zweites Backup (Task 3).
- Profilpfad mit Leerzeichen und Umlaut (`spark test ü`): Skripte quoten korrekt (Task 3).
- `user.js` mit BOM würde die erste Pref-Zeile entwerten: Datei muss ohne BOM geschrieben sein (Task 3).
- Windows-Kontrastmodus: Overrides dürfen die erzwungenen Systemfarben nicht überschreiben (Task 2).

---

## Dateistruktur

```
spark-theme/
  manifest.json
  chrome/
    userChrome.css
    userContent.css
  install.ps1
  uninstall.ps1
  README.md
tests/
  check-theme.ps1        Prüft Manifest und CSS statisch
  test-install.ps1       Prüft install/uninstall gegen Wegwerf-Profile
  new-test-profile.ps1   Erzeugt ein Wegwerf-Profil mit Beispiel-Mails
```

---

### Task 1: Manifest-Theme und statische Prüfung

**Files:**
- Create: `spark-theme/manifest.json`
- Create: `tests/check-theme.ps1`

**Interfaces:**
- Produces: `tests/check-theme.ps1` mit Funktion `Assert($cond, $msg)` und Exit-Code 1 bei Fehlern. Task 2 erweitert dieses Skript um CSS-Prüfungen.

- [ ] **Step 1: Prüfskript für das Manifest schreiben (schlägt fehl)**

Erstelle `tests/check-theme.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$script:fail = 0

function Assert($cond, $msg) {
    if ($cond) { Write-Host "PASS $msg" }
    else { Write-Host "FAIL $msg" -ForegroundColor Red; $script:fail++ }
}

# --- Manifest ---
$manifestPath = Join-Path $root 'spark-theme\manifest.json'
Assert (Test-Path -LiteralPath $manifestPath) 'manifest.json existiert'
if (Test-Path -LiteralPath $manifestPath) {
    $m = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    Assert ($m.manifest_version -eq 2) 'manifest_version ist 2'
    Assert ($m.name -eq 'Spark Look') 'name ist Spark Look'
    Assert ($m.browser_specific_settings.gecko.id -eq 'spark-look@local') 'gecko id gesetzt'
    Assert ($m.browser_specific_settings.gecko.strict_min_version -eq '128.0') 'strict_min_version 128.0'
    Assert ($null -ne $m.theme.colors) 'theme.colors vorhanden'
    Assert ($null -ne $m.dark_theme.colors) 'dark_theme.colors vorhanden'
    $light = @($m.theme.colors.PSObject.Properties.Name | Sort-Object)
    $dark = @($m.dark_theme.colors.PSObject.Properties.Name | Sort-Object)
    Assert (($light -join ',') -eq ($dark -join ',')) 'hell und dunkel haben dieselben Farbschluessel'
    foreach ($k in 'frame','toolbar','toolbar_text','sidebar','sidebar_text','sidebar_highlight','popup','tab_line','icons') {
        Assert ($light -contains $k) "Farbschluessel $k vorhanden"
    }
    $all = @($m.theme.colors.PSObject.Properties) + @($m.dark_theme.colors.PSObject.Properties)
    $bad = @($all | Where-Object { $_.Value -notmatch '^(#[0-9a-fA-F]{6}|rgba?\([^)]+\))$' })
    Assert ($bad.Count -eq 0) 'alle Farbwerte sind #rrggbb oder rgb(a)()'
}

if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
```

- [ ] **Step 2: Prüfskript laufen lassen, Fehlschlag bestätigen**

Run: `powershell -NoProfile -File tests/check-theme.ps1`
Expected: `FAIL manifest.json existiert`, Exit-Code 1.

- [ ] **Step 3: Manifest schreiben**

Erstelle `spark-theme/manifest.json`:

```json
{
  "manifest_version": 2,
  "name": "Spark Look",
  "version": "0.1.0",
  "description": "Helles und dunkles Theme im Stil moderner Mail-Clients, von Spark inspiriert.",
  "browser_specific_settings": {
    "gecko": {
      "id": "spark-look@local",
      "strict_min_version": "128.0"
    }
  },
  "theme": {
    "colors": {
      "frame": "#eceff5",
      "frame_inactive": "#f1f3f8",
      "tab_background_text": "#5d6677",
      "tab_text": "#1d2330",
      "tab_selected": "#ffffff",
      "tab_line": "#2f7cf6",
      "toolbar": "#ffffff",
      "toolbar_text": "#1d2330",
      "toolbar_field": "#f4f6fa",
      "toolbar_field_text": "#1d2330",
      "toolbar_field_border": "#e3e7ee",
      "toolbar_field_focus": "#ffffff",
      "toolbar_field_text_focus": "#1d2330",
      "toolbar_field_border_focus": "#2f7cf6",
      "toolbar_field_highlight": "#cfe0fd",
      "toolbar_field_highlight_text": "#1d2330",
      "toolbar_top_separator": "#e3e7ee",
      "toolbar_bottom_separator": "#e3e7ee",
      "toolbar_vertical_separator": "#e3e7ee",
      "icons": "#5d6677",
      "icons_attention": "#2f7cf6",
      "button_background_hover": "rgba(47, 124, 246, 0.10)",
      "button_background_active": "rgba(47, 124, 246, 0.18)",
      "popup": "#ffffff",
      "popup_text": "#1d2330",
      "popup_border": "#e3e7ee",
      "popup_highlight": "#2f7cf6",
      "popup_highlight_text": "#ffffff",
      "sidebar": "#f4f6fa",
      "sidebar_text": "#1d2330",
      "sidebar_border": "#e3e7ee",
      "sidebar_highlight": "#dce9fe",
      "sidebar_highlight_text": "#1d2330"
    }
  },
  "dark_theme": {
    "colors": {
      "frame": "#17181b",
      "frame_inactive": "#1b1c1f",
      "tab_background_text": "#a4aab8",
      "tab_text": "#eceef2",
      "tab_selected": "#1b1c1f",
      "tab_line": "#5b9bff",
      "toolbar": "#1b1c1f",
      "toolbar_text": "#eceef2",
      "toolbar_field": "#26272c",
      "toolbar_field_text": "#eceef2",
      "toolbar_field_border": "#34363c",
      "toolbar_field_focus": "#1b1c1f",
      "toolbar_field_text_focus": "#eceef2",
      "toolbar_field_border_focus": "#5b9bff",
      "toolbar_field_highlight": "#2c4670",
      "toolbar_field_highlight_text": "#eceef2",
      "toolbar_top_separator": "#34363c",
      "toolbar_bottom_separator": "#34363c",
      "toolbar_vertical_separator": "#34363c",
      "icons": "#a4aab8",
      "icons_attention": "#5b9bff",
      "button_background_hover": "rgba(91, 155, 255, 0.16)",
      "button_background_active": "rgba(91, 155, 255, 0.26)",
      "popup": "#222327",
      "popup_text": "#eceef2",
      "popup_border": "#34363c",
      "popup_highlight": "#5b9bff",
      "popup_highlight_text": "#0f1115",
      "sidebar": "#222327",
      "sidebar_text": "#eceef2",
      "sidebar_border": "#34363c",
      "sidebar_highlight": "#2c4670",
      "sidebar_highlight_text": "#eceef2"
    }
  }
}
```

- [ ] **Step 4: Prüfskript laufen lassen, Erfolg bestätigen**

Run: `powershell -NoProfile -File tests/check-theme.ps1`
Expected: nur `PASS`-Zeilen, am Ende `Alle Pruefungen bestanden`, Exit-Code 0.

---

### Task 2: `userChrome.css` – Palette und Variablen-Overrides

**Files:**
- Create: `spark-theme/chrome/userChrome.css`
- Modify: `tests/check-theme.ps1` (CSS-Prüfungen vor der Zeile `if ($script:fail -gt 0)` einfügen)

**Interfaces:**
- Consumes: `Assert` aus Task 1.
- Produces: Palette-Variablen `--spark-accent`, `--spark-accent-soft`, `--spark-accent-text`, `--spark-bg-0`, `--spark-bg-1`, `--spark-bg-2`, `--spark-border`, `--spark-text`, `--spark-text-dim`. Task 5 darf sie in `userContent.css` nicht voraussetzen (anderes Dokument), kann aber dieselben Hex-Werte nutzen.

- [ ] **Step 1: CSS-Prüfungen ins Prüfskript einfügen (schlagen fehl)**

Füge in `tests/check-theme.ps1` direkt vor `if ($script:fail -gt 0)` ein:

```powershell
# --- userChrome.css ---
$cssPath = Join-Path $root 'spark-theme\chrome\userChrome.css'
Assert (Test-Path -LiteralPath $cssPath) 'userChrome.css existiert'
if (Test-Path -LiteralPath $cssPath) {
    $css = Get-Content -LiteralPath $cssPath -Raw
    $open = ([regex]::Matches($css, '\{')).Count
    $close = ([regex]::Matches($css, '\}')).Count
    Assert ($open -eq $close -and $open -gt 0) "geschweifte Klammern ausgeglichen ($open/$close)"
    Assert ($css -match '@media not \(prefers-contrast\)') 'Overrides stehen in @media not (prefers-contrast)'
    Assert ($css -match 'light-dark\(') 'light-dark() wird verwendet'
    $defined = [regex]::Matches($css, '(--spark-[a-z0-9-]+)\s*:') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $used = [regex]::Matches($css, 'var\((--spark-[a-z0-9-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $undefined = @($used | Where-Object { $defined -notcontains $_ })
    Assert ($undefined.Count -eq 0) "alle benutzten --spark-* sind definiert ($($undefined -join ', '))"
    foreach ($v in '--layout-background-0','--layout-background-1','--layout-background-2','--selected-item-color','--listbox-border-radius','--tree-card-background-selected','--button-border-radius','--sidebar-background-color') {
        Assert ($css -match [regex]::Escape($v) + '\s*:') "Override fuer $v vorhanden"
    }
    Assert ($css -notmatch '(?i)TODO|TBD') 'keine Platzhalter'
}
```

- [ ] **Step 2: Prüfskript laufen lassen, Fehlschlag bestätigen**

Run: `powershell -NoProfile -File tests/check-theme.ps1`
Expected: `FAIL userChrome.css existiert`, Exit-Code 1.

- [ ] **Step 3: `userChrome.css` schreiben**

Erstelle `spark-theme/chrome/userChrome.css`. Die `!important`-Angaben sind nötig, weil die eigenen Stylesheets von Thunderbird als Autor-Stylesheets Vorrang vor Benutzer-Stylesheets haben.

```css
/* Spark Look – userChrome.css für Thunderbird 158
 * Überschreibt CSS-Variablen von Thunderbird mit einer Spark-inspirierten Palette.
 * Hell/Dunkel folgt dem System über light-dark(). */

@media not (prefers-contrast) {
  :root {
    /* Palette */
    --spark-accent: light-dark(#2f7cf6, #5b9bff);
    --spark-accent-soft: light-dark(#e3eefe, #25395c);
    --spark-accent-text: light-dark(#ffffff, #0f1115);
    --spark-bg-0: light-dark(#ffffff, #1b1c1f);
    --spark-bg-1: light-dark(#f4f6fa, #222327);
    --spark-bg-2: light-dark(#eceff5, #2a2b30);
    --spark-border: light-dark(#e3e7ee, #34363c);
    --spark-text: light-dark(#1d2330, #eceef2);
    --spark-text-dim: light-dark(#5d6677, #a4aab8);

    /* Flächen */
    --layout-background-0: var(--spark-bg-0) !important;
    --layout-background-1: var(--spark-bg-1) !important;
    --layout-background-2: var(--spark-bg-2) !important;
    --layout-background-3: var(--spark-bg-2) !important;
    --layout-background-4: var(--spark-border) !important;
    --layout-color-0: var(--spark-text) !important;
    --layout-color-1: var(--spark-text) !important;
    --layout-color-2: var(--spark-text-dim) !important;
    --layout-border-0: var(--spark-border) !important;
    --layout-border-1: var(--spark-border) !important;
    --sidebar-background-color: var(--spark-bg-1) !important;
    --sidebar-text-color: var(--spark-text) !important;
    --sidebar-border-color: var(--spark-border) !important;
    --toolbar-background-color: var(--spark-bg-0) !important;
    --toolbar-text-color: var(--spark-text) !important;
    --tree-view-bg: var(--spark-bg-1) !important;

    /* Akzent */
    --selected-item-color: var(--spark-accent) !important;
    --selected-item-text-color: var(--spark-accent-text) !important;
    --button-primary-background-color: var(--spark-accent) !important;
    --button-primary-text-color: var(--spark-accent-text) !important;

    /* Rundungen und Abstände */
    --button-border-radius: 8px !important;
    --button-min-height: 34px !important;
    --input-text-border-radius: 8px !important;
    --input-search-border-radius: 18px !important;
    --listbox-border-radius: 10px !important;
    --list-item-min-height: 34px !important;
    --card-container-padding-block: 3px !important;
    --tree-card-content-inline: 12px !important;

    /* Nachrichtenliste als Karten (Karten-Ansicht) */
    --tree-card-background: var(--spark-bg-0) !important;
    --tree-card-border: transparent !important;
    --tree-card-border-hover: var(--spark-border) !important;
    --tree-card-border-focus: var(--spark-accent) !important;
    --tree-card-background-current: var(--spark-bg-2) !important;
    --tree-card-background-selected: var(--spark-accent-soft) !important;
    --tree-card-background-selected-current: var(--spark-accent-soft) !important;
    --tree-card-border-selected: transparent !important;
    --tree-card-background-current-unfocused: var(--spark-bg-2) !important;
    --tree-card-background-selected-unfocused: var(--spark-accent-soft) !important;
    --tree-card-background-selected-current-unfocused: var(--spark-accent-soft) !important;
    --tree-card-border-selected-unfocused: transparent !important;

    /* Tabellen-Ansicht (Fallback) */
    --listbox-selected-bg: var(--spark-accent-soft) !important;
    --listbox-hover: var(--spark-bg-2) !important;
    --unread-color: var(--spark-text) !important;
  }
}
```

- [ ] **Step 4: Prüfskript laufen lassen, Erfolg bestätigen**

Run: `powershell -NoProfile -File tests/check-theme.ps1`
Expected: alle `PASS`, `Alle Pruefungen bestanden`, Exit-Code 0.

---

### Task 3: Install- und Uninstall-Skripte mit Tests

**Files:**
- Create: `spark-theme/install.ps1`
- Create: `spark-theme/uninstall.ps1`
- Create: `tests/test-install.ps1`

**Interfaces:**
- Consumes: `spark-theme/chrome/` aus Task 2 (Quelle für die Kopie).
- Produces: `install.ps1 -ProfilePath <Pfad> [-SkipRunningCheck]` und `uninstall.ps1 -ProfilePath <Pfad> [-SkipRunningCheck]`. Beide werfen Fehler per `throw`. Task 4 ruft `install.ps1` gegen ein Wegwerf-Profil auf.

- [ ] **Step 1: Test schreiben (schlägt fehl)**

Erstelle `tests/test-install.ps1`:

```powershell
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$install = Join-Path $root 'spark-theme\install.ps1'
$uninstall = Join-Path $root 'spark-theme\uninstall.ps1'
$script:fail = 0

function Assert($cond, $msg) {
    if ($cond) { Write-Host "PASS $msg" }
    else { Write-Host "FAIL $msg" -ForegroundColor Red; $script:fail++ }
}
function New-Profile($name) {
    $p = Join-Path $env:TEMP ("spark-test-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + " $name")
    New-Item -ItemType Directory -Path $p | Out-Null
    return $p
}
function Count-Lines($text, $needle) {
    return ([regex]::Matches($text, [regex]::Escape($needle))).Count
}
$prefLine = 'toolkit.legacyUserProfileCustomizations.stylesheets'

# A: frisches Profil, Pfad mit Leerzeichen und Umlaut
$a = New-Profile 'spark test ü'
& $install -ProfilePath $a -SkipRunningCheck | Out-Null
Assert (Test-Path -LiteralPath (Join-Path $a 'chrome\userChrome.css')) 'A: userChrome.css kopiert'
Assert (Test-Path -LiteralPath (Join-Path $a 'chrome\.spark-look')) 'A: Marker-Datei gesetzt'
$js = Get-Content -LiteralPath (Join-Path $a 'user.js') -Raw
Assert ((Count-Lines $js $prefLine) -eq 1) 'A: genau eine Pref-Zeile'
$bytes = [IO.File]::ReadAllBytes((Join-Path $a 'user.js'))
Assert (-not ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) 'A: user.js ohne BOM'

# B: zweimal installieren
& $install -ProfilePath $a -SkipRunningCheck | Out-Null
$js = Get-Content -LiteralPath (Join-Path $a 'user.js') -Raw
Assert ((Count-Lines $js $prefLine) -eq 1) 'B: nach zweitem Install weiterhin genau eine Pref-Zeile'
Assert (-not (Test-Path -LiteralPath (Join-Path $a 'chrome.spark-look-backup'))) 'B: kein Backup bei eigener Installation'

# C: eigenes chrome/ und eigene user.js bleiben erhalten
$c = New-Profile 'eigenes chrome'
New-Item -ItemType Directory -Path (Join-Path $c 'chrome') | Out-Null
Set-Content -LiteralPath (Join-Path $c 'chrome\userChrome.css') -Value '/* mine */' -Encoding ASCII
Set-Content -LiteralPath (Join-Path $c 'user.js') -Value 'user_pref("a.b", 1);' -Encoding ASCII
& $install -ProfilePath $c -SkipRunningCheck | Out-Null
$backupCss = Join-Path $c 'chrome.spark-look-backup\userChrome.css'
Assert ((Test-Path -LiteralPath $backupCss) -and ((Get-Content -LiteralPath $backupCss -Raw).Trim() -eq '/* mine */')) 'C: eigenes userChrome.css gesichert'
$js = Get-Content -LiteralPath (Join-Path $c 'user.js') -Raw
Assert ($js -match 'a\.b') 'C: eigene user.js-Zeile bleibt nach Install'
& $uninstall -ProfilePath $c -SkipRunningCheck | Out-Null
Assert ((Get-Content -LiteralPath (Join-Path $c 'chrome\userChrome.css') -Raw).Trim() -eq '/* mine */') 'C: eigenes userChrome.css nach Uninstall zurueck'
Assert (-not (Test-Path -LiteralPath (Join-Path $c 'chrome.spark-look-backup'))) 'C: Backup-Ordner nach Uninstall weg'
$js = Get-Content -LiteralPath (Join-Path $c 'user.js') -Raw
Assert (($js -match 'a\.b') -and ($js -notmatch 'spark-look')) 'C: user.js wie vorher, ohne Spark-Block'

# D: Uninstall nach Install im frischen Profil entfernt alles
& $uninstall -ProfilePath $a -SkipRunningCheck | Out-Null
Assert (-not (Test-Path -LiteralPath (Join-Path $a 'chrome'))) 'D: chrome/ entfernt'
Assert (-not (Test-Path -LiteralPath (Join-Path $a 'user.js'))) 'D: leere user.js entfernt'

# E: Uninstall in nie installiertem Profil ist ein No-op
$e = New-Profile 'unberuehrt'
Set-Content -LiteralPath (Join-Path $e 'user.js') -Value 'user_pref("x.y", 2);' -Encoding ASCII
& $uninstall -ProfilePath $e -SkipRunningCheck | Out-Null
Assert ((Get-Content -LiteralPath (Join-Path $e 'user.js') -Raw) -match 'x\.y') 'E: unberuehrte user.js bleibt'

# F: ohne -ProfilePath gibt es einen Fehler mit Hinweis
$threw = $false; $msg = ''
try { & $install -SkipRunningCheck | Out-Null } catch { $threw = $true; $msg = $_.Exception.Message }
Assert ($threw -and $msg -match 'ProfilePath') 'F: fehlender -ProfilePath wirft mit Hinweis'

# G: nicht vorhandenes Profil
$threw = $false
try { & $install -ProfilePath (Join-Path $env:TEMP 'gibt-es-nicht-12345') -SkipRunningCheck | Out-Null } catch { $threw = $true }
Assert $threw 'G: nicht vorhandenes Profil wirft'

foreach ($p in $a, $c, $e) { if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force } }

if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
```

- [ ] **Step 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `powershell -NoProfile -File tests/test-install.ps1`
Expected: Abbruch mit Fehler, weil `install.ps1` nicht existiert.

- [ ] **Step 3: `install.ps1` schreiben**

Erstelle `spark-theme/install.ps1`:

```powershell
[CmdletBinding()]
param(
    [string]$ProfilePath,
    [switch]$SkipRunningCheck
)
$ErrorActionPreference = 'Stop'

$beginMark = '// >>> spark-look begin'
$endMark = '// <<< spark-look end'
$markerName = '.spark-look'
$backupName = 'chrome.spark-look-backup'
$source = Join-Path $PSScriptRoot 'chrome'

if (-not $SkipRunningCheck -and (Get-Process -Name thunderbird -ErrorAction SilentlyContinue)) {
    throw 'Thunderbird laeuft. Bitte beenden und das Skript erneut starten.'
}

if (-not $ProfilePath) {
    $base = Join-Path $env:APPDATA 'Thunderbird\Profiles'
    $found = @()
    if (Test-Path -LiteralPath $base) {
        $found = @(Get-ChildItem -LiteralPath $base -Directory | ForEach-Object { $_.FullName })
    }
    $list = '(keine gefunden)'
    if ($found.Count -gt 0) { $list = $found -join [Environment]::NewLine }
    throw "Kein -ProfilePath angegeben. Gefundene Profile:$([Environment]::NewLine)$list"
}
if (-not (Test-Path -LiteralPath $ProfilePath -PathType Container)) {
    throw "Profil nicht gefunden: $ProfilePath"
}

$chromeDir = Join-Path $ProfilePath 'chrome'
$backupDir = Join-Path $ProfilePath $backupName
$marker = Join-Path $chromeDir $markerName

if ((Test-Path -LiteralPath $chromeDir) -and -not (Test-Path -LiteralPath $marker)) {
    if (Test-Path -LiteralPath $backupDir) { throw "Backup existiert bereits: $backupDir" }
    Move-Item -LiteralPath $chromeDir -Destination $backupDir
}

New-Item -ItemType Directory -Path $chromeDir -Force | Out-Null
Get-ChildItem -LiteralPath $source | Copy-Item -Destination $chromeDir -Recurse -Force
[IO.File]::WriteAllText($marker, 'managed by spark-look', (New-Object Text.UTF8Encoding($false)))

$userJs = Join-Path $ProfilePath 'user.js'
$existing = ''
if (Test-Path -LiteralPath $userJs) { $existing = [IO.File]::ReadAllText($userJs) }
$pattern = '(?s)\r?\n?' + [regex]::Escape($beginMark) + '.*?' + [regex]::Escape($endMark) + '\r?\n?'
$clean = [regex]::Replace($existing, $pattern, '')
if ($clean.Length -gt 0 -and -not $clean.EndsWith("`n")) { $clean += "`r`n" }
$block = $beginMark + "`r`n" + 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);' + "`r`n" + $endMark + "`r`n"
[IO.File]::WriteAllText($userJs, $clean + $block, (New-Object Text.UTF8Encoding($false)))

Write-Host "Installiert in $ProfilePath"
```

- [ ] **Step 4: `uninstall.ps1` schreiben**

Erstelle `spark-theme/uninstall.ps1`:

```powershell
[CmdletBinding()]
param(
    [string]$ProfilePath,
    [switch]$SkipRunningCheck
)
$ErrorActionPreference = 'Stop'

$beginMark = '// >>> spark-look begin'
$endMark = '// <<< spark-look end'
$markerName = '.spark-look'
$backupName = 'chrome.spark-look-backup'

if (-not $SkipRunningCheck -and (Get-Process -Name thunderbird -ErrorAction SilentlyContinue)) {
    throw 'Thunderbird laeuft. Bitte beenden und das Skript erneut starten.'
}
if (-not $ProfilePath) { throw 'Kein -ProfilePath angegeben.' }
if (-not (Test-Path -LiteralPath $ProfilePath -PathType Container)) {
    throw "Profil nicht gefunden: $ProfilePath"
}

$chromeDir = Join-Path $ProfilePath 'chrome'
$backupDir = Join-Path $ProfilePath $backupName
$marker = Join-Path $chromeDir $markerName

if (Test-Path -LiteralPath $marker) {
    Remove-Item -LiteralPath $chromeDir -Recurse -Force
    if (Test-Path -LiteralPath $backupDir) {
        Move-Item -LiteralPath $backupDir -Destination $chromeDir
    }
}

$userJs = Join-Path $ProfilePath 'user.js'
if (Test-Path -LiteralPath $userJs) {
    $existing = [IO.File]::ReadAllText($userJs)
    $pattern = '(?s)\r?\n?' + [regex]::Escape($beginMark) + '.*?' + [regex]::Escape($endMark) + '\r?\n?'
    $clean = [regex]::Replace($existing, $pattern, '')
    if ($clean -ne $existing) {
        if ($clean.Trim().Length -eq 0) {
            Remove-Item -LiteralPath $userJs -Force
        } else {
            [IO.File]::WriteAllText($userJs, $clean, (New-Object Text.UTF8Encoding($false)))
        }
    }
}

Write-Host "Entfernt aus $ProfilePath"
```

- [ ] **Step 5: Test laufen lassen, Erfolg bestätigen**

Run: `powershell -NoProfile -File tests/test-install.ps1`
Expected: alle `PASS` (Gruppen A bis G), `Alle Pruefungen bestanden`, Exit-Code 0.

- [ ] **Step 6: Beide Prüfskripte zusammen laufen lassen**

Run: `powershell -NoProfile -File tests/check-theme.ps1; powershell -NoProfile -File tests/test-install.ps1`
Expected: beide enden mit `Alle Pruefungen bestanden`.

---

### Task 4: Wegwerf-Profil, Sichtprüfung und Feinschliff

**Files:**
- Create: `tests/new-test-profile.ps1`
- Modify: `spark-theme/chrome/userChrome.css` (strukturelle Regeln nach Inspektion anhängen)

**Interfaces:**
- Consumes: `install.ps1` aus Task 3.
- Produces: `tests/new-test-profile.ps1 [-Dark] [-Path <Ordner>]` erzeugt ein Profil mit „Local Folders" und 8 Beispiel-Mails und gibt den Profilpfad aus.

Diese Task ist eine Sichtprüfung. Die Ergebnisse sind Screenshots, keine automatischen Tests. Die einzelnen Regeln im Feinschliff stehen erst nach der Inspektion fest, weil die Selektoren für Ordnerleiste und Toolbar in 158 nicht aus den Variablen folgen.

- [ ] **Step 1: Profil-Generator schreiben**

Erstelle `tests/new-test-profile.ps1`:

```powershell
[CmdletBinding()]
param(
    [switch]$Dark,
    [string]$Path = (Join-Path $env:TEMP 'tb-spark-test')
)
$ErrorActionPreference = 'Stop'

if ($Path -notlike "$env:TEMP*") { throw "Nur Pfade unter %TEMP% erlaubt: $Path" }
if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
$mailDir = Join-Path $Path 'Mail\Local Folders'
New-Item -ItemType Directory -Path $mailDir -Force | Out-Null

$subjects = @(
    @('Anna Berger', 'Projektplan Q4 – bitte prüfen', '0000'),
    @('Max Keller', 'Re: Rechnung 2026-1043', '0001'),
    @('GitHub', '[repo] Pull request #42 merged', '0000'),
    @('Lena Fischer', 'Einladung: Teamfrühstück am Freitag', '0000'),
    @('Newsletter Tech', 'Die Woche in 5 Minuten', '0001'),
    @('Jonas Wolf', 'Fotos vom Wochenende', '0001'),
    @('Support', 'Ihr Ticket wurde aktualisiert', '0000'),
    @('Sara Neumann', 'Re: Terminabstimmung Oktober', '0001')
)
$sb = New-Object System.Text.StringBuilder
$i = 0
foreach ($s in $subjects) {
    $i++
    $date = (Get-Date '2026-10-18 09:00').AddHours(-3 * $i).ToString('ddd, dd MMM yyyy HH:mm:ss +0200', [Globalization.CultureInfo]::InvariantCulture)
    [void]$sb.Append("From - $date`r`n")
    [void]$sb.Append("X-Mozilla-Status: $($s[2])`r`nX-Mozilla-Status2: 00000000`r`n")
    [void]$sb.Append("From: $($s[0]) <person$i@example.com>`r`nTo: me@example.com`r`n")
    [void]$sb.Append("Subject: $($s[1])`r`nDate: $date`r`nMessage-ID: <test$i@example.com>`r`n")
    [void]$sb.Append("MIME-Version: 1.0`r`nContent-Type: text/plain; charset=UTF-8`r`n`r`n")
    [void]$sb.Append("Hallo,`r`n`r`ndas ist Testnachricht $i fuer die Sichtpruefung des Themes.`r`n`r`n> zitierter Text`r`n`r`nViele Gruesse`r`n$($s[0])`r`n`r`n")
}
[IO.File]::WriteAllText((Join-Path $mailDir 'Inbox'), $sb.ToString(), (New-Object Text.UTF8Encoding($false)))

$dir = ($mailDir -replace '\\', '/')
$mailRoot = ((Join-Path $Path 'Mail') -replace '\\', '/')
$darkValue = 0; if ($Dark) { $darkValue = 1 }
$prefs = @(
    'user_pref("mail.account.account1.server", "server1");',
    'user_pref("mail.accountmanager.accounts", "account1");',
    'user_pref("mail.accountmanager.defaultaccount", "account1");',
    'user_pref("mail.accountmanager.localfoldersserver", "server1");',
    'user_pref("mail.server.server1.type", "none");',
    'user_pref("mail.server.server1.hostname", "Local Folders");',
    'user_pref("mail.server.server1.name", "Local Folders");',
    'user_pref("mail.server.server1.userName", "nobody");',
    "user_pref(`"mail.server.server1.directory`", `"$dir`");",
    'user_pref("mail.server.server1.storeContractID", "@mozilla.org/msgstore/berkeleystore;1");',
    "user_pref(`"mail.root.none`", `"$mailRoot`");",
    'user_pref("mail.shell.checkDefaultClient", false);',
    'user_pref("mail.provider.suppress_dialog_on_startup", true);',
    'user_pref("mailnews.start_page.enabled", false);',
    'user_pref("app.update.auto", false);',
    'user_pref("app.update.enabled", false);',
    'user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);',
    'user_pref("devtools.chrome.enabled", true);',
    'user_pref("devtools.debugger.remote-enabled", true);',
    'user_pref("devtools.debugger.prompt-connection", false);',
    "user_pref(`"ui.systemUsesDarkTheme`", $darkValue);"
)
[IO.File]::WriteAllText((Join-Path $Path 'user.js'), ($prefs -join "`r`n") + "`r`n", (New-Object Text.UTF8Encoding($false)))

Write-Output $Path
```

- [ ] **Step 2: Helles Profil erzeugen, Theme installieren, Thunderbird starten**

Run:

```powershell
$p = powershell -NoProfile -File tests/new-test-profile.ps1
powershell -NoProfile -File spark-theme/install.ps1 -ProfilePath $p -SkipRunningCheck
Start-Process 'C:\Program Files\Mozilla Thunderbird\thunderbird.exe' -ArgumentList '-profile', "`"$p`"", '-no-remote', '-jsdebugger'
```

Expected: Thunderbird öffnet mit „Local Folders" und 8 Mails im Posteingang. Erscheint beim ersten Start ein Dialog (Konto-Hub, Standard-Programm), schließe ihn von Hand und notiere, welche Pref ihn verhindert hätte, damit sie in `new-test-profile.ps1` ergänzt werden kann.

- [ ] **Step 3: Karten-Ansicht aktivieren und Hell-Screenshots prüfen**

In Thunderbird: Nachrichtenliste → Anzeigen-Schaltfläche (Display) → „Karten-Ansicht" wählen. Dann Screenshot der Hauptansicht aufnehmen (computer-use, Zugriff auf Thunderbird anfragen).

Prüfe auf dem Screenshot:
- Nachrichtenliste: Karten mit ca. 10 px Rundung, ausgewählte Karte hellblau, kein harter Rahmen.
- Hintergrund der Liste hellgrau, Karten weiß.
- Ordnerleiste: helle Fläche `#f4f6fa`, blauer Akzent bei Auswahl.
- Toolbar und Suchfeld: weiße Toolbar, abgerundetes Suchfeld.

Erwartet: Variablen wirken. Wirkt kein Override (alles sieht aus wie Standard), ist `userChrome.css` nicht geladen. Prüfe dann `about:support` → „Benutzerdefinierte Stylesheets" bzw. dass `toolkit.legacyUserProfileCustomizations.stylesheets` in `about:config` auf `true` steht.

- [ ] **Step 4: Strukturelle Regeln anhängen**

Die Selektoren stammen aus dem Quelltext von Thunderbird 158 (`about3Pane.css`, `unifiedToolbarShared.css`): Ordnerzeilen sind `#folderTree li > .container`, die ausgewählte Zeile `#folderTree li.selected > .container`, Toolbar-Buttons `.unified-toolbar-button`, das Suchfeld `.search-bar`.

Hänge an `spark-theme/chrome/userChrome.css` an:

```css
@media not (prefers-contrast) {
  /* Ordnerleiste: Zeilen und aktive Zeile als abgerundete Pills */
  #folderTree li > .container {
    border-radius: 10px;
    margin-inline: 6px;
  }
  #folderTree li.selected > .container {
    background-color: var(--spark-accent-soft);
    color: var(--spark-text);
  }

  /* Toolbar-Buttons: abgerundet */
  .unified-toolbar-button {
    border-radius: 8px;
  }

  /* Suchfeld in der Toolbar: Pill */
  .search-bar {
    border-radius: 18px;
  }
}
```

Starte Thunderbird neu und schaue auf einen Screenshot. Zeigt eine der Regeln keinen sichtbaren Effekt, streiche sie, statt wirkungsloses CSS zu behalten.

- [ ] **Step 5: Fallback per Browser-Toolbox, falls eine Regel wirkungslos bleibt**

Thunderbird wurde mit `-jsdebugger` gestartet. Öffne über Extras → Entwicklerwerkzeuge → Entwicklerwerkzeuge für Thunderbird die Browser-Toolbox, wähle im Inspektor den Frame `about:3pane` bzw. das Hauptfenster, picke das betroffene Element und notiere, welcher Selektor die Eigenschaft tatsächlich setzt. Passe die Regel aus Step 4 daran an. Überspringe diesen Schritt, wenn alle Regeln aus Step 4 wirken.

- [ ] **Step 6: Statische Prüfung erweitern und laufen lassen**

Ergänze in `tests/check-theme.ps1` direkt unter der Prüfung `Overrides stehen in @media not (prefers-contrast)`:

```powershell
    foreach ($sel in '#folderTree li > .container', '.unified-toolbar-button', '.search-bar') {
        Assert ($css.Contains($sel)) "Struktur-Regel fuer $sel vorhanden"
    }
```

Run: `powershell -NoProfile -File tests/check-theme.ps1`
Expected: `Alle Pruefungen bestanden`. Wurde eine Regel in Step 4/5 gestrichen, entferne die zugehörige Selektor-Prüfung ebenfalls.

- [ ] **Step 7: Dunkles Profil prüfen**

Thunderbird schließen. Dann:

```powershell
$pd = powershell -NoProfile -File tests/new-test-profile.ps1 -Dark -Path (Join-Path $env:TEMP 'tb-spark-test-dark')
powershell -NoProfile -File spark-theme/install.ps1 -ProfilePath $pd -SkipRunningCheck
Start-Process 'C:\Program Files\Mozilla Thunderbird\thunderbird.exe' -ArgumentList '-profile', "`"$pd`"", '-no-remote'
```

Screenshot aufnehmen und prüfen: dunkle Flächen `#1b1c1f` bis `#2a2b30`, hellblauer Akzent `#5b9bff`, lesbarer Text (`#eceef2`), ausgewählte Karte dunkelblau `#25395c`. Karten-Ansicht ggf. erneut wählen.

- [ ] **Step 8: Aufräumen**

Thunderbird schließen, dann Wegwerf-Profile löschen:

```powershell
Remove-Item -LiteralPath (Join-Path $env:TEMP 'tb-spark-test') -Recurse -Force
Remove-Item -LiteralPath (Join-Path $env:TEMP 'tb-spark-test-dark') -Recurse -Force
```

---

### Task 5: `userContent.css`, README und Abschlussprüfung

**Files:**
- Create: `spark-theme/chrome/userContent.css`
- Create: `spark-theme/README.md`
- Modify: `tests/check-theme.ps1` (Prüfung für `userContent.css` einfügen)

**Interfaces:**
- Consumes: Palette-Hexwerte aus Task 2 (doppelt notiert, da `userContent.css` ein anderes Dokument stylt und keine `--spark-*`-Variablen sieht).

- [ ] **Step 1: Prüfung für `userContent.css` ergänzen (schlägt fehl)**

Füge in `tests/check-theme.ps1` vor `if ($script:fail -gt 0)` ein:

```powershell
# --- userContent.css ---
$ccPath = Join-Path $root 'spark-theme\chrome\userContent.css'
Assert (Test-Path -LiteralPath $ccPath) 'userContent.css existiert'
if (Test-Path -LiteralPath $ccPath) {
    $cc = Get-Content -LiteralPath $ccPath -Raw
    $o = ([regex]::Matches($cc, '\{')).Count
    $c2 = ([regex]::Matches($cc, '\}')).Count
    Assert ($o -eq $c2 -and $o -gt 0) "userContent.css: Klammern ausgeglichen ($o/$c2)"
    Assert ($cc -notmatch '!important') 'userContent.css: kein !important auf Mail-Inhalten'
}
Assert (Test-Path -LiteralPath (Join-Path $root 'spark-theme\README.md')) 'README.md existiert'
```

Run: `powershell -NoProfile -File tests/check-theme.ps1`
Expected: `FAIL userContent.css existiert`, Exit-Code 1.

- [ ] **Step 2: `userContent.css` schreiben**

Die Datei bleibt bewusst klein und greift nur dort ein, wo Mails keine eigenen Stile mitbringen (Zitate, Links). Kein `!important`, damit HTML-Mails ihr Layout behalten.

Erstelle `spark-theme/chrome/userContent.css`:

```css
/* Spark Look – userContent.css
 * Sanfte Anpassung von Zitaten und Links in Nachrichten.
 * Kein !important: HTML-Mails behalten ihr eigenes Layout. */

@media not (prefers-contrast) {
  blockquote[type="cite"] {
    border-inline-start: 3px solid light-dark(#cfe0fd, #2c4670);
    padding-inline-start: 12px;
    margin-inline: 0;
  }

  a:any-link {
    color: light-dark(#2f7cf6, #5b9bff);
  }
}
```

- [ ] **Step 3: README schreiben**

Erstelle `spark-theme/README.md`:

````markdown
# Spark Look für Thunderbird 158

Helles und dunkles Theme im Stil moderner Mail-Clients. Folgt dem System (Hell/Dunkel).

## Installation

1. Thunderbird beenden.
2. In PowerShell im Ordner `spark-theme`:

   ```powershell
   .\install.ps1 -ProfilePath "C:\Users\<Name>\AppData\Roaming\Thunderbird\Profiles\<profil>"
   ```

   Ohne `-ProfilePath` listet das Skript die vorhandenen Profile auf.
3. Thunderbird starten. Nachrichtenliste → Anzeigen → **Karten-Ansicht** wählen.

## Basisfarben (Manifest-Theme)

Thunderbird verlangt signierte Add-ons. Zwei Wege:

- **Temporär:** `about:debugging` → „Dieser Thunderbird" → „Temporäres Add-on laden" → `manifest.json` wählen. Gilt bis zum Neustart.
- **Dauerhaft:** Ordnerinhalt als `.xpi` packen, bei addons.thunderbird.net als „unlisted" kostenlos signieren lassen und per Add-ons-Manager installieren.

Ohne das Manifest-Theme sieht das Ergebnis fast gleich aus, weil `userChrome.css` die wichtigsten Flächen selbst färbt.

## Entfernen

```powershell
.\uninstall.ps1 -ProfilePath "<profil>"
```

Ein vorher vorhandener `chrome/`-Ordner wird aus `chrome.spark-look-backup` zurückgestellt.

## Grenzen

- Getestet mit Thunderbird 158. Nach größeren Updates können Selektoren in `userChrome.css` nachgezogen werden müssen.
- Kein Store-Release, keine Spark-Assets.
````

- [ ] **Step 4: Abschlussprüfung**

Run: `powershell -NoProfile -File tests/check-theme.ps1; powershell -NoProfile -File tests/test-install.ps1`
Expected: beide enden mit `Alle Pruefungen bestanden`, Exit-Code 0.

- [ ] **Step 5: Übergabe an den Nutzer**

Dem Nutzer mitteilen: Theme ist gegen Wegwerf-Profile geprüft. Echte Profile sind unberührt. Für den echten Einsatz Thunderbird beenden und `install.ps1` mit dem gewünschten Profilpfad starten (Profile: `8veadpjh.default-release`, `cbx1vnpp.default`). Vorher eine Freigabe einholen, welches Profil.
