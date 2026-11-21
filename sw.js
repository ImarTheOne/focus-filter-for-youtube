/* Chrome MV3 background entry point.

   Chrome only accepts a single background file (a service worker), where
   Firefox takes a list of plain scripts. importScripts pulls in the same
   files, in the same order, so both browsers run identical code.

   Keep this list in sync with "background.scripts" in manifest.json. */
importScripts("common.js", "verses.js", "background.js");
