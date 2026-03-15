#!/bin/bash
# macOS codesign for Neutralino binaries
# Usage: ./codesign-mac.sh "Developer ID Application: Your Name (TEAMID)"

set -e

SIGN_IDENTITY="${1:-}"
DIST_DIR="$(dirname "$0")/dist/neutralino"

if [ -z "$SIGN_IDENTITY" ]; then
  echo "Usage: $0 \"Developer ID Application: Your Name (TEAMID)\""
  echo ""
  echo "Available identities:"
  security find-identity -v -p codesigning
  exit 1
fi

BINARIES=(
  "neutralino-mac_arm64.app"
  "neutralino-mac_x64.app"
  "neutralino-mac_universal.app"
)

for bin in "${BINARIES[@]}"; do
  TARGET="$DIST_DIR/$bin"
  if [ -f "$TARGET" ]; then
    echo "Signing $bin ..."
    codesign --deep --force --verify --verbose \
      --sign "$SIGN_IDENTITY" \
      --options runtime \
      "$TARGET"
    echo "  OK: $(codesign -dv "$TARGET" 2>&1 | grep Authority | head -1)"
  else
    echo "Skip $bin (not found)"
  fi
done

echo ""
echo "Done. Verify with: codesign -dv dist/neutralino/neutralino-mac_universal.app"
