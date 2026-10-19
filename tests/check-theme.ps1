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

# --- userChrome.css ---
$cssPath = Join-Path $root 'spark-theme\chrome\userChrome.css'
Assert (Test-Path -LiteralPath $cssPath) 'userChrome.css existiert'
if (Test-Path -LiteralPath $cssPath) {
    $css = Get-Content -LiteralPath $cssPath -Raw
    $open = ([regex]::Matches($css, '\{')).Count
    $close = ([regex]::Matches($css, '\}')).Count
    Assert ($open -eq $close -and $open -gt 0) "geschweifte Klammern ausgeglichen ($open/$close)"
    Assert ($css -match '@media not \(prefers-contrast\)') 'Overrides stehen in @media not (prefers-contrast)'
    foreach ($sel in '#folderTree li > .container', '.unified-toolbar-button', 'global-search-bar', '.card-layout[data-properties~="unread"]') {
        Assert ($css.Contains($sel)) "Struktur-Regel fuer $sel vorhanden"
    }
    Assert ($css -match '--thread-pane-unread-fill\s*:') 'Ungelesen-Punkt folgt dem Akzent'
    foreach ($sel in '#folderPane', '#spacesToolbar', '--spark-navy:', '--sidebar-background:', '--spaces-bg-color:', '--treeitem-background-selected:', '--folderpane-unread-count-background:', 'tr.card-layout > td > .card-container') {
        Assert ($css.Contains($sel)) "Spark-Seitenleiste/flache Liste: $sel vorhanden"
    }
    Assert ($css -match '(?s)tr\.card-layout > td > \.card-container\s*\{[^}]*border-bottom') 'Listenzeilen haben eine Trennlinie'
    Assert ($css -match '(?s)#spacesToolbar\s*\{[^}]*?\n\s*color:') 'Icon-Leiste hat helle Icon-Farbe'
    Assert ($css -match '(?s)#folderTree li > \.container > \.icon\s*\{[^}]*--icon-color:') 'Ordner-Icons einheitlich hell'
    Assert ($css -match '(?s)#folderTree li\.selected > \.container\s*\{[^}]*outline:\s*none') 'gewaehlte Ordnerzeile ohne Rahmen'
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

# --- userContent.css ---
$ccPath = Join-Path $root 'spark-theme\chrome\userContent.css'
Assert (Test-Path -LiteralPath $ccPath) 'userContent.css existiert'
if (Test-Path -LiteralPath $ccPath) {
    $cc = Get-Content -LiteralPath $ccPath -Raw
    $o = ([regex]::Matches($cc, '\{')).Count
    $c2 = ([regex]::Matches($cc, '\}')).Count
    Assert ($o -eq $c2 -and $o -gt 0) "userContent.css: Klammern ausgeglichen ($o/$c2)"
    $ccCode = [regex]::Replace($cc, '(?s)/\*.*?\*/', '')
    Assert ($ccCode -notmatch '!important') 'userContent.css: kein !important auf Mail-Inhalten'
}
Assert (Test-Path -LiteralPath (Join-Path $root 'spark-theme\README.md')) 'README.md existiert'

# --- Doppelklick-Installer ---
foreach ($pair in @(@('Installieren.cmd', 'install.ps1'), @('Deinstallieren.cmd', 'uninstall.ps1'))) {
    $cmdPath = Join-Path $root ('spark-theme\' + $pair[0])
    Assert (Test-Path -LiteralPath $cmdPath) "$($pair[0]) existiert"
    if (Test-Path -LiteralPath $cmdPath) {
        $cmd = Get-Content -LiteralPath $cmdPath -Raw
        Assert ($cmd -match [regex]::Escape($pair[1]) -and $cmd -match '-Auto') "$($pair[0]) ruft $($pair[1]) mit -Auto auf"
        Assert ($cmd -match '-ExecutionPolicy Bypass') "$($pair[0]) umgeht die Ausfuehrungsrichtlinie nur fuer diesen Aufruf"
        Assert ($cmd -match '(?im)^\s*pause') "$($pair[0]) wartet am Ende auf eine Taste"
    }
}

if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
