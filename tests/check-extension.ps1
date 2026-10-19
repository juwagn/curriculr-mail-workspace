$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$ext = Join-Path $root 'extension-workspace-switcher'
$script:fail = 0

function Assert($cond, $msg) {
    if ($cond) { Write-Host "PASS $msg" }
    else { Write-Host "FAIL $msg" -ForegroundColor Red; $script:fail++ }
}
function Exists($rel) { return Test-Path -LiteralPath (Join-Path $ext $rel) }

# --- Manifest ---
$m = Get-Content -LiteralPath (Join-Path $ext 'manifest.json') -Raw | ConvertFrom-Json
Assert ($m.manifest_version -eq 2) 'manifest_version 2 (Experiment-APIs)'
Assert ($m.browser_specific_settings.gecko.strict_min_version -eq '128.0') 'strict_min_version 128.0'
foreach ($p in 'accountsRead', 'compose', 'compose.save', 'compose.send', 'storage', 'menus', 'messagesRead', 'messagesMove', 'messagesTags', 'messagesModify', 'messagesDelete', 'downloads', 'alarms', 'clipboardWrite', 'notifications') { Assert ($m.permissions -contains $p) "Permission $p" }
Assert ($m.version -eq '0.2.0') 'Version 0.2.0'
Assert ($m.browser_specific_settings.gecko.id -eq 'mail-workspace@curriculr') 'Add-on-ID stabil (Curricu:lr)'
Assert ($m.commands.'cycle-workspace'.suggested_key.default -eq 'Ctrl+Shift+Y') 'Kuerzel Ctrl+Shift+Y'
Assert ($m.commands.'cycle-workspace'.suggested_key.mac -eq 'Command+Shift+Y') 'Kuerzel Command+Shift+Y (mac)'
foreach ($rel in @($m.background.page, $m.browser_action.default_icon, $m.compose_action.default_icon, $m.compose_action.default_popup, $m.message_display_action.default_icon, $m.message_display_action.default_popup, $m.options_ui.page, $m.experiment_apis.workspace.schema, $m.experiment_apis.workspace.parent.script)) {
    Assert (Exists $rel) "Manifest-Datei vorhanden: $rel"
}
foreach ($mode in 'school', 'private', 'all') { Assert (Exists "icons/$mode.svg") "Icon fuer $mode" }

# --- Schema passt zur Implementierung ---
$schema = Get-Content -LiteralPath (Join-Path $ext $m.experiment_apis.workspace.schema) -Raw | ConvertFrom-Json
$impl = Get-Content -LiteralPath (Join-Path $ext $m.experiment_apis.workspace.parent.script) -Raw
Assert ($schema[0].namespace -eq 'workspace') 'Schema-Namespace workspace'
$applyFn = $schema[0].functions | Where-Object name -eq 'apply'
Assert (@($applyFn.parameters.name) -contains 'accentProperties') 'apply() nimmt accentProperties'
Assert ($impl -match '--ws-custom-' -and $impl -match 'setProperty') 'Experiment setzt --ws-custom-* auf dem Root'
foreach ($fn in $schema[0].functions) {
    Assert ($impl -match ('async ' + [regex]::Escape($fn.name) + '\(')) "Implementierung hat $($fn.name)()"
}
Assert ($impl -match 'var workspace = class extends ExtensionCommon\.ExtensionAPI') 'Experiment-Klasse heisst wie der Namespace'
Assert ($impl.Contains('data-workspace') -and $impl.Contains('workspace-hidden') -and $impl.Contains('li[data-server-key]')) 'Experiment erfuellt den CSS-Vertrag'
Assert (@($applyFn.parameters.name) -contains 'options') 'apply() nimmt options (Blur, Fokus, Ordner)'
foreach ($fn in 'listCalendars', 'syncCalendarVisibility', 'getBusyTimes', 'openNewEventDialog', 'openCalendarWizard', 'getFolderURI', 'markCompose') {
    Assert (@($schema[0].functions.name) -contains $fn) "Schema hat $fn()"
}

# --- Vertrag Experiment <-> theme-css/userChrome.css ---
$chrome = Get-Content -LiteralPath (Join-Path $root 'theme-css\userChrome.css') -Raw
foreach ($token in 'data-ws-privacy', 'data-ws-focus', 'ws-pinned-folders-bar', 'ws-drop-target', 'data-ws-compose', '--ws-folder-color') {
    Assert ($impl.Contains($token) -and $chrome.Contains($token)) "Experiment und CSS teilen $token"
}
Assert ($impl.Contains('wsFolderColor') -and $chrome.Contains('data-ws-folder-color')) 'Experiment setzt data-ws-folder-color (dataset.wsFolderColor)'
Assert ($impl -match 'resetAll' -and $impl -match 'syncMutedServers\(new Set\(\)\)') 'Cleanup stellt gedaempfte Konten wieder her'

# --- Nur ein Sende-Hook und ein Bestaetigungsdialog ---
$bg = Get-Content -LiteralPath (Join-Path $ext 'background.js') -Raw
Assert (([regex]::Matches($bg, 'onBeforeSend\.addListener')).Count -eq 1) 'genau ein compose.onBeforeSend-Handler'
Assert (([regex]::Matches($bg, 'confirm/confirm\.html')).Count -eq 1) 'genau ein Bestaetigungsdialog'
Assert ($bg.Contains('evaluateSendGuard')) 'Sende-Waechter nutzt evaluateSendGuard aus shared/logic.mjs'
$logic = Get-Content -LiteralPath (Join-Path $ext 'shared\logic.mjs') -Raw
$logicCode = [regex]::Replace($logic, '(?s)/\*.*?\*/|(?m)//.*$', '')
Assert ($logicCode -notmatch '\bbrowser\.') 'shared/logic.mjs ohne browser.*-Aufrufe'

# --- Alle in HTML referenzierten Dateien existieren ---
foreach ($html in Get-ChildItem -LiteralPath $ext -Recurse -Filter '*.html') {
    $text = Get-Content -LiteralPath $html.FullName -Raw
    foreach ($match in [regex]::Matches($text, '(?:src|href)="([^"#:]+)"')) {
        $target = Join-Path $html.DirectoryName $match.Groups[1].Value
        Assert (Test-Path -LiteralPath $target) "$($html.Name) -> $($match.Groups[1].Value)"
    }
}

# --- Relative ES-Module-Importe existieren ---
foreach ($js in Get-ChildItem -LiteralPath $ext -Recurse -Include '*.js', '*.mjs') {
    $text = Get-Content -LiteralPath $js.FullName -Raw
    foreach ($match in [regex]::Matches($text, 'from "(\.{1,2}/[^"]+)"')) {
        $target = Join-Path $js.DirectoryName $match.Groups[1].Value
        Assert (Test-Path -LiteralPath $target) "$($js.Name) importiert $($match.Groups[1].Value)"
    }
}

if ($script:fail -gt 0) { Write-Host "$($script:fail) Pruefung(en) fehlgeschlagen" -ForegroundColor Red; exit 1 }
Write-Host 'Alle Pruefungen bestanden'
