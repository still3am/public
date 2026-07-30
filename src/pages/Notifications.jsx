import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import EmptyState from "@/components/EmptyState";
import PullToRefresh from "@/components/PullToRefresh";
import PageHeader from "@/components/PageHeader";
import { timeAgo } from "@/lib/audio-utils";
import { Bell, Heart, UserPlus, Music, Loader2 } from "lucide-react";

function iconFor(type) {
  if (type === "new_follower")
    return <UserPlus size={16} className="text-foreground/70" />;
  if (type === "track_liked")
    return <Heart size={16} className="fill-red-500 text-red-500" />;
  if (type === "new_upload_from_followed")
    return <Music size={16} className="text-foreground/70" />;
  return <Bell size={16} />;
}

function subjectFor(n, actor) {
  const name = actor?.display_name || actor?.full_name || "Someone";
  if (n.type === "new_follower") return `${name} followed you`;
  if (n.type === "track_liked") return `${name} liked your track`;
  if (n.type === "new_upload_from_followed")
    return `${name} uploaded a new track`;
  return `New activity from ${name}`;
}

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [actors, setActors] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await base44.entities.Notification.filter(
        { user_id: user.id },
        "-created_date",
        100
      );
      setItems(rows);
      const uniqIds = Array.from(
        new Set(rows.map((r) => r.actor_id).filter(Boolean))
      );
      const fetched = await Promise.all(
        uniqIds.map((id) =>
          base44.entities.User.get(id).catch(() => null)
        )
      );
      const byId = {};
      fetched.forEach((u) => {
        if (u) byId[u.id] = u;
      });
      setActors(byId);
      if (rows.some((r) => !r.read)) {
        base44.entities.Notification
          .updateMany(
            { user_id: user.id, read: false },
            { $set: { read: true } }
          )
          .catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading && !items.length)
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!items.length)
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You'll see new followers, likes, and uploads from people you follow here."
      />
    );

  return (
    <PullToRefresh onRefresh={load}>
    <div>
      <PageHeader eyebrow="Activity" title="Notifications" />
      <div className="space-y-1">
        {items.map((n) => {
          const actor = actors[n.actor_id];
          return (
            <Link
              key={n.id}
              to={actor ? `/profile/${actor.id}` : "/"}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-foreground/[0.03] transition"
            >
              <div className="w-11 h-11 rounded-full bg-foreground/10 grid place-items-center shrink-0">
                {iconFor(n.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {subjectFor(n, actor)}
                </div>
                <div className="text-xs text-foreground/40">
                  {n.created_date && timeAgo(n.created_date)}
                </div>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-foreground inline-block shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
    </PullToRefresh>
  );
}