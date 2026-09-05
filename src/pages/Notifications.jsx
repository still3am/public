import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Heart,
  UserPlus,
  Music,
  MessageCircle,
  CheckCheck,
  Loader2 } from
"lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";

const ICONS = {
  new_follower: UserPlus,
  track_liked: Heart,
  new_upload_from_followed: Music,
  profile_comment: MessageCircle
};

function getLink(n) {
  if (n.type === "profile_comment" || n.type === "new_follower")
  return `/profile/${n.actor_id}`;
  if (n.track_id) return `/track/${n.track_id}`;
  return null;
}

function getMessage(n) {
  const name = n.actor?.display_name || n.actor?.full_name || "Someone";
  switch (n.type) {
    case "new_follower":
      return `${name} started following you`;
    case "track_liked":
      return `${name} liked your track`;
    case "new_upload_from_followed":
      return `${name} uploaded a new track`;
    case "profile_comment":
      return `${name} commented on your profile`;
    default:
      return "New notification";
  }
}

export default function Notifications() {
  const { notifications, loading, unreadCount, markAllAsRead, markAsRead } =
  useNotifications();

  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 pb-24 md:pb-12">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 hidden">
          <Bell size={22} /> Notifications
          {unreadCount > 0 &&
          <span className="text-xs font-bold bg-foreground text-background rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          }
        </h1>
        {unreadCount > 0 &&
        <button
          onClick={markAllAsRead}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition">
          
            <CheckCheck size={14} /> Mark all read
          </button>
        }
      </div>

      {notifications.length === 0 ?
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="When someone follows you, likes your track, or comments on your profile, you'll see it here." /> :


      <div className="space-y-1.5">
          {notifications.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          const link = getLink(n);
          const content =
          <div
            className={`flex items-start gap-3 p-3 rounded-2xl transition ${
            n.read ? "bg-transparent" : "bg-foreground/[0.03]"}`
            }>
            
                <div className="relative shrink-0">
                  <Avatar user={n.actor} size={44} />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background grid place-items-center ring-1 ring-border">
                    <Icon size={11} className="text-foreground/60" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 leading-snug">
                    {getMessage(n)}
                  </p>
                  <span className="text-[11px] text-foreground/40">
                    {formatDistanceToNow(new Date(n.created_date), {
                  addSuffix: true
                })}
                  </span>
                </div>
                {!n.read &&
            <div className="w-2 h-2 rounded-full bg-foreground shrink-0 mt-2" />
            }
              </div>;

          const handle = () => {
            if (!n.read) markAsRead(n.id);
          };
          return link ?
          <Link
            key={n.id}
            to={link}
            onClick={handle}
            className="block active:scale-[0.99] transition">
            
                {content}
              </Link> :

          <button
            key={n.id}
            onClick={handle}
            className="block w-full text-left">
            
                {content}
              </button>;

        })}
        </div>
      }
    </div>);

}