[CmdletBinding()]
param(
    [switch]$Dark,
    [string]$Path = (Join-Path $env:TEMP 'tb-spark-test')
)
$ErrorActionPreference = 'Stop'

# Nur ASCII in dieser Datei: Windows PowerShell 5.1 liest BOM-lose Dateien als ANSI.
if (-not $Path.StartsWith($env:TEMP, [StringComparison]::OrdinalIgnoreCase)) { throw "Nur Pfade unter %TEMP% erlaubt: $Path" }
if (Test-Path -LiteralPath $Path) { Remove-Item -LiteralPath $Path -Recurse -Force }
$mailDir = Join-Path $Path 'Mail\Local Folders'
New-Item -ItemType Directory -Path $mailDir -Force | Out-Null

$subjects = @(
    @('Anna Berger', 'Projektplan Q4 - bitte pruefen', '0000'),
    @('Max Keller', 'Re: Rechnung 2026-1043', '0001'),
    @('GitHub', '[repo] Pull request #42 merged', '0000'),
    @('Lena Fischer', 'Einladung: Teamfruehstueck am Freitag', '0000'),
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
[IO.File]::WriteAllText((Join-Path $mailDir 'Trash'), $sb.ToString(), (New-Object Text.UTF8Encoding($false)))

$dirEsc = ($mailDir -replace '\\', '\\')
$mailRoot = ((Join-Path $Path 'Mail') -replace '\\', '\\')
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
    "user_pref(`"mail.server.server1.directory`", `"$dirEsc`");",
    'user_pref("mail.server.server1.directory-rel", "[ProfD]Mail/Local Folders");',
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
