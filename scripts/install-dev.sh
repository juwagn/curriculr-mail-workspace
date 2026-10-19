#!/usr/bin/env bash
# Verlinkt theme-css/userChrome.css, userContent.css und die gemeinsamen Tokens
# (extension-workspace-switcher/shared/tokens.css) per Symlink ins Thunderbird-Profil.
# Fuer macOS und Linux (Windows: scripts/install-dev.ps1).
#
# Profilsuche ueber profiles.ini in:
#   macOS:   ~/Library/Thunderbird
#   Linux:   ~/.thunderbird, ~/snap/thunderbird/common/.thunderbird,
#            ~/.var/app/org.mozilla.Thunderbird/.thunderbird
#
# Nutzung:
#   scripts/install-dev.sh                    # Standardprofil
#   scripts/install-dev.sh --profile <pfad>   # bestimmtes Profil
#   scripts/install-dev.sh --ini <profiles.ini>
#   scripts/install-dev.sh --remove           # rueckgaengig machen
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE="$REPO_ROOT/theme-css"
FILES=(userChrome.css userContent.css tokens.css)
# Quelle je Datei; tokens.css teilt sich das Theme mit den Add-on-Seiten.
src_of() {
  if [[ "$1" == tokens.css ]]; then echo "$REPO_ROOT/extension-workspace-switcher/shared/tokens.css"; else echo "$SOURCE/$1"; fi
}
MARKER_NAME=".workspace-suite"
BACKUP_NAME="chrome.workspace-suite-backup"
BEGIN_MARK="// >>> workspace-suite begin"
END_MARK="// <<< workspace-suite end"

PROFILE=""
INI=""
REMOVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --ini) INI="$2"; shift 2 ;;
    --remove) REMOVE=1; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "Unbekannte Option: $1" >&2; exit 2 ;;
  esac
done

find_ini() {
  local candidates=()
  case "$(uname -s)" in
    Darwin) candidates=("$HOME/Library/Thunderbird/profiles.ini") ;;
    *) candidates=(
         "$HOME/.thunderbird/profiles.ini"
         "$HOME/snap/thunderbird/common/.thunderbird/profiles.ini"
         "$HOME/.var/app/org.mozilla.Thunderbird/.thunderbird/profiles.ini"
       ) ;;
  esac
  for c in "${candidates[@]}"; do
    [[ -f "$c" ]] && { echo "$c"; return 0; }
  done
  return 1
}

# Liefert den Pfad des Standardprofils: [Install*] Default= gewinnt, sonst [Profile*] mit Default=1.
default_profile() {
  local ini="$1" base
  base="$(dirname "$ini")"
  awk -v base="$base" '
    function flush() {
      if (sec ~ /^Profile/ && path != "") {
        if (isdef == "1" && fallback == "") fallback = (isrel == "0" ? path : base "/" path)
        rel[path] = isrel
      }
      path = ""; isrel = "1"; isdef = ""
    }
    /^\[.*\]/ { flush(); sec = substr($0, 2, length($0) - 2); next }
    /^[^=;#]+=/ {
      k = substr($0, 1, index($0, "=") - 1); v = substr($0, index($0, "=") + 1)
      sub(/\r$/, "", v)
      if (sec ~ /^Install/ && k == "Default" && install == "") install = v
      if (sec ~ /^Profile/) {
        if (k == "Path") path = v
        if (k == "IsRelative") isrel = v
        if (k == "Default") isdef = v
      }
    }
    END {
      flush()
      if (install != "") print ((install in rel && rel[install] == "0") ? install : base "/" install)
      else if (fallback != "") print fallback
    }
  ' "$ini"
}

if [[ -z "$PROFILE" ]]; then
  [[ -z "$INI" ]] && INI="$(find_ini)" || true
  [[ -n "$INI" && -f "$INI" ]] || { echo "profiles.ini nicht gefunden. Bitte --profile angeben." >&2; exit 1; }
  PROFILE="$(default_profile "$INI")"
  [[ -n "$PROFILE" ]] || { echo "Kein Standardprofil in $INI. Bitte --profile angeben." >&2; exit 1; }
