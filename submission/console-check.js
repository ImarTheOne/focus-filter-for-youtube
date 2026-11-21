/* Paste into the Firefox console (Cmd+Opt+K) on any YouTube watch page.
   Runs the extension's exact selectors and reports what they find. */
(() => {
  const t = (s) => document.querySelector(s)?.textContent?.trim() || "";
  const title =
    t("h1.ytd-watch-metadata yt-formatted-string") ||
    t("#title h1") ||
    t("ytd-reel-video-renderer[is-active] h2") ||
    document.title.replace(/\s*-\s*YouTube\s*$/, "").trim();
  const channel =
    t("ytd-video-owner-renderer #channel-name a") ||
    t("#owner #channel-name a") ||
    t("#upload-info #channel-name a") || "";

  console.log("%cFocus Filter selector check", "font-weight:bold;font-size:14px");
  console.log("title    :", title || "*** EMPTY — this would break it ***");
  console.log("channel  :", channel || "(empty — not fatal, title alone is enough)");
  console.log("player   :", document.querySelector("#movie_player, .html5-video-player") ? "found" : "*** MISSING — overlay would fail ***");
  console.log("video tag:", document.querySelector("video") ? "found" : "*** MISSING — cannot pause ***");
  console.log(title && document.querySelector("video") ? "%cVERDICT: working" : "%cVERDICT: needs a fix",
              title && document.querySelector("video") ? "color:green;font-weight:bold" : "color:red;font-weight:bold");
})();
