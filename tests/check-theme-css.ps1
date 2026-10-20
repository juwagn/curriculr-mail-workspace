$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$script:fail = 0

function Assert($cond, $msg) {
    if ($cond) { Write-Host "PASS $msg" }
    else { Write-Host "FAIL $msg" -ForegroundColor Red; $script:fail++ }
}
function Test-Braces($text) {
    $code = [regex]::Replace($text, '(?s)/\*.*?\*/', '')
    $open = ([regex]::Matches($code, '\{')).Count
    $close = ([regex]::Matches($code, '\}')).Count
    return ($open -eq $close -and $open -gt 0)
}

# --- userChrome.css ---
$cssPath = Join-Path $root 'theme-css\userChrome.css'
Assert (Test-Path -LiteralPath $cssPath) 'userChrome.css existiert'
if (Test-Path -LiteralPath $cssPath) {
    $css = Get-Content -LiteralPath $cssPath -Raw
    # Farben, Akzent und Radien kommen aus den gemeinsamen Tokens (per @import).
    $tokensPath = Join-Path $root 'extension-workspace-switcher\shared\tokens.css'
    Assert (Test-Path -LiteralPath $tokensPath) 'shared/tokens.css existiert'
    $ownCode = [regex]::Replace($css, '(?s)/\*.*?\*/', '')
    Assert ($ownCode -match '^\s*@import url\("tokens\.css"\);') 'userChrome.css beginnt mit @import url("tokens.css")'
    $forward = Join-Path $root 'theme-css\tokens.css'
    Assert ((Test-Path -LiteralPath $forward) -and ((Get-Content -LiteralPath $forward -Raw) -match '@import url\("\.\./extension-workspace-switcher/shared/tokens\.css"\)')) 'theme-css/tokens.css leitet auf shared/tokens.css weiter'
    $css = (Get-Content -LiteralPath $tokensPath -Raw) + "`n" + $css
    $code = [regex]::Replace($css, '(?s)/\*.*?\*/', '')
    Assert (Test-Braces $css) 'userChrome.css: Klammern ausgeglichen'
    Assert ($code -match '@media not \(prefers-contrast\)') 'Overrides respektieren Hochkontrast'
    Assert ($code -match '@media \(prefers-color-scheme: dark\)') 'Dark-Mode per prefers-color-scheme'

    # Token-System
    foreach ($t in '--ws-accent', '--ws-accent-soft', '--ws-bg', '--ws-surface', '--ws-border', '--ws-text', '--ws-text-dim', '--ws-radius', '--ws-space-sm', '--ws-space-md') {
        Assert ($code -match [regex]::Escape($t) + '\s*:') "Token $t definiert"
    }
    $defined = [regex]::Matches($code, '(--ws-[a-z0-9-]+)\s*:') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $used = [regex]::Matches($code, 'var\((--ws-[a-z0-9-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
    $undefined = @($used | Where-Object { $defined -notcontains $_ })
    Assert ($undefined.Count -eq 0) "alle benutzten --ws-* sind definiert ($($undefined -join ', '))"

    # Workspace-Akzente
    Assert ($code -match '(?si):root\[data-workspace="school"\]\s*\{[^}]*--ws-accent:\s*var\(--ws-accent-school\)') 'school setzt Schul-Akzent'
    Assert ($code -match '(?si):root\[data-workspace="private"\]\s*\{[^}]*--ws-accent:\s*var\(--ws-accent-private\)') 'private setzt Privat-Akzent'
    Assert ($code -match '(?i)--ws-accent-school:\s*var\(--ws-custom-school,\s*var\(--brand-marine-700\)\)') -and ($code -match '(?i)--brand-marine-700:\s*#00467d') 'Schul-Akzent: eigene Farbe, sonst Curricu:lr-Marine (hell)'
    Assert ($code -match '(?i)--ws-accent-private:\s*var\(--ws-custom-private,\s*#2b7550\)') 'Privat-Akzent: eigene Farbe, sonst #2b7550 (hell)'
    Assert ($code -match '(?i)--ws-accent-all:\s*var\(--ws-custom-all,\s*#8a5a0b\)') 'Alle-Akzent: eigene Farbe, sonst #8a5a0b (hell)'
    foreach ($m in 'school', 'private', 'all') {
        Assert ($code -match "(?i)--ws-accent-$($m):\s*var\(--ws-custom-$m-dark,") "Dark-Akzent $m nutzt --ws-custom-$m-dark"
    }
    Assert ($code -match '(?i)--selected-item-color:\s*var\(--ws-accent\)') 'Thunderbird-Auswahlfarbe folgt dem Workspace'

    # Switcher-Vertrag mit der Extension
    Assert ($code -match '(?s)li\[data-server-key\]\.workspace-hidden[^{]*\{[^}]*display:\s*none\s*!important') 'Konten mit .workspace-hidden werden ausgeblendet'

    # Karten-Ansicht
    Assert ($code.Contains('#threadTree[rows="thread-card"]')) 'Regeln fuer die Karten-Ansicht vorhanden'
    Assert ($code.Contains('tr[is="thread-card"]')) 'Kartenzeilen ueber tr[is="thread-card"] angesprochen'
    Assert ($code -match '--listbox-border-radius:\s*var\(--ws-radius\)') 'Karten-Radius kommt aus dem Token'
    Assert ($code -match '(?i)--ws-radius:\s*8px') 'Basis-Radius 8px'
    Assert ($code -match '--card-container-padding-block:\s*var\(--ws-space-xs\)') 'vertikaler Kartenabstand aus Token'
    Assert ($code -notmatch '(?s)\.card-container\s*\{[^}]*\bpadding(-block|-inline)?:') 'kein Padding auf .card-container (Thunderbird rechnet die Zeilenhoehe selbst, Absenderzeile verschwand sonst)'
    Assert (($code -match '(?s)\[data-properties~="unread"\]\s*\{[^}]*--read-status-fill:\s*var\(--ws-accent\)') -and ($code -notmatch '\.card-container::before')) 'ungelesen: Punkt im Akzent, kein Balken'
    Assert ($code -match '(?s)\.sender\s*\{[^}]*font-weight') 'Absender typografisch hervorgehoben'
    Assert ($code -match 'linear-gradient\(var\(--ws-divider\)') 'Karten haben feine Trennlinie'
    Assert ($code -match '(?s)tr\[is="thread-card"\]\.selected \.card-container\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--ws-accent-line\)') 'Auswahl hat feinen Akzent-Ring'
    Assert ($code -match '(?s)\.tree-button-more,[^{]*\.tree-button-flag\s*\{[^}]*opacity:\s*0') 'Menue-Knopf und leerer Stern nur bei Hover'
    Assert ($code -match '(?s)#spacesToolbar\s*\{[^}]*--spaces-bg-color:\s*var\(--ws-accent\)') 'Spaces Toolbar in Akzentfarbe'

    # Folder Pane und Spaces Toolbar
    Assert ($code.Contains('#folderTree li > .container')) 'Ordnerzeilen gestylt'
    Assert ($code -match '--list-item-min-height\s*:') 'Zeilenhoehe der Ordnerliste gesetzt'
    Assert ($code.Contains('#spacesToolbar')) 'Spaces Toolbar gestylt'
    Assert ($code -match '--spaces-bg-color\s*:') 'Spaces-Hintergrund gesetzt'

    # v0.2.0: Badge, Verfassen-Fenster, Tag-Pills, Schnell-Tabs, Ordnerfarben, Sichtschutz, Fokus
    foreach ($label in 'SCHULE', 'PRIVAT', 'ALLE') { Assert ($code.Contains("content: `"$label`"")) "Toolbar-/Compose-Badge $label" }
    Assert ($code.Contains('#unifiedToolbarContent::before')) 'Workspace-Badge in der Toolbar'
    Assert ($code -match ':root\[data-ws-compose="school"\]' -and $code -match ':root\[data-ws-compose="private"\]') 'Verfassen-Fenster nach Absender-Workspace gefaerbt'
    Assert ($code -match '(?s)thread-card-tags[^{]*\{[^}]*border-radius:\s*var\(--ws-radius-pill\)') 'Schlagwoerter als Pill'
    Assert ($code -match '(?s)\[data-properties~="tagged"\][^{]*\{[^}]*color:\s*var\(--ws-text\)') 'getaggte Zeilen bleiben lesbar'
    Assert ($code.Contains('#ws-pinned-folders-bar')) 'Schnell-Tab-Leiste gestylt'
    Assert ($code.Contains('.ws-drop-target')) 'Drag-Over-Highlight der Schnell-Tabs'
    Assert ($code -match '(?s)li\[data-ws-folder-color\][^{]*\{[^}]*--icon-color:\s*var\(--ws-folder-color\)') 'farbige Ordner-Icons'
    Assert ($code -match '(?s):root\[data-ws-privacy="blur"\][^{]*\{[^}]*filter:\s*blur\(6px\)') 'Sichtschutz: blur(6px)'
    Assert ($code -match '(?s):root\[data-ws-privacy="blur"\][^{]*:hover[^{]*\{[^}]*filter:\s*none') 'Sichtschutz hebt sich bei :hover auf'
    Assert ($code -match '(?s)data-ws-privacy="blur"\][^{]*#messagePane') 'Sichtschutz deckt die Nachrichtenansicht ab'
    Assert ($code -match '(?s)data-ws-privacy="blur"\][^{]*#today-pane-panel') 'Sichtschutz deckt die Today Pane ab'
    Assert ($code -match '(?s):root\[data-ws-focus="true"\][^{]*\.folder-count-badge\s*\{[^}]*display:\s*none') 'Fokus-Modus blendet Zaehler aus'
    $mediaStart = $code.IndexOf('@media not (prefers-contrast)')
    Assert ($mediaStart -ge 0 -and $code.IndexOf('#ws-pinned-folders-bar') -gt $mediaStart -and $code.IndexOf('data-ws-privacy') -gt $mediaStart) 'neue Regeln stehen in @media not (prefers-contrast)'

    # Bewegung nur ohne reduced motion
    Assert ($code -match '@media \(prefers-reduced-motion: no-preference\)') 'Transitions nur ohne reduced motion'
    Assert ($css -notmatch '(?i)TODO|TBD') 'keine Platzhalter'
}

# --- userContent.css ---
$ccPath = Join-Path $root 'theme-css\userContent.css'
Assert (Test-Path -LiteralPath $ccPath) 'userContent.css existiert'
if (Test-Path -LiteralPath $ccPath) {
    $cc = Get-Content -LiteralPath $ccPath -Raw
    Assert (Test-Braces $cc) 'userContent.css: Klammern ausgeglichen'
    $ccCode = [regex]::Replace($cc, '(?s)/\*.*?\*/', '')
    Assert ($ccCode -notmatch '!important') 'userContent.css: kein !important auf Mail-Inhalten'
    Assert ($ccCode -match 'blockquote\[type="cite"\]') 'Zitate gestylt'
}

if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