fi
[[ -d "$PROFILE" ]] || { echo "Profil nicht gefunden: $PROFILE" >&2; exit 1; }

CHROME="$PROFILE/chrome"
BACKUP="$PROFILE/$BACKUP_NAME"
MARKER="$CHROME/$MARKER_NAME"
USERJS="$PROFILE/user.js"

remove_userjs_block() {
  [[ -f "$USERJS" ]] || return 0
  local tmp
  tmp="$(mktemp)"
  awk -v b="$BEGIN_MARK" -v e="$END_MARK" '
    index($0, b) == 1 { skip = 1; next }
    skip && index($0, e) == 1 { skip = 0; next }
    !skip { print }
  ' "$USERJS" > "$tmp"
  if [[ -z "$(tr -d '[:space:]' < "$tmp")" ]]; then rm -f "$USERJS" "$tmp"; else mv "$tmp" "$USERJS"; fi
}

restore_backup() {
  [[ -d "$BACKUP" ]] || return 0
  mkdir -p "$CHROME"
  local item name
  for item in "$BACKUP"/* "$BACKUP"/.[!.]*; do
    [[ -e "$item" ]] || continue
    name="$(basename "$item")"
    if [[ -e "$CHROME/$name" ]]; then echo "Nicht zurueckgestellt (Name existiert schon): $item" >&2
    else mv "$item" "$CHROME/$name"; fi
  done
  rmdir "$BACKUP" 2>/dev/null || true
}

if pgrep -x thunderbird >/dev/null 2>&1 || pgrep -x thunderbird-bin >/dev/null 2>&1; then
  TB_RUNNING=1
else
  TB_RUNNING=0
fi

# ------------------------------------------------------------------ Entfernen
if [[ $REMOVE -eq 1 ]]; then
  if [[ -f "$MARKER" ]]; then
    for f in "${FILES[@]}"; do rm -f "$CHROME/$f"; done   # entfernt nur den Link
    rm -f "$MARKER"
    rmdir "$CHROME" 2>/dev/null || true
    restore_backup
  fi
  remove_userjs_block
  echo "Workspace-Theme entfernt aus $PROFILE"
  [[ $TB_RUNNING -eq 1 ]] && echo "Thunderbird neu starten, damit die Aenderung wirkt."
  exit 0
fi

# ------------------------------------------------------------------ Installieren
for f in "${FILES[@]}"; do
  [[ -f "$(src_of "$f")" ]] || { echo "Fehlt im Repo: $(src_of "$f")" >&2; exit 1; }
done

if [[ -f "$CHROME/.spark-look" ]]; then
  echo "Spark-Theme ist installiert (nur unter Windows mitgeliefert). Bitte chrome/ zuerst bereinigen." >&2
  exit 1
fi

mkdir -p "$CHROME"
OWNED=0
[[ -f "$MARKER" ]] && OWNED=1

for f in "${FILES[@]}"; do
  target="$CHROME/$f"
  if [[ -e "$target" || -L "$target" ]]; then
    if [[ $OWNED -eq 1 ]]; then
      rm -f "$target"
    else
      mkdir -p "$BACKUP"
      [[ -e "$BACKUP/$f" ]] && { echo "Backup existiert schon: $BACKUP/$f" >&2; exit 1; }
      mv "$target" "$BACKUP/$f"
      echo "Gesichert: $f -> $BACKUP_NAME/"
    fi
  fi
  ln -s "$(src_of "$f")" "$target"
  echo "Symlink: chrome/$f -> $(src_of "$f")"
done
echo "managed by scripts/install-dev.sh" > "$MARKER"

remove_userjs_block
if [[ -s "$USERJS" && -n "$(tail -c1 "$USERJS")" ]]; then echo >> "$USERJS"; fi
{
  echo "$BEGIN_MARK"
  echo 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);'
  echo "$END_MARK"
} >> "$USERJS"

echo "Installiert in $PROFILE"
[[ $TB_RUNNING -eq 1 ]] && echo "Thunderbird laeuft: bitte neu starten, damit das Theme geladen wird."
exit 0
