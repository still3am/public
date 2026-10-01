import { base44 } from "@/api/base44Client";
import { makeCache } from "@/lib/cachedQuery";

// The library surfaces read the same three collections over and over: the saved
// item records (Library page, LibraryContext, playlist pickers), the user's
// uploads, and their playlists. Sharing one cached copy for a short window keeps
// a single visit from costing a dozen collection reads.
const TTL = 30 * 1000;
const OPTIONS = { ttl: TTL, retryAfterError: 20 * 1000 };

export const getLibraryItems = makeCache(
  async (userId) =>
    (await base44.entities.LibraryItem.filter({ user_id: userId }, "-created_date", 1000)) || [],
  OPTIONS
);

export const getMyUploads = makeCache(
  async (userId) =>
    (await base44.entities.Track.filter({ uploader_id: userId }, "-created_date", 1000)) || [],
  OPTIONS
);

export const getMyPlaylists = makeCache(
  async (userId) =>
    (await base44.entities.Playlist.filter({ creator_id: userId }, "-created_date", 200)) || [],
  OPTIONS
);

export const invalidateLibraryItems = () => getLibraryItems.invalidate();
export const invalidateMyUploads = () => getMyUploads.invalidate();
export const invalidateMyPlaylists = () => getMyPlaylists.invalidate();