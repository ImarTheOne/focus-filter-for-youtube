/* Runs in YouTube's own page context ("world": "MAIN"), because the player's
   data — description, tags, the channel's handle, YouTube's category, length,
   live/unlisted — is only reachable from there. The content script cannot see page variables.

   It answers exactly one question, "what are the details of video X?", and
   only with data for that exact video ID. That ID check is the point: during
   in-app navigation the old title stays on screen for a moment, and judging
   the new video by the previous one's title was a real source of wrong
   verdicts. It reads; it never changes anything on the page. */

(() => {
  function playerResponseFor(id) {
    for (const player of document.querySelectorAll(".html5-video-player")) {
      let response = null;
      try {
        response = player.getPlayerResponse?.();
      } catch {
        /* player still initialising */
      }
      if (response?.videoDetails?.videoId === id) return response;
    }
    const initial = window.ytInitialPlayerResponse;
    return initial?.videoDetails?.videoId === id ? initial : null;
  }

  document.addEventListener("yff:ask", (event) => {
    const id = typeof event.detail === "string" ? event.detail : "";
    if (!id) return;

    const response = playerResponseFor(id);
    const details = response?.videoDetails;
    const micro = response?.microformat?.playerMicroformatRenderer;

    // Strings only cross between the page and the extension cleanly in both
    // browsers, so the answer travels as JSON.
    const answer = details
      ? {
        id,
        title: String(details.title || ""),
        channel: String(details.author || ""),
        channelId: String(details.channelId || ""),
        // "@name", from a profile link like http://www.youtube.com/@name
        handle: String(micro?.ownerProfileUrl || "").match(/@[^/?#]+/)?.[0] || "",
        // The title as YouTube shows it to you, which may be a translation.
        shownTitle: String(micro?.title?.simpleText || ""),
        description: String(details.shortDescription || "").slice(0, 1500),
        tags: Array.isArray(details.keywords) ? details.keywords.slice(0, 30).map(String) : [],
        lengthSeconds: Number(details.lengthSeconds) || 0,
        isLive: Boolean(details.isLive || details.isUpcoming),
        ytCategory: String(micro?.category || ""),
        unlisted: Boolean(micro?.isUnlisted)
      }
      : { id, missing: true };

    document.dispatchEvent(new CustomEvent("yff:answer", { detail: JSON.stringify(answer) }));
  });
})();
