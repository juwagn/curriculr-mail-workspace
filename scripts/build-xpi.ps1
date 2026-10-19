<#
.SYNOPSIS
    Packt extension-workspace-switcher/ in dist/curriculr-mail-workspace.xpi.

.DESCRIPTION
    Ein XPI ist ein ZIP mit manifest.json auf oberster Ebene. Die Eintraege
    bekommen Vorwaertsschraegstriche, sonst lehnt Thunderbird das Paket ab.
    Thunderbird verlangt keine Signatur: Installation ueber
    Add-ons und Themes > Zahnrad > Add-on aus Datei installieren.
#>
[CmdletBinding()]
param(
    [string]$OutFile
)
$ErrorActionPreference = 'Stop'
# Erst hier: Windows PowerShell 5.1 kennt $PSScriptRoot in param()-Standardwerten nicht.
if (-not $OutFile) { $OutFile = Join-Path (Split-Path $PSScriptRoot -Parent) 'dist\curriculr-mail-workspace.xpi' }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$source = Join-Path (Split-Path $PSScriptRoot -Parent) 'extension-workspace-switcher'
if (-not (Test-Path -LiteralPath (Join-Path $source 'manifest.json'))) { throw "manifest.json fehlt in $source" }
$manifest = Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw | ConvertFrom-Json

$outDir = Split-Path $OutFile -Parent
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
if (Test-Path -LiteralPath $OutFile) { Remove-Item -LiteralPath $OutFile -Force }

$exclude = '(^|/)(\.DS_Store|Thumbs\.db|\.git.*)$'
$zip = [IO.Compression.ZipFile]::Open($OutFile, [IO.Compression.ZipArchiveMode]::Create)
try {
    $count = 0
    foreach ($file in Get-ChildItem -LiteralPath $source -Recurse -File -Force) {
        $rel = $file.FullName.Substring($source.Length + 1) -replace '\\', '/'
        if ($rel -match $exclude) { continue }
        [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $rel, [IO.Compression.CompressionLevel]::Optimal)
        $count++
    }
} finally {
    $zip.Dispose()
}
Write-Host "$($manifest.name) $($manifest.version): $count Dateien -> $OutFile"
