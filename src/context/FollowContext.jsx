import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const FollowContext = createContext(null);

// One shared social graph. Every Follow button in the app reads from here, so
// following someone in search immediately reads as "Following" on their profile
// and in every track menu.
export function FollowProvider({ children }) {
  const { user } = useAuth();
  const [keys, setKeys] = useState(() => new Set());
  // Bumped on any follow change anywhere — lets pages showing counts know their
  // numbers are stale without every page subscribing itself.
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    if (!user?.id) {
      setKeys(new Set());
      return;
    }
    const rows = await base44.entities.Follow.filter({ follower_id: user.id }, "-created_date", 1000);
    setKeys(
      new Set(
        (rows || []).map((r) => `${r.target_type || "user"}:${r.following_id}`)
      )
    );
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = base44.entities.Follow.subscribe((event) => {
      setVersion((v) => v + 1);
      // My own graph changed (another tab/device) — the local set must match.
      if (event?.data?.follower_id === user.id) load();
    });
    return unsubscribe;
  }, [load, user?.id]);

  const isFollowing = useCallback(
    (id, type = "user") => !!id && keys.has(`${type}:${id}`),
    [keys]
  );

  const toggle = useCallback(
    async ({ id, type = "user", name = "" }) => {
      if (!id || !user?.id) return null;
      const key = `${type}:${id}`;
      const wasFollowing = keys.has(key);
      const apply = (on) =>
        setKeys((prev) => {
          const next = new Set(prev);
          if (on) next.add(key);
          else next.delete(key);
          return next;
        });

      apply(!wasFollowing);
      try {
        if (wasFollowing) {
          await base44.entities.Follow.deleteMany({
            follower_id: user.id,
            following_id: id,
          });
        } else {
          await base44.entities.Follow.create({
            follower_id: user.id,
            following_id: id,
            target_type: type,
            artist_name: type === "artist" ? name : "",
          });
          // Artists have no account to notify — only real users get told.
          if (type === "user" && id !== user.id) {
            await base44.entities.Notification.create({
              user_id: id,
              type: "new_follower",
              actor_id: user.id,
            }).catch(() => {});
          }
        }
        setVersion((v) => v + 1);
        return { following: !wasFollowing };
      } catch (e) {
        apply(wasFollowing);
        throw e;
      }
    },
    [keys, user?.id]
  );

  return (
    <FollowContext.Provider
      value={{ isFollowing, toggle, version, refresh: load, count: keys.size }}
    >
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) {
    return {
      isFollowing: () => false,
      toggle: async () => null,
      version: 0,
      refresh: async () => {},
      count: 0,
    };
  }
  return ctx;
}