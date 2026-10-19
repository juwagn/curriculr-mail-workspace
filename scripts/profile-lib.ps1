# Profil-Suche fuer install-dev.ps1 (per Dot-Sourcing geladen). Gleiche Logik wie spark-theme/profile-lib.ps1.

function Get-DefaultProfile([string]$IniPath) {
    if (-not (Test-Path -LiteralPath $IniPath)) { throw "profiles.ini nicht gefunden: $IniPath" }
    $base = Split-Path $IniPath -Parent
    $secs = @{}
    $cur = $null
    foreach ($line in (Get-Content -LiteralPath $IniPath)) {
        if ($line -match '^\[(.+)\]\s*$') { $cur = $Matches[1]; $secs[$cur] = @{}; continue }
        if ($cur -and $line -match '^([^=;#]+)=(.*)$') { $secs[$cur][$Matches[1].Trim()] = $Matches[2].Trim() }
    }

    $rel = $null
    $isRel = '1'
    foreach ($name in $secs.Keys) {
        if ($name -like 'Install*' -and $secs[$name].ContainsKey('Default')) { $rel = $secs[$name]['Default']; break }
    }
    if ($rel) {
        foreach ($name in $secs.Keys) {
            if ($name -like 'Profile*' -and $secs[$name]['Path'] -eq $rel -and $secs[$name]['IsRelative']) { $isRel = $secs[$name]['IsRelative'] }
        }
    } else {
        foreach ($name in $secs.Keys) {
            if ($name -like 'Profile*' -and $secs[$name]['Default'] -eq '1') {
                $rel = $secs[$name]['Path']
                if ($secs[$name]['IsRelative']) { $isRel = $secs[$name]['IsRelative'] }
                break
            }
        }
    }
    if (-not $rel) { throw 'Kein Standardprofil in profiles.ini gefunden. Bitte -ProfilePath angeben.' }

    $path = $rel -replace '/', '\'
    if ($isRel -ne '0') { $path = Join-Path $base $path }
    return $path
}
