<#
.SYNOPSIS
    Verlinkt theme-css/userChrome.css, userContent.css und die gemeinsamen Tokens
    (extension-workspace-switcher/shared/tokens.css) per Hardlink ins Thunderbird-Profil.

.DESCRIPTION
    Entwicklungs-Installation fuer Windows. Hardlinks brauchen weder Adminrechte noch den
    Entwicklermodus; Aenderungen im Repo landen ohne erneutes Kopieren im Profil
    (Thunderbird-Neustart noetig).

    Geht kein Hardlink (Repo in Nextcloud/OneDrive, anderes Laufwerk), schreibt das Skript
    eine kleine Stub-Datei, die die Repo-Datei per @import url("file:///...") laedt.
    Das wirkt genauso live.

    Hinweis: Ein Editor oder Sync-Client, der Dateien ersetzt statt sie zu ueberschreiben,
    trennt einen Hardlink. Das Skript einfach erneut ausfuehren, es verlinkt dann neu.

    - Fremde Dateien in chrome/ werden nach chrome.workspace-suite-backup/ gesichert.
    - Ist das Spark-Theme installiert, wird es vorher ueber spark-theme/uninstall.ps1 entfernt.
    - Setzt toolkit.legacyUserProfileCustomizations.stylesheets in user.js.
    - -Remove macht alles rueckgaengig und stellt gesicherte Dateien zurueck.

.EXAMPLE
    .\scripts\install-dev.ps1
.EXAMPLE
    .\scripts\install-dev.ps1 -Remove
#>
[CmdletBinding()]
param(
    [string]$ProfilePath,
    [string]$ProfilesIni = (Join-Path $env:APPDATA 'Thunderbird\profiles.ini'),
    [switch]$Remove,
    [switch]$SkipRunningCheck
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'profile-lib.ps1')

$repoRoot = Split-Path $PSScriptRoot -Parent
$source = Join-Path $repoRoot 'theme-css'
# Name in chrome/ -> Datei im Repo. tokens.css teilt sich das Theme mit den Add-on-Seiten.
$sources = [ordered]@{
    'userChrome.css'  = Join-Path $source 'userChrome.css'
    'userContent.css' = Join-Path $source 'userContent.css'
    'tokens.css'      = Join-Path $repoRoot 'extension-workspace-switcher\shared\tokens.css'
}
$files = @($sources.Keys)
$markerName = '.workspace-suite'
$backupName = 'chrome.workspace-suite-backup'
$beginMark = '// >>> workspace-suite begin'
$endMark = '// <<< workspace-suite end'
$utf8 = New-Object Text.UTF8Encoding($false)

if (-not $ProfilePath) { $ProfilePath = Get-DefaultProfile $ProfilesIni }
if (-not (Test-Path -LiteralPath $ProfilePath -PathType Container)) {
    throw "Profil nicht gefunden: $ProfilePath"
}
$tbRunning = -not $SkipRunningCheck -and (Get-Process -Name thunderbird -ErrorAction SilentlyContinue)

$chromeDir = Join-Path $ProfilePath 'chrome'
$backupDir = Join-Path $ProfilePath $backupName
$marker = Join-Path $chromeDir $markerName
$userJs = Join-Path $ProfilePath 'user.js'

function Remove-UserJsBlock {
    if (-not (Test-Path -LiteralPath $userJs)) { return }
    $existing = [IO.File]::ReadAllText($userJs)
    $pattern = '(?ms)^[ \t]*' + [regex]::Escape($beginMark) + '.*?' + [regex]::Escape($endMark) + '[ \t]*(\r?\n|$)'
    $clean = [regex]::Replace($existing, $pattern, '')
    if ($clean -eq $existing) { return }
    if ($clean.Trim().Length -eq 0) { Remove-Item -LiteralPath $userJs -Force }
    else { [IO.File]::WriteAllText($userJs, $clean, $utf8) }
}

function Restore-Backup {
    if (-not (Test-Path -LiteralPath $backupDir)) { return }
    if (-not (Test-Path -LiteralPath $chromeDir)) { New-Item -ItemType Directory -Path $chromeDir | Out-Null }
    foreach ($item in Get-ChildItem -LiteralPath $backupDir -Force) {
        $target = Join-Path $chromeDir $item.Name
        if (Test-Path -LiteralPath $target) { Write-Warning "Nicht zurueckgestellt (Name existiert schon): $($item.FullName)" }
        else { Move-Item -LiteralPath $item.FullName -Destination $target }
    }
    if (-not (Get-ChildItem -LiteralPath $backupDir -Force)) { Remove-Item -LiteralPath $backupDir -Force }
}

