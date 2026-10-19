$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$install = Join-Path $root 'scripts\install-dev.ps1'
$sparkInstall = Join-Path $root 'spark-theme\install.ps1'
$script:fail = 0

function Assert($cond, $msg) {
    if ($cond) { Write-Host "PASS $msg" }
    else { Write-Host "FAIL $msg" -ForegroundColor Red; $script:fail++ }
}
function New-Profile($name) {
    $p = Join-Path $env:TEMP ("ws-test-" + [guid]::NewGuid().ToString('N').Substring(0, 8) + " $name")
    New-Item -ItemType Directory -Path $p | Out-Null
    return $p
}
function Count-Lines($text, $needle) {
    return ([regex]::Matches($text, [regex]::Escape($needle))).Count
}
function Test-SameFile($a, $b) {
    # Live verbunden: Hardlink auf die Repo-Datei oder Stub mit @import der Repo-Datei
    $ia = (Get-Item -LiteralPath $a)
    if ($ia.LinkType -eq 'HardLink') {
        return (Get-FileHash -LiteralPath $a).Hash -eq (Get-FileHash -LiteralPath $b).Hash
    }
    $text = Get-Content -LiteralPath $a -Raw
    $url = ([Uri]$b).AbsoluteUri
    return $text.Contains("@import url(`"$url`");")
}
$prefLine = 'toolkit.legacyUserProfileCustomizations.stylesheets'
$repoCss = Join-Path $root 'theme-css\userChrome.css'

# A: frisches Profil, Pfad mit Leerzeichen und Umlaut
$a = New-Profile 'ws test ü'
& $install -ProfilePath $a -SkipRunningCheck | Out-Null
$target = Join-Path $a 'chrome\userChrome.css'
Assert (Test-Path -LiteralPath $target) 'A: userChrome.css im Profil'
Assert (Test-Path -LiteralPath (Join-Path $a 'chrome\userContent.css')) 'A: userContent.css im Profil'
Assert (Test-SameFile $target $repoCss) 'A: userChrome.css live mit dem Repo verbunden'
Assert (Test-SameFile (Join-Path $a 'chrome\tokens.css') (Join-Path $root 'extension-workspace-switcher\shared\tokens.css')) 'A: tokens.css live mit shared/tokens.css verbunden'
Assert (Test-Path -LiteralPath (Join-Path $a 'chrome\.workspace-suite')) 'A: Marker gesetzt'
$js = Get-Content -LiteralPath (Join-Path $a 'user.js') -Raw
Assert ((Count-Lines $js $prefLine) -eq 1) 'A: genau eine Pref-Zeile'
$bytes = [IO.File]::ReadAllBytes((Join-Path $a 'user.js'))
Assert (-not ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)) 'A: user.js ohne BOM'

# B: zweimal installieren ist idempotent
& $install -ProfilePath $a -SkipRunningCheck | Out-Null
$js = Get-Content -LiteralPath (Join-Path $a 'user.js') -Raw
Assert ((Count-Lines $js $prefLine) -eq 1) 'B: weiterhin genau eine Pref-Zeile'
Assert (-not (Test-Path -LiteralPath (Join-Path $a 'chrome.workspace-suite-backup'))) 'B: kein Backup der eigenen Dateien'
Assert (Test-SameFile $target $repoCss) 'B: weiterhin live verbunden'

# C: fremdes userChrome.css wird gesichert und bei -Remove zurueckgestellt
$c = New-Profile 'fremd'
New-Item -ItemType Directory -Path (Join-Path $c 'chrome') | Out-Null
Set-Content -LiteralPath (Join-Path $c 'chrome\userChrome.css') -Value '/* mine */' -Encoding ASCII
Set-Content -LiteralPath (Join-Path $c 'user.js') -Value 'user_pref("a.b", 1);' -Encoding ASCII
& $install -ProfilePath $c -SkipRunningCheck | Out-Null
$bak = Join-Path $c 'chrome.workspace-suite-backup\userChrome.css'
Assert ((Test-Path -LiteralPath $bak) -and ((Get-Content -LiteralPath $bak -Raw).Trim() -eq '/* mine */')) 'C: fremdes userChrome.css gesichert'
& $install -ProfilePath $c -SkipRunningCheck -Remove | Out-Null
Assert ((Get-Content -LiteralPath (Join-Path $c 'chrome\userChrome.css') -Raw).Trim() -eq '/* mine */') 'C: nach -Remove zurueckgestellt'
Assert (-not (Test-Path -LiteralPath (Join-Path $c 'chrome\userContent.css'))) 'C: eigene userContent.css entfernt'
Assert (-not (Test-Path -LiteralPath (Join-Path $c 'chrome\tokens.css'))) 'C: eigene tokens.css entfernt'
Assert (-not (Test-Path -LiteralPath (Join-Path $c 'chrome.workspace-suite-backup'))) 'C: Backup-Ordner weg'
$js = Get-Content -LiteralPath (Join-Path $c 'user.js') -Raw
Assert (($js -match 'a\.b') -and ($js -notmatch 'workspace-suite')) 'C: user.js wie vorher'
Assert ((Get-Content -LiteralPath $repoCss -Raw) -match 'Curricu:lr') 'C: Repo-Datei nach -Remove unversehrt'

# D: installiertes Spark-Theme wird sauber abgeloest
$d = New-Profile 'spark'
New-Item -ItemType Directory -Path (Join-Path $d 'chrome') | Out-Null
Set-Content -LiteralPath (Join-Path $d 'chrome\userChrome.css') -Value '/* vor spark */' -Encoding ASCII
& $sparkInstall -ProfilePath $d -SkipRunningCheck | Out-Null
Assert (Test-Path -LiteralPath (Join-Path $d 'chrome\.spark-look')) 'D: Vorbedingung Spark installiert'
& $install -ProfilePath $d -SkipRunningCheck | Out-Null
Assert (-not (Test-Path -LiteralPath (Join-Path $d 'chrome\.spark-look'))) 'D: Spark-Marker entfernt'
Assert (Test-SameFile (Join-Path $d 'chrome\userChrome.css') $repoCss) 'D: Workspace-CSS aktiv'
$bak = Join-Path $d 'chrome.workspace-suite-backup\userChrome.css'
Assert ((Test-Path -LiteralPath $bak) -and ((Get-Content -LiteralPath $bak -Raw).Trim() -eq '/* vor spark */')) 'D: Datei von vor Spark gesichert'
$js = Get-Content -LiteralPath (Join-Path $d 'user.js') -Raw
Assert (($js -notmatch 'spark-look') -and ((Count-Lines $js $prefLine) -eq 1)) 'D: user.js nur mit Workspace-Block'

# E: -Remove im nie installierten Profil ist ein No-op
$e = New-Profile 'unberuehrt'
Set-Content -LiteralPath (Join-Path $e 'user.js') -Value 'user_pref("x.y", 2);' -Encoding ASCII
& $install -ProfilePath $e -SkipRunningCheck -Remove | Out-Null
Assert ((Get-Content -LiteralPath (Join-Path $e 'user.js') -Raw).Trim() -eq 'user_pref("x.y", 2);') 'E: user.js unveraendert'
Assert (-not (Test-Path -LiteralPath (Join-Path $e 'chrome'))) 'E: kein chrome/ angelegt'

# F: Profil aus profiles.ini (Install-Abschnitt gewinnt)
$f = New-Profile 'ini'
New-Item -ItemType Directory -Path (Join-Path $f 'Profiles\abc.default-release') | Out-Null
@'
[Profile0]
Name=default-release
IsRelative=1
Path=Profiles/abc.default-release

[InstallXYZ]
Default=Profiles/abc.default-release
'@ | Set-Content -LiteralPath (Join-Path $f 'profiles.ini') -Encoding ASCII
& $install -ProfilesIni (Join-Path $f 'profiles.ini') -SkipRunningCheck | Out-Null
Assert (Test-Path -LiteralPath (Join-Path $f 'Profiles\abc.default-release\chrome\userChrome.css')) 'F: Profil per profiles.ini gefunden'

foreach ($p in $a, $c, $d, $e, $f) { Remove-Item -LiteralPath $p -Recurse -Force }
if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
