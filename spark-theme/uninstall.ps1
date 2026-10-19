[CmdletBinding()]
param(
    [string]$ProfilePath,
    [switch]$Auto,
    [string]$ProfilesIni = (Join-Path $env:APPDATA 'Thunderbird\profiles.ini'),
    [switch]$SkipRunningCheck
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'profile-lib.ps1')

$beginMark = '// >>> spark-look begin'
$endMark = '// <<< spark-look end'
$markerName = '.spark-look'
$backupName = 'chrome.spark-look-backup'
$source = Join-Path $PSScriptRoot 'chrome'

if (-not $SkipRunningCheck -and (Get-Process -Name thunderbird -ErrorAction SilentlyContinue)) {
    throw 'Thunderbird laeuft. Bitte beenden und das Skript erneut starten.'
}
if (-not $ProfilePath -and $Auto) { $ProfilePath = Get-DefaultProfile $ProfilesIni }
if (-not $ProfilePath) { throw 'Kein -ProfilePath angegeben.' }
if (-not (Test-Path -LiteralPath $ProfilePath -PathType Container)) {
    throw "Profil nicht gefunden: $ProfilePath"
}

$chromeDir = Join-Path $ProfilePath 'chrome'
$backupDir = Join-Path $ProfilePath $backupName
$marker = Join-Path $chromeDir $markerName

if (Test-Path -LiteralPath $marker) {
    # Nur die vom Theme installierten Dateien entfernen, eigene Dateien in chrome/ bleiben.
    foreach ($item in Get-ChildItem -LiteralPath $source -Force) {
        $target = Join-Path $chromeDir $item.Name
        if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    }
    Remove-Item -LiteralPath $marker -Force
    if (-not (Get-ChildItem -LiteralPath $chromeDir -Force)) { Remove-Item -LiteralPath $chromeDir -Force }

    if (Test-Path -LiteralPath $backupDir) {
        if (-not (Test-Path -LiteralPath $chromeDir)) {
            Move-Item -LiteralPath $backupDir -Destination $chromeDir
        } else {
            foreach ($item in Get-ChildItem -LiteralPath $backupDir -Force) {
                $target = Join-Path $chromeDir $item.Name
                if (Test-Path -LiteralPath $target) {
                    Write-Warning "Nicht zurueckgestellt (Name existiert schon): $($item.FullName)"
                } else {
                    Move-Item -LiteralPath $item.FullName -Destination $target
                }
            }
            if (-not (Get-ChildItem -LiteralPath $backupDir -Force)) { Remove-Item -LiteralPath $backupDir -Force }
        }
    }
}

$userJs = Join-Path $ProfilePath 'user.js'
if (Test-Path -LiteralPath $userJs) {
    $existing = [IO.File]::ReadAllText($userJs)
    $pattern = '(?ms)^[ \t]*' + [regex]::Escape($beginMark) + '.*?' + [regex]::Escape($endMark) + '[ \t]*(\r?\n|$)'
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
