import { useState } from "react";
import LoadError from '@/components/LoadError';
import SafetyControls from '@/components/SafetyControls';
import {useSafety} from '@/context/SafetyContext';
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  Heart,
  UserPlus,
  Music,
  MessageCircle,
  CheckCheck,
  Send,
  Loader2 } from
"lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import Avatar from "@/components/Avatar";
import EmptyState from "@/components/EmptyState";
import { Image } from "@/components/ui/image";

const ICONS = {
  new_follower: UserPlus,
  track_liked: Heart,
  new_upload_from_followed: Music,
  profile_comment: MessageCircle,
  track_shared: Send
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
    case "track_shared":
      return `${name} sent you a song`;
    default:
      return "New notification";
  }
}

export default function Notifications() {
  const {blocked}=useSafety();
  const [view,setView]=useState("all");
  const { notifications, loading, error, hasMore, reload, loadMore, unreadCount, markAllAsRead, markAsRead } =
  useNotifications();

  const visibleNotifications=notifications.filter(n=>!blocked.has(n.actor_id)&&(view!=="unread"||!n.read)&&(view!=="music"||n.type==="track_shared"||n.type==="new_upload_from_followed"));

  if (loading && !notifications.length) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }

  return (
    <div className="notifications-page max-w-2xl mx-auto">
      <header className="page-intro"><p className="eyebrow">Your community</p><h1>Activity</h1><p>New followers, shared songs, and conversations.</p></header>
      <div className="view-switch mb-5" role="group" aria-label="Notification filter">{[["all","All"],["unread","Unread"],["music","Music"]].map(([value,label])=><button key={value} aria-pressed={view===value} onClick={()=>setView(value)} className={view===value?"active":""}>{label}{value==="unread"&&unreadCount>0&&<span className="ml-2 tabular-nums">{unreadCount}</span>}</button>)}</div>
      <div className="flex items-center justify-between gap-3 mb-5">
        






        
        {unreadCount > 0 &&
        <button
          onClick={markAllAsRead}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition">
          
            <CheckCheck size={14} /> Mark all read
          </button>
        }
      </div>

      {error&&<LoadError onRetry={reload}/>}
      {visibleNotifications.length === 0 ?
      <EmptyState
        icon={Bell}
        title={view==="unread"?"You’re all caught up":view==="music"?"No music activity here yet":"No notifications yet"}
        description="When someone follows you, likes your track, sends you a song, or comments on your profile, you'll see it here." /> :


      <div className="space-y-1.5">
          {visibleNotifications.map((n) => {
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
                  {n.track &&
                  <div className="mt-2 flex items-center gap-2.5 p-2 rounded-xl bg-foreground/[0.04]">
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
                        {n.track.cover_art_url ?
                      <Image
                        src={n.track.cover_art_url}
                        fittingType="fill"
                        alt=""
                        className="w-full h-full" /> :

                      <Music size={14} className="text-foreground/40" />
                      }
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{n.track.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {n.track.artist || n.track.uploader_name || "Unknown"}
                        </div>
                      </div>
                    </div>
                  }
                  {n.comment &&
                  <p className="mt-1.5 text-xs italic text-foreground/70 break-words">
                      "{n.comment}"
                    </p>
                  }
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
          return <div className="notification-item" key={n.id}>{link?<Link to={link} onClick={handle} className="block active:scale-[0.99] transition">{content}</Link>:<button onClick={handle} className="block w-full text-left">{content}</button>}<SafetyControls type="notification" id={n.id} userId={n.actor_id} label="note"/></div>;

        })}
        </div>
      }
      {hasMore&&<button disabled={loading} onClick={loadMore} className="border rounded-full px-4 py-2 mt-4">{loading?"Loading…":"Load older notifications"}</button>}
    </div>);

}