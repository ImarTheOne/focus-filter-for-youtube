#!/bin/bash
# Builds loadable, zippable copies of the extension for both browsers.
#
#   ./build.sh          both
#   ./build.sh chrome   just Chrome
#   ./build.sh firefox  just Firefox
#
# Output:
#   build/chrome/   + build/focus-filter-for-youtube-<version>-chrome.zip
#   build/firefox/  + build/focus-filter-for-youtube-<version>-firefox.zip
#
# The two builds share every source file. Only the manifest differs, plus sw.js,
# which exists because Chrome insists the background be a single service worker
# while Firefox wants a list of plain scripts.

set -euo pipefail
cd "$(dirname "$0")"

TARGET="${1:-both}"
OUT="build"

case "$TARGET" in
  chrome|firefox|both) ;;
  *) echo "Unknown target \"$TARGET\". Use: chrome, firefox, or both." >&2; exit 1 ;;
esac

# Files both browsers ship. Anything added to the extension goes here.
SHARED=(
  common.js
  verses.js
  background.js
  content.js
  page-bridge.js
  content.css
  options.html
  options.css
  options.js
  popup.html
  popup.js
  LICENSE
)

version() {
  # Read "version" out of a manifest without pulling in a JSON dependency.
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -1
}

# Chrome and Firefox versions are tracked separately in their own manifests;
# a mismatch means one of them was bumped and the other forgotten.
FX_VERSION="$(version manifest.json)"
CR_VERSION="$(version manifest.chrome.json)"
if [ "$FX_VERSION" != "$CR_VERSION" ]; then
  echo "Warning: manifest.json is $FX_VERSION but manifest.chrome.json is $CR_VERSION." >&2
  echo "         Bump both unless you meant to ship them out of step." >&2
fi

stage() {
  local browser="$1" manifest="$2" version="$3"
  shift 3
  local dir="$OUT/$browser"

  rm -rf "$dir"
  mkdir -p "$dir/icons"

  cp "${SHARED[@]}" "$dir/"
  # Ship the icons the manifests reference and nothing else: icon.svg is the
  # source artwork and icon-512.png is the store listing image, neither of
  # which belongs in the package. The 16px icon is Chrome-only but costs under
  # a kilobyte, so it is not worth branching over.
  for icon in icons/icon-16.png icons/icon-32.png icons/icon-48.png \
              icons/icon-96.png icons/icon-128.png; do
    cp "$icon" "$dir/icons/"
  done
  cp "$manifest" "$dir/manifest.json"

  # Anything browser-specific, passed in by the caller.
  for extra in "$@"; do cp "$extra" "$dir/"; done

  local zip="focus-filter-for-youtube-$version-$browser.zip"
  rm -f "$OUT/$zip"
  # -X drops macOS resource forks, which otherwise show up as junk in review.
  (cd "$dir" && zip -qrX "../$zip" . -x '.*' -x '__MACOSX/*')

  echo "  $dir/"
  echo "  $OUT/$zip"
}

if [ "$TARGET" = "chrome" ] || [ "$TARGET" = "both" ]; then
  echo "Chrome $CR_VERSION:"
  stage chrome manifest.chrome.json "$CR_VERSION" sw.js
fi

if [ "$TARGET" = "firefox" ] || [ "$TARGET" = "both" ]; then
  echo "Firefox $FX_VERSION:"
  stage firefox manifest.json "$FX_VERSION"
fi
