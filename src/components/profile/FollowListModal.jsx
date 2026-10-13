import {createPortal} from "react-dom";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getUsersByIds } from "@/lib/userLookup";
import { readAllPages } from "@/lib/readPages";
import { X, Loader2 } from "lucide-react";
import Avatar from "@/components/Avatar";

/** @param {any} props */
export default function FollowListModal({ userId, type, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,setError]=useState(false);
  const [retry,setRetry]=useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);setError(false);
      try {
        const filter =
          type === "followers"
            ? { following_id: userId }
            : { follower_id: userId };
        // Every follower, not just the first page — the counts shown on the
        // profile are exact, so the list behind them has to be too.
        const follows = await readAllPages((options) =>
          base44.entities.Follow.filter(filter, {
            sort: "-created_date",
            ...options,
          })
        );
        const ids =
          type === "followers"
            ? follows.map((f) => f.follower_id)
            : follows.map((f) => f.following_id);
        if (ids.length === 0) {
          if (!cancelled) setUsers([]);
          return;
        }
        const details = await getUsersByIds(ids);
        if(ids.length&&!details.length)throw Error("Profile details could not be resolved");
        if (!cancelled) setUsers(details);
      } catch {if(!cancelled)setError(true);} finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, type,retry]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={type==="followers"?"Followers":"Following"} data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape")onClose();}}
      className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
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
            aria-label="Close follow list" onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-foreground/5 text-muted-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {error&&<div className="p-5 text-sm"><button className="underline font-semibold" onClick={()=>setRetry(n=>n+1)}>Refresh list</button></div>}
          {loading ? (
            <div className="py-16 grid place-items-center">
              <Loader2 className="animate-spin text-foreground/30" />
            </div>
          ) : users.length === 0 && !error ? (
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
    </div>,document.body
  );
}