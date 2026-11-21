#!/bin/bash
# Double-click this file to launch Firefox with the extension already loaded.
# No file picker, no about:debugging, nothing to select.

cd "$(dirname "$0")" || exit 1

echo "Focus Filter for YouTube"
echo "===================="
echo

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js is required but was not found."
  echo "Install it from https://nodejs.org and run this again."
  echo
  read -r -p "Press return to close."
  exit 1
fi

# A dedicated profile that persists between runs, so the API key, your settings
# and your YouTube login survive closing Firefox. Your normal profile is never
# touched — this is a separate one used only for testing the extension.
PROFILE="$HOME/.yff-test-profile"

FIRST_RUN=""
[ -d "$PROFILE" ] || FIRST_RUN="yes"

echo "Launching Firefox with the extension loaded."
echo "Test profile: $PROFILE"
echo
if [ -n "$FIRST_RUN" ]; then
  echo "First run, so you will need to do two things once:"
  echo "  1. Sign in to YouTube."
  echo "  2. Paste your Google API key on the settings page that opens."
  echo "Both are remembered from now on."
else
  echo "Your key, settings and YouTube login are already remembered."
fi
echo
echo "Edit any source file and the extension reloads by itself."
echo "Keep this Terminal window open. Closing it stops the extension."
echo

npx --yes web-ext@latest run \
  --firefox-profile="$PROFILE" \
  --profile-create-if-missing \
  --keep-profile-changes \
  --no-config-discovery \
  --start-url "https://www.youtube.com/"

echo
echo "Stopped."
read -r -p "Press return to close."
