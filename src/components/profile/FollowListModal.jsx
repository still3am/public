import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { X, Loader2 } from "lucide-react";
import Avatar from "@/components/Avatar";

export default function FollowListModal({ userId, type, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const filter =
          type === "followers"
            ? { following_id: userId }
            : { follower_id: userId };
        const follows = await base44.entities.Follow.filter(
          filter,
          "-created_date",
          100
        );
        const ids =
          type === "followers"
            ? follows.map((f) => f.follower_id)
            : follows.map((f) => f.following_id);
        if (ids.length === 0) {
          if (!cancelled) setUsers([]);
          return;
        }
        const details = await Promise.all(
          ids.map((id) => base44.entities.User.get(id).catch(() => null))
        );
        if (!cancelled) setUsers(details.filter(Boolean));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, type]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[80vh] md:max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-extrabold tracking-tight">
            {type === "followers" ? "Followers" : "Following"}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-foreground/5 text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 grid place-items-center">
              <Loader2 className="animate-spin text-foreground/30" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center text-sm text-foreground/50">
              {type === "followers"
                ? "No followers yet."
                : "Not following anyone yet."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((u) => (
                <Link
                  key={u.id}
                  to={`/profile/${u.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/5 transition"
                >
                  <Avatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">
                      {u.display_name || u.full_name || "Unnamed"}
                    </div>
                    {u.bio && (
                      <div className="text-xs text-foreground/50 truncate">
                        {u.bio}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}