#!/usr/bin/env bash
# Packt extension-workspace-switcher/ in dist/curriculr-mail-workspace.xpi (macOS/Linux).
# Windows: scripts/build-xpi.ps1
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO_ROOT/extension-workspace-switcher"
OUT="${1:-$REPO_ROOT/dist/curriculr-mail-workspace.xpi}"

command -v zip >/dev/null || { echo "zip nicht gefunden (z. B. 'sudo apt install zip')." >&2; exit 1; }
[[ -f "$SOURCE/manifest.json" ]] || { echo "manifest.json fehlt in $SOURCE" >&2; exit 1; }

mkdir -p "$(dirname "$OUT")"
OUT="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
rm -f "$OUT"

# manifest.json muss auf oberster Ebene liegen, darum aus dem Quellordner heraus packen.
(cd "$SOURCE" && zip -q -r -X "$OUT" . -x '*.DS_Store' -x 'Thumbs.db' -x '.git*')
echo "$(unzip -l "$OUT" | tail -1 | awk '{print $2}') Dateien -> $OUT"
