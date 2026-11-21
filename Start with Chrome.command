#!/bin/bash
# Double-click this file to build the Chrome extension and open everything you
# need to load it.
#
# Chrome has no equivalent of Firefox's web-ext: since Chrome 137 the
# --load-extension command-line switch is ignored, so the extension has to be
# added once by hand through chrome://extensions. The good news is that unlike
# Firefox's temporary add-ons, it then stays loaded until you remove it.

cd "$(dirname "$0")" || exit 1

echo "Focus Filter for YouTube — Chrome"
echo "================================="
echo

./build.sh chrome || { echo; read -r -p "Build failed. Press return to close."; exit 1; }

DIR="$PWD/build/chrome"

BROWSER=""
for candidate in \
  "/Applications/Google Chrome.app" \
  "/Applications/Google Chrome Canary.app" \
  "/Applications/Chromium.app" \
  "/Applications/Brave Browser.app" \
  "/Applications/Microsoft Edge.app"
do
  [ -d "$candidate" ] && { BROWSER="$candidate"; break; }
done

echo
echo "Built: $DIR"
echo
echo "To load it, once:"
echo "  1. In Chrome, go to  chrome://extensions"
echo "  2. Turn on  Developer mode  (top right)"
echo "  3. Click  Load unpacked"
echo "  4. Pick the  build/chrome  folder now highlighted in Finder"
echo "     (or just drag that folder onto the chrome://extensions page)"
echo
echo "After editing any source file, run ./build.sh chrome and press the reload"
echo "arrow on the extension's card in chrome://extensions."
echo

if [ -n "$BROWSER" ]; then
  echo "Opening $(basename "$BROWSER" .app)…"
  open -a "$BROWSER" "https://www.youtube.com/"
else
  echo "No Chrome-family browser found in /Applications — load the folder by hand."
fi

open -R "$DIR"

echo
read -r -p "Press return to close."
