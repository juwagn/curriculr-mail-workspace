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
$pattern = '(?ms)^[ \t]*' + [regex]::Escape($beginMark) + '.*?' + [regex]::Escape($endMark) + '[ \t]*(\r?\n|$)'
$clean = [regex]::Replace($existing, $pattern, '')
if ($clean.Length -gt 0 -and -not $clean.EndsWith("`n")) { $clean += "`r`n" }
$block = $beginMark + "`r`n" + 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);' + "`r`n" + $endMark + "`r`n"
[IO.File]::WriteAllText($userJs, $clean + $block, (New-Object Text.UTF8Encoding($false)))

Write-Host "Installiert in $ProfilePath"
