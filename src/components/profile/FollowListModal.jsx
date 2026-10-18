import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
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
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const identity = useRef("");
  const [partial, setPartial] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const key = [userId, type].join(":");
    if (identity.current !== key) {identity.current = key;setUsers([]);setQuery("");setPartial(false);}
    async function load() {
      setLoading(true);setError(false);
      try {
        const filter =
        type === "followers" ?
        { following_id: userId } :
        { follower_id: userId };
        // Every follower, not just the first page — the counts shown on the
        // profile are exact, so the list behind them has to be too.
        const follows = await readAllPages((options) =>
        base44.entities.Follow.filter(filter, {
          sort: "-created_date",
          ...options
        })
        );
        const ids =
        type === "followers" ?
        follows.map((f) => f.follower_id) :
        follows.map((f) => f.following_id);
        if (ids.length === 0) {
          if (!cancelled) {setUsers([]);setPartial(false);}
          return;
        }
        const uniqueIds = [...new Set(ids.filter(Boolean))];
        const details = await getUsersByIds(uniqueIds);
        if (ids.length && !details.length) throw Error("Profile details could not be resolved");
        if (!cancelled) {const byId = new Map(details.map((person) => [person.id, person]));setUsers(uniqueIds.map((id) => byId.get(id)).filter(Boolean));setPartial(details.length < uniqueIds.length);}
      } catch {if (!cancelled) setError(true);} finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, type, retry]);

  const visibleUsers = users.filter((person) => [person.display_name, person.full_name, person.bio].join(" ").toLowerCase().includes(query.trim().toLowerCase()));

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={type === "followers" ? "Followers" : "Following"} data-public-dialog tabIndex={-1} onKeyDown={(e) => {if (e.key === "Escape") onClose();}}
    className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
    onClick={onClose}>
      
      <div
        className="bg-card w-full max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85dvh] md:max-h-[70vh] pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-extrabold tracking-tight">
            {type === "followers" ? "Followers" : "Following"}
          </h3>
          <button
            aria-label="Close follow list" onClick={onClose}
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-foreground/5 text-muted-foreground">
            
            <X size={18} />
          </button>
        </div>
        {users.length > 5 && <div className="px-5 py-3 border-b border-border"><input aria-label="Filter this follow list" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find someone in this list" className="w-full rounded-xl bg-foreground/5 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30" /></div>}
        <div className="overflow-y-auto overscroll-contain flex-1">
          {(error || partial) && <div className="p-5 text-sm hidden"><button className="underline font-semibold" onClick={() => setRetry((n) => n + 1)}>Refresh list</button></div>}
          {loading && !users.length ?
          <div className="py-16 grid place-items-center">
              <Loader2 className="animate-spin text-foreground/30" />
            </div> :
          users.length === 0 && !error ?
          <div className="py-16 text-center text-sm text-foreground/50">
              {type === "followers" ?
            "No followers yet." :
            "Not following anyone yet."}
            </div> :

          <div className="divide-y divide-border">
              {!visibleUsers.length && query.trim() && <p className="px-5 py-8 text-center text-sm text-muted-foreground">No matches in this list.</p>}
              {visibleUsers.map((u) =>
            <Link
              key={u.id}
              to={`/profile/${u.id}`}
              onClick={onClose}
              className="flex items-center gap-3 px-5 py-3 hover:bg-foreground/5 transition">
              
                  <Avatar user={u} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">
                      {u.display_name || u.full_name || "Unnamed"}
                    </div>
                    {u.bio &&
                <div className="text-xs text-foreground/50 truncate">
                        {u.bio}
                      </div>
                }
                  </div>
                </Link>
            )}
            </div>
          }
        </div>
      </div>
    </div>, document.body
  );
}