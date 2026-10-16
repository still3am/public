import LoadError from '@/components/LoadError';
import SafetyControls from '@/components/SafetyControls';
import {useSafety} from '@/context/SafetyContext';
import { Link, useSearchParams } from "react-router-dom";
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

function activityTime(value){const date=new Date(value);return Number.isNaN(date.getTime())?"":formatDistanceToNow(date,{addSuffix:true});}

function actorName(n) {
  return n.actor?.display_name || n.actor?.full_name || n.actor_name || "PUBLIC member";
}
function getMessage(n) {
  return ({
    new_follower:"started following you",
    track_liked:"liked your track",
    new_upload_from_followed:"uploaded a new track",
    profile_comment:"commented on your profile",
    track_shared:"sent you a song"
  })[n.type] || "sent you a notification";
}

export default function Notifications() {
  const {blocked}=useSafety();
  const [params,setParams]=useSearchParams();
  const view=["all","unread","music","shared"].includes(params.get("view"))?params.get("view"):"all";
  const setView=value=>setParams(previous=>{const next=new URLSearchParams(previous);if(value==="all")next.delete("view");else next.set("view",value);return next;},{replace:true});
  const { notifications, loading, error, hasMore, reload, loadMore, unreadCount, markAllAsRead, markAsRead } =
  useNotifications();

  const visibleNotifications=notifications.filter(n=>!blocked.has(n.actor_id)&&(view!=="unread"||!n.read)&&(view!=="music"||n.type==="track_shared"||n.type==="new_upload_from_followed")&&(view!=="shared"||n.type==="track_shared"));

  if (loading && !notifications.length) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }

  return (
    <div className="notifications-page max-w-2xl mx-auto">
      <header className="page-intro"><p className="eyebrow">Your community</p><h1>Activity</h1><p>New followers, shared songs, and conversations.</p></header>
      <div className="view-switch mb-5" role="group" aria-label="Notification filter">{[["all","All"],["unread","Unread"],["music","Music"],["shared","Shared"].map(([value,label])=><button key={value} aria-pressed={view===value} onClick={()=>setView(value)} className={view===value?"active":""}>{label}{value==="unread"&&unreadCount>0&&<span className="ml-2 tabular-nums">{unreadCount}</span>}</button>)}</div>
      <div className="flex items-center justify-between gap-3 mb-5">
        






        
        {unreadCount > 0 &&
        <button
          onClick={markAllAsRead}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition">
          
            <CheckCheck size={14} /> Mark all read
          </button>
        }
      </div>

      {error&&!notifications.length&&<LoadError onRetry={reload}/>}
      {visibleNotifications.length === 0 ?
      <EmptyState
        icon={Bell}
        title={hasMore?"No matches in this activity":view==="unread"?"You’re all caught up":view==="shared"?"No shared songs here yet":view==="music"?"No music activity here yet":"No notifications yet"}
        description="When someone follows you, likes your track, sends you a song, or comments on your profile, you'll see it here." /> :


      <div className="space-y-1.5">
          {visibleNotifications.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          const profileLink = n.actor_id ? `/profile/${encodeURIComponent(n.actor_id)}` : null;
          const handle = () => {if (!n.read) markAsRead(n.id);};
          const content =
          <div
            className={`notification-content flex items-start gap-3 p-3 rounded-2xl transition ${
            n.read ? "bg-transparent" : "bg-foreground/[0.03]"}`
            }>
            
                <div className="notification-avatar relative shrink-0">
                  {profileLink ? <Link to={profileLink} onClick={handle} aria-label={`View ${actorName(n)} profile`} className="block rounded-full focus-visible:ring-2 focus-visible:ring-ring"><Avatar user={n.actor || {display_name:actorName(n),avatar_url:n.actor_avatar_url||""}} size={44}/></Link> : <Avatar user={n.actor || {display_name:actorName(n),avatar_url:n.actor_avatar_url||""}} size={44}/>}
                  <div className="pointer-events-none absolute bottom-0 right-0 w-5 h-5 rounded-full bg-background grid place-items-center ring-1 ring-border">
                    <Icon size={11} className="text-foreground/60" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="notification-message text-sm text-foreground/80 leading-snug">
                    {profileLink ? <Link to={profileLink} onClick={handle} className="font-semibold text-foreground hover:underline focus-visible:underline">{actorName(n)}</Link> : <span className="font-semibold">{actorName(n)}</span>}{" "}{getMessage(n)}
                  </p>
                  {n.track &&
                  <Link to={`/track/${encodeURIComponent(n.track.id || n.track_id)}`} onClick={handle} aria-label={`Open ${n.track.title}`} className="notification-track mt-2 flex items-center gap-2.5 p-2 rounded-xl bg-foreground/[0.04]">
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
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{n.track.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {n.track.artist || n.track.uploader_name || "Unknown"}
                        </div>
                      </div>
                    </Link>
                  }
                  {n.comment &&
                  <p className="mt-1.5 text-xs italic text-foreground/70 break-words">
                      "{n.comment}"
                    </p>
                  }
                  <span className="text-[11px] text-foreground/40">
                    {activityTime(n.created_date)}
                  </span>
                </div>
                {!n.read &&
            <div className="w-2 h-2 rounded-full bg-foreground shrink-0 mt-2" />
            }
              </div>;

          return <div className="notification-item" key={n.id}>{content}<SafetyControls type="notification" id={n.id} userId={n.actor_id} label="note"/></div>;

        })}
        </div>
      }
      {hasMore&&<button disabled={loading} onClick={loadMore} className="border rounded-full px-4 py-2 mt-4">{loading?"Loading…":"Load older notifications"}</button>}
    </div>);

}