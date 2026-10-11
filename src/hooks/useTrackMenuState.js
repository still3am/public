import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

/**
 * Per-track personal state (liked, following the artist) for the options menu.
 * Fetched only while the menu is open so a page full of cards costs nothing.
 */
export function useTrackMenuState(track, open) {
  const { user } = useAuth();
  const [state, setState] = useState({ liked: false, following: false, ready: false });

  const artistId = track?.uploader_id;
  const canFollow = !!user && !!artistId && artistId !== user.id;

  useEffect(() => {
    if (!open || !user || !track?.id) {
      if (open) setState((s) => ({ ...s, ready: true }));
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, ready: false }));
    Promise.all([
      base44.entities.Like.filter({ user_id: user.id, track_id: track.id }, "-created_date", 1)
        .catch(() => []),
      canFollow
        ? base44.entities.Follow.filter(
            { follower_id: user.id, following_id: artistId },
            "-created_date",
            1
          ).catch(() => [])
        : Promise.resolve([]),
    ]).then(([likes, follows]) => {
      if (!alive) return;
      setState({ liked: likes.length > 0, following: follows.length > 0, ready: true });
    });
    return () => {
      alive = false;
    };
  }, [open, user?.id, track?.id, artistId, canFollow]);

  const setLiked = (liked) => setState((s) => ({ ...s, liked }));
  const setFollowing = (following) => setState((s) => ({ ...s, following }));

  return { ...state, canFollow, setLiked, setFollowing };
}