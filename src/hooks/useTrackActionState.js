import { useCallback, useEffect, useState } from "react";
import {
  isFollowingArtist,
  isTrackLiked,
  setArtistFollow,
  setTrackLike,
} from "@/lib/trackActions";

/**
 * The listener's live state for one track: liked + following its artist.
 * Mounted only while a menu is open, so every open reflects reality without
 * costing a query per row on screen.
 */
export default function useTrackActionState(track, active, userId) {
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState("");

  const trackId = track?.id;
  const artistId = track?.uploader_id;

  useEffect(() => {
    if (!active || !trackId || !userId) {
      setLiked(false);
      setFollowing(false);
      return;
    }
    let alive = true;
    Promise.all([
      isTrackLiked(userId, trackId).catch(() => false),
      artistId ? isFollowingArtist(userId, artistId).catch(() => false) : false,
    ]).then(([likedNow, followingNow]) => {
      if (!alive) return;
      setLiked(likedNow);
      setFollowing(followingNow);
    });
    return () => {
      alive = false;
    };
  }, [active, trackId, artistId, userId]);

  const toggleLike = useCallback(async () => {
    if (!userId || !trackId || busy) return;
    const next = !liked;
    setLiked(next);
    setBusy("like");
    try {
      await setTrackLike(trackId, next);
    } catch {
      setLiked(!next);
      throw new Error("like-failed");
    } finally {
      setBusy("");
    }
  }, [busy, liked, trackId, userId]);

  const toggleFollow = useCallback(async () => {
    if (!userId || !artistId || busy) return;
    const next = !following;
    setFollowing(next);
    setBusy("follow");
    try {
      await setArtistFollow(userId, artistId, next);
    } catch {
      setFollowing(!next);
      throw new Error("follow-failed");
    } finally {
      setBusy("");
    }
  }, [artistId, busy, following, userId]);

  return { liked, following, busy, toggleLike, toggleFollow };
}