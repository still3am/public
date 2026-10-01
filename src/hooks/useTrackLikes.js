import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  ensureLikesLoaded,
  isTrackLiked,
  subscribeLikes,
  toggleTrackLike,
} from "@/lib/trackLikes";

/** Like state for the signed-in user, shared by every track options menu. */
export function useTrackLikes() {
  const { user } = useAuth();
  const [, bump] = useState(0);

  useEffect(() => subscribeLikes(() => bump((n) => n + 1)), []);

  useEffect(() => {
    ensureLikesLoaded(user?.id).catch(() => {});
  }, [user?.id]);

  const toggle = useCallback((track) => toggleTrackLike(track, user?.id), [user?.id]);

  return { isLiked: isTrackLiked, toggle, canLike: !!user?.id };
}