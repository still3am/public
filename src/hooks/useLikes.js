import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

export function useLikes(user) {
  const [likedIds, setLikedIds] = useState(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setReady(true);
      return;
    }
    base44.entities.Like
      .filter({ user_id: user.id }, "-created_date", 1000)
      .then((likes) => {
        setLikedIds(new Set(likes.map((l) => l.track_id)));
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [user?.id]);

  const toggleLike = useCallback(
    async (track) => {
      if (!user?.id) return;
      const wasLiked = likedIds.has(track.id);
      setLikedIds((prev) => {
        const s = new Set(prev);
        if (wasLiked) s.delete(track.id);
        else s.add(track.id);
        return s;
      });
      try {
        const res = await base44.functions.invoke("toggleLike", {
          track_id: track.id,
        });
        const liked = res?.data?.liked;
        setLikedIds((prev) => {
          const s = new Set(prev);
          if (liked) s.add(track.id);
          else s.delete(track.id);
          return s;
        });
      } catch {
        setLikedIds((prev) => {
          const s = new Set(prev);
          if (wasLiked) s.add(track.id);
          else s.delete(track.id);
          return s;
        });
      }
    },
    [user?.id, likedIds]
  );

  return { likedIds, toggleLike, ready };
}