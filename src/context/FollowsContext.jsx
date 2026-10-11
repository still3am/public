import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const FollowsContext = createContext(null);

// The artists the current user follows, keyed by the artist's user id — the
// same relation the profile page's Follow button writes, shared here so any
// track menu knows whether it should offer Follow or Unfollow.
export function FollowsProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(new Set());
  const pending = useRef(new Set());

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setIds(new Set());
      return;
    }
    try {
      const rows = await base44.entities.Follow.filter(
        { follower_id: user.id },
        "-created_date",
        2000
      );
      setIds(new Set((rows || []).map((r) => r.following_id).filter(Boolean)));
    } catch {
      /* keep the current set */
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleFollow = useCallback(
    async (artistId) => {
      if (!user?.id || !artistId || artistId === user.id || pending.current.has(artistId)) {
        return false;
      }
      const wasFollowing = ids.has(artistId);
      pending.current.add(artistId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(artistId);
        else next.add(artistId);
        return next;
      });
      try {
        if (wasFollowing) {
          await base44.entities.Follow.deleteMany({
            follower_id: user.id,
            following_id: artistId,
          });
        } else {
          await base44.entities.Follow.create({
            follower_id: user.id,
            following_id: artistId,
          });
          try {
            await base44.entities.Notification.create({
              user_id: artistId,
              type: "new_follower",
              actor_id: user.id,
            });
          } catch {}
        }
        return !wasFollowing;
      } catch {
        setIds((prev) => {
          const next = new Set(prev);
          if (wasFollowing) next.add(artistId);
          else next.delete(artistId);
          return next;
        });
        return wasFollowing;
      } finally {
        pending.current.delete(artistId);
      }
    },
    [user?.id, ids]
  );

  return (
    <FollowsContext.Provider
      value={{ isFollowing: (id) => ids.has(id), toggleFollow, count: ids.size }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

export function useFollows() {
  const ctx = useContext(FollowsContext);
  if (!ctx) return { isFollowing: () => false, toggleFollow: async () => false, count: 0 };
  return ctx;
}