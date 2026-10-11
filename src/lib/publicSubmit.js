// Who may be offered to the public catalogue, and what is still standing in
// the way. Shared by the per-song action and the bulk bar so both agree.

// Songs that never reached the public catalogue: still private to the library.
// Ones already sent for review, or pulled by an admin, are left alone.
export function awaitingFirstSubmit(track) {
  if (!track || track.is_published) return false;
  return track.approval_status !== "pending" && track.approval_status !== "rejected";
}

// The requirements the upload queue applies, returned as the words a person
// needs to read: what to add before the song can go public.
export function publicSubmitBlockers(track) {
  const missing = [];
  if (!track?.cover_art_url) missing.push("cover art");
  if (!track?.artist?.trim()) missing.push("artist");
  if (!track?.genre) missing.push("genre");
  return missing;
}

export function isReadyForPublic(track) {
  return publicSubmitBlockers(track).length === 0;
}