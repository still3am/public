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
        if (wasLiked) {
          await base44.entities.Like.deleteMany({
            user_id: user.id,
            track_id: track.id,
          });
          await base44.entities.Track.updateMany(
            { id: track.id },
            { $inc: { like_count: -1 } }
          );
        } else {
          await base44.entities.Like.create({
            user_id: user.id,
            track_id: track.id,
          });
          await base44.entities.Track.updateMany(
            { id: track.id },
            { $inc: { like_count: 1 } }
          );
          try {
            await base44.entities.Notification.create({
              user_id: track.uploader_id,
              type: "track_liked",
              actor_id: user.id,
              track_id: track.id,
            });
          } catch {}
        }
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