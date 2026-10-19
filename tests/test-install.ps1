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

# H: Zeilen vor/nach dem Block bleiben getrennt (Reinstall und Uninstall)
$h = New-Profile 'zeilen'
[IO.File]::WriteAllText((Join-Path $h 'user.js'), '// my note', (New-Object Text.UTF8Encoding($false)))
& $install -ProfilePath $h -SkipRunningCheck | Out-Null
Add-Content -LiteralPath (Join-Path $h 'user.js') -Value 'user_pref("keep.me", true);'
& $install -ProfilePath $h -SkipRunningCheck | Out-Null
$js = [IO.File]::ReadAllText((Join-Path $h 'user.js'))
Assert ($js -match '(?m)^// my note\r?$') 'H: Kommentarzeile bleibt eigene Zeile nach Reinstall'
Assert ($js -match '(?m)^user_pref\("keep.me", true\);\r?$') 'H: eigene Pref bleibt eigene Zeile nach Reinstall'
& $uninstall -ProfilePath $h -SkipRunningCheck | Out-Null
$js = [IO.File]::ReadAllText((Join-Path $h 'user.js'))
Assert (($js -match '(?m)^// my note\r?$') -and ($js -match '(?m)^user_pref\("keep.me", true\);\r?$') -and ($js -notmatch 'spark-look')) 'H: nach Uninstall nur noch eigene Zeilen'

# I: eigene Dateien in chrome/ ueberleben Uninstall
$i = New-Profile 'eigene datei'
& $install -ProfilePath $i -SkipRunningCheck | Out-Null
Set-Content -LiteralPath (Join-Path $i 'chrome\my.css') -Value '/* mine */' -Encoding ASCII
& $uninstall -ProfilePath $i -SkipRunningCheck | Out-Null
Assert (Test-Path -LiteralPath (Join-Path $i 'chrome\my.css')) 'I: eigene Datei in chrome/ bleibt nach Uninstall'
Assert (-not (Test-Path -LiteralPath (Join-Path $i 'chrome\userChrome.css'))) 'I: Theme-Datei entfernt'
Assert (-not (Test-Path -LiteralPath (Join-Path $i 'chrome\.spark-look'))) 'I: Marker entfernt'

# J: vorheriges chrome/ (Backup) und neu hinzugefuegte Datei werden beim Uninstall zusammengefuehrt
$j = New-Profile 'merge'
New-Item -ItemType Directory -Path (Join-Path $j 'chrome') | Out-Null
Set-Content -LiteralPath (Join-Path $j 'chrome\userChrome.css') -Value '/* mine */' -Encoding ASCII
& $install -ProfilePath $j -SkipRunningCheck | Out-Null
Set-Content -LiteralPath (Join-Path $j 'chrome\my.css') -Value '/* new */' -Encoding ASCII
& $uninstall -ProfilePath $j -SkipRunningCheck | Out-Null
Assert ((Get-Content -LiteralPath (Join-Path $j 'chrome\userChrome.css') -Raw).Trim() -eq '/* mine */') 'J: urspruengliches userChrome.css zurueck'
Assert (Test-Path -LiteralPath (Join-Path $j 'chrome\my.css')) 'J: nachtraeglich angelegte Datei bleibt'
Assert (-not (Test-Path -LiteralPath (Join-Path $j 'chrome.spark-look-backup'))) 'J: Backup-Ordner weg'

# K: -Auto findet das Standardprofil ueber profiles.ini (Install-Abschnitt hat Vorrang)
$k = New-Profile 'auto'
$kp = Join-Path $k 'Profiles\abc.default-release'
$ko = Join-Path $k 'Profiles\other.default'
New-Item -ItemType Directory -Path $kp, $ko -Force | Out-Null
$ini = "[Install4F96D1932A9F858E]`r`nDefault=Profiles/abc.default-release`r`nLocked=1`r`n`r`n[Profile1]`r`nName=default`r`nIsRelative=1`r`nPath=Profiles/other.default`r`nDefault=1`r`n`r`n[Profile0]`r`nName=default-release`r`nIsRelative=1`r`nPath=Profiles/abc.default-release`r`n"
$iniPath = Join-Path $k 'profiles.ini'
Set-Content -LiteralPath $iniPath -Value $ini -Encoding ASCII
& $install -Auto -ProfilesIni $iniPath -SkipRunningCheck | Out-Null
Assert (Test-Path -LiteralPath (Join-Path $kp 'chrome\userChrome.css')) 'K: -Auto installiert ins Install-Standardprofil'
Assert (-not (Test-Path -LiteralPath (Join-Path $ko 'chrome'))) 'K: anderes Profil bleibt unberuehrt'
& $uninstall -Auto -ProfilesIni $iniPath -SkipRunningCheck | Out-Null
Assert (-not (Test-Path -LiteralPath (Join-Path $kp 'chrome'))) 'K: -Auto Uninstall entfernt aus dem Standardprofil'

# L: -Auto ohne profiles.ini wirft mit Hinweis
$threw = $false; $msg = ''
try { & $install -Auto -ProfilesIni (Join-Path $k 'gibt-es-nicht.ini') -SkipRunningCheck | Out-Null } catch { $threw = $true; $msg = $_.Exception.Message }
Assert ($threw -and $msg -match 'profiles\.ini') 'L: fehlende profiles.ini wirft mit Hinweis'

foreach ($p in $a, $c, $e, $h, $i, $j, $k) { if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Recurse -Force } }

if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
