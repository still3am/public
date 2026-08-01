// Sharing a track should surface the cover art (and artist) in the iOS share
// sheet — not just a bare link. The iOS sheet builds its rich preview from a
// shared File (or OG tags on the URL). We attach the cover image as a File
// alongside the link/text; iOS renders the first file as the preview
// thumbnail and shows our title. If the cover can't be fetched (CORS / offline)
// we fall back to a plain link share so sharing always works.
export async function shareTrack(track) {
  if (!track) return "noop";
  const url = `${window.location.origin}/track/${track.id}`;
  const artist = track.artist || track.uploader_name || "Unknown";
  const title = `${track.title} — ${artist}`;
  const text = `Listen to "${track.title}" by ${artist} on PUBLIC.`;

  const copy = () => navigator.clipboard?.writeText(url);

  if (!navigator.share) {
    copy();
    return "copied";
  }

  const data = { title, text, url };

  if (track.cover_art_url && typeof navigator.canShare === "function") {
    try {
      const res = await fetch(track.cover_art_url, { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        const type =
          blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
        const file = new File([blob], "cover.jpg", { type });
        if (navigator.canShare({ files: [file] })) data.files = [file];
      }
    } catch {
      /* cover fetch failed — share link only */
    }
  }

  try {
    await navigator.share(data);
    return "shared";
  } catch {
    return "cancelled";
  }
}