#!/usr/bin/env bash
set -euo pipefail

EXT_DIR="/workspace/ai-alchemist-extension"
MANIFEST="$EXT_DIR/manifest.json"

if [[ ! -f "$MANIFEST" ]]; then
  echo "[bump-version] manifest not found: $MANIFEST" >&2
  exit 1
fi

# Read current version from manifest.json
CUR=$(grep -oP '"version"\s*:\s*"\K[0-9]+\.[0-9]+\.[0-9]+' "$MANIFEST" | head -1)
if [[ -z "${CUR:-}" ]]; then
  echo "[bump-version] failed to read current version" >&2
  exit 1
fi

IFS='.' read -r MAJ MIN PAT <<< "$CUR"
NEW="$MAJ.$MIN.$((PAT+1))"

echo "[bump-version] $CUR -> $NEW"

# Update manifest.json (version and description badge)
sed -i -E "s/(\"version\"\s*:\s*\")$CUR(\")/\1$NEW\2/" "$MANIFEST"
sed -i -E "s/v$CUR/v$NEW/g" "$MANIFEST"

# Files to update textual version references
FILES=(
  "$EXT_DIR/README.md"
  "$EXT_DIR/welcome.html"
  "$EXT_DIR/popup.html"
  "$EXT_DIR/popup.js"
  "$EXT_DIR/content.js"
  "$EXT_DIR/background.js"
  "$EXT_DIR/modules/config-manager.js"
)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  sed -i -E "s/v$CUR/v$NEW/g" "$f"
  sed -i -E "s/'$CUR'/'$NEW'/g" "$f"
  sed -i -E "s/\"$CUR\"/\"$NEW\"/g" "$f"
  # Update @version tag lines
  sed -i -E "s/@version +$CUR/@version $NEW/g" "$f"
done

echo "[bump-version] done"