# ------------------------------------------------------------------ Entfernen
if ($Remove) {
    if (Test-Path -LiteralPath $marker) {
        # Remove-Item auf einem Hardlink loescht nur den Link, nicht die Repo-Datei.
        foreach ($name in $files) {
            $target = Join-Path $chromeDir $name
            if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
        }
        Remove-Item -LiteralPath $marker -Force
        if (-not (Get-ChildItem -LiteralPath $chromeDir -Force)) { Remove-Item -LiteralPath $chromeDir -Force }
        Restore-Backup
    }
    Remove-UserJsBlock
    Write-Host "Workspace-Theme entfernt aus $ProfilePath"
    if ($tbRunning) { Write-Host 'Thunderbird neu starten, damit die Aenderung wirkt.' }
    return
}

# ------------------------------------------------------------------ Installieren
foreach ($name in $files) {
    if (-not (Test-Path -LiteralPath $sources[$name])) { throw "Fehlt im Repo: $($sources[$name])" }
}

# Spark-Theme abloesen, falls installiert (nur eins kann aktiv sein)
if (Test-Path -LiteralPath (Join-Path $chromeDir '.spark-look')) {
    $sparkUninstall = Join-Path $repoRoot 'spark-theme\uninstall.ps1'
    if (-not (Test-Path -LiteralPath $sparkUninstall)) {
        throw 'Spark-Theme ist installiert, aber spark-theme\uninstall.ps1 fehlt. Bitte zuerst manuell entfernen.'
    }
    Write-Host 'Spark-Theme ist installiert und wird zuerst entfernt.'
    & $sparkUninstall -ProfilePath $ProfilePath -SkipRunningCheck | Out-Null
}

if (-not (Test-Path -LiteralPath $chromeDir)) { New-Item -ItemType Directory -Path $chromeDir | Out-Null }
$owned = Test-Path -LiteralPath $marker

foreach ($name in $files) {
    $src = $sources[$name]
    $target = Join-Path $chromeDir $name
    if (Test-Path -LiteralPath $target) {
        if ($owned) {
            Remove-Item -LiteralPath $target -Force
        } else {
            if (-not (Test-Path -LiteralPath $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
            $bak = Join-Path $backupDir $name
            if (Test-Path -LiteralPath $bak) { throw "Backup existiert schon: $bak" }
            Move-Item -LiteralPath $target -Destination $bak
            Write-Host "Gesichert: $name -> $backupName\"
        }
    }
    try {
        New-Item -ItemType HardLink -Path $target -Target $src | Out-Null
        Write-Host "Hardlink: chrome\$name -> $src"
    } catch {
        # Typisch bei Nextcloud/OneDrive (Cloud-Files-API) oder anderem Laufwerk:
        # Stub-Datei, die die Repo-Datei per file:-URL importiert. Wirkt ebenso live.
        $url = ([Uri]$src).AbsoluteUri
        $stub = "/* Verwaltet von scripts/install-dev.ps1 - laedt die Datei direkt aus dem Repo. */`n@import url(`"$url`");`n"
        [IO.File]::WriteAllText($target, $stub, $utf8)
        Write-Host "Import-Stub: chrome\$name -> $url (Hardlink nicht moeglich: $($_.Exception.Message))"
    }
}
[IO.File]::WriteAllText($marker, "managed by scripts/install-dev.ps1`n", $utf8)

# Pref fuer userChrome.css/userContent.css in user.js (eigener Block, idempotent)
Remove-UserJsBlock
$block = "$beginMark`nuser_pref(`"toolkit.legacyUserProfileCustomizations.stylesheets`", true);`n$endMark`n"
if (Test-Path -LiteralPath $userJs) {
    $existing = [IO.File]::ReadAllText($userJs)
    if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { $existing += "`n" }
    [IO.File]::WriteAllText($userJs, $existing + $block, $utf8)
} else {
    [IO.File]::WriteAllText($userJs, $block, $utf8)
}

Write-Host "Installiert in $ProfilePath"
if ($tbRunning) { Write-Host 'Thunderbird laeuft: bitte neu starten, damit das Theme geladen wird.' }
