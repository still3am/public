// Sharing a song hands the artwork to the system share sheet alongside the
// link, so the sheet opens on the cover and the song title instead of a bare
// URL card. Covers are served with `Access-Control-Allow-Origin: *`, so the
// image can be read here and attached as a file the OS can post.

async function coverFile(track) {
  if (!track?.cover_art_url) return null;
  try {
    const res = await fetch(track.cover_art_url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const ext = (blob.type.split("/")[1] || "jpeg").replace("jpeg", "jpg");
    return new File([blob], `cover.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

/**
 * Opens the share sheet for a song with its cover image and link. Returns
 * "shared" when the sheet handled it (the user dismissing it counts) and
 * "copied" when the link was put on the clipboard instead — the only case the
 * caller needs to report back to the user.
 */
export async function shareTrack(track) {
  const url = `${window.location.origin}/track/${track.id}`;
  const title = `${track.title} on PUBLIC.`;
  const file = await coverFile(track);
  const artist = track.artist || track.uploader_name;
  const withCover =
    file && navigator.canShare?.({ files: [file] })
      ? {
          files: [file],
          title,
          // The image carries no link of its own, so the URL travels in the text.
          text: `${track.title}${artist ? ` by ${artist}` : ""}\n${url}`,
        }
      : null;

  if (navigator.share) {
    if (withCover) {
      try {
        await navigator.share(withCover);
        return "shared";
      } catch (err) {
        if (err?.name === "AbortError") return "shared";
      }
    }
    try {
      await navigator.share({ title, url });
      return "shared";
    } catch (err) {
      if (err?.name === "AbortError") return "shared";
    }
  }

  await navigator.clipboard?.writeText(url);
  return "copied";
}