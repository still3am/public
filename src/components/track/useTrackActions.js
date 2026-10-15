import {useRef,useEffect} from "react";
import {
  Play, Pause, ListPlus, Check, Plus, ListMusic, Download, Trash2, Loader2, Heart,
  CloudOff, RefreshCw, Music2, User, UserPlus, UserCheck, Radio, Smartphone, Share2, Flag, EyeOff, Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useToast } from "@/components/ui/use-toast";
import { buildAutoQueue } from "@/lib/autoQueue";
import {downloadTrackFile} from "@/lib/downloadTrackFile";
import { shareTrack } from "@/lib/shareTrack";

/**
 * The one standard action list for a track, in fixed order. Every entry
 * reflects the user's current state (library, offline, liked, following).
 * `ui` carries the modal openers owned by the menu component.
 */
export function useTrackActions(track, menuState, ui) {
  const { user } = useAuth();
  const p = usePlayer();
  const nav = useNavigate();
  const { toast } = useToast();
  const { isInLibrary, toggle } = useLibrary();
  const cache = useOfflineCache();
  const mixing=useRef(false),latestPlayer=useRef(p),account=useRef(user?.id),alive=useRef(true);latestPlayer.current=p;account.current=user?.id;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const exporting=useRef(false),likeLock=useRef(false),followLock=useRef(false);
  const actionKey=[user?.id,track.id,track.uploader_id].join(":"),latestAction=useRef(actionKey);latestAction.current=actionKey;

  const requireAuth = () => {
    if (user) return true;
    toast({ title: "Sign in to do that" });
    base44.auth.redirectToLogin(window.location.href);
    return false;
  };

  const isCurrent = p.currentTrack?.id === track.id;
  const playingNow = isCurrent && p.isPlaying;
  const inLib = isInLibrary(track.id);
  const offline = cache.isCached(track.id);
  const savingOffline = !!cache.downloading[track.id];
  const isOwner = track.uploader_id === user?.id;
  const { liked, following, canFollow } = menuState;
  const artistName = track.artist || track.uploader_name || "artist";

  const toggleLike = async () => {
    if (!requireAuth()||!menuState.likeReady||likeLock.current) return;
    likeLock.current=true;const started=actionKey;
    menuState.setLiked(!liked);
    try {
      await base44.functions.invoke("toggleLike", { track_id: track.id, liked: !liked });
      toast({ title: liked ? "Removed from liked" : "Liked" });
    } catch {
      if(alive.current&&latestAction.current===started)menuState.setLiked(liked);
      toast({title:"Couldn’t update this song. Please try again.",variant:"destructive"});
    } finally{likeLock.current=false;}
  };

  const toggleFollow = async () => {
    if (!requireAuth()||!menuState.followReady||followLock.current) return;
    followLock.current=true;const started=actionKey;
    menuState.setFollowing(!following);
    try {
      if (following) {
        await base44.entities.Follow.deleteMany({ follower_id: user.id, following_id: track.uploader_id });
      } else {
        await base44.entities.Follow.create({ follower_id: user.id, following_id: track.uploader_id });
        base44.entities.Notification.create({
          user_id: track.uploader_id, type: "new_follower", actor_id: user.id,
        }).catch(() => {});
      }
      if(alive.current&&latestAction.current===started){window.dispatchEvent(new CustomEvent("follows:changed",{detail:{uid:user.id,followingId:track.uploader_id,following:!following}}));toast({ title: following ? `Unfollowed ${artistName}` : `Following ${artistName}` });}
    } catch {
      if(alive.current&&latestAction.current===started)menuState.setFollowing(following);
      toast({title:"Couldn’t update this song. Please try again.",variant:"destructive"});
    } finally{followLock.current=false;}
  };

  const toggleOffline = async () => {
    if(!requireAuth()) return;
    if (offline) {
      const ok=await cache.removeTrack(track.id);toast(ok?{title:"Removed from offline music"}:{title:"Couldn’t remove offline music. Try again.",variant:"destructive"});
      return;
    }
    const ok = await cache.saveForOffline(track);
    toast(ok ? { title: "Saved for offline" } : { title: "Couldn't save offline", variant: "destructive" });
  };

  const startMix = async () => {
    if(mixing.current)return;mixing.current=true;
    const uid=user?.id,startedTrack=latestPlayer.current.currentTrack?.id;
    const progress=toast({title:"Building your mix…",duration:20000});
    let timer;
    try{
      const more=await Promise.race([buildAutoQueue(track,[],20),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Mix request timed out")),20000);})]);
      const player=latestPlayer.current;
      if(!alive.current||account.current!==uid||player.currentTrack?.id!==startedTrack)return;
      if(!more.length){toast({title:"No matching songs found for this mix. Try another song."});return;}
      if(player.currentTrack?.id===track.id)player.setQueue([...player.queue.slice(0,player.currentIndex+1),...more]);
      else player.playTrackAt([track,...more]);
      toast({title:`Mix ready · ${more.length} songs`});
    }catch{toast({title:"Couldn’t build this mix. Please try again.",variant:"destructive"});}finally{clearTimeout(timer);mixing.current=false;progress.dismiss();}
  };

  const share = async () => {
    try {const result = await shareTrack(track);
    if (result === "copied") toast({ title: "Link copied" });}catch{toast({title:"Sharing is unavailable. Try again.",variant:"destructive"});}
  };

  const takedown = async () => {
    if (!window.confirm("Remove this track from PUBLIC? It stays in the uploader's library and profile.")) return;
    try {
      await base44.entities.Track.update(track.id, { is_published: false, approval_status: "rejected" });
      toast({ title: "Removed from PUBLIC" });
    } catch {
      toast({ title: "Couldn't remove track", variant: "destructive" });
    }
  };

  const artistPath = track.artist
    ? `/artist?name=${encodeURIComponent(track.artist)}`
    : `/profile/${track.uploader_id}`;

  const standard = [
    {
      icon: playingNow ? Pause : Play,
      label: playingNow ? "Pause" : "Play",
      onClick: () => (isCurrent ? p.togglePlay() : p.playTrackAt([track])),
    },
    {
      icon: ListPlus,
      label: "Add to queue",
      onClick: () => {
        if (!p.currentTrack) p.playTrackAt([track]);
        else p.addToQueue(track);
        toast({ title: "Added to queue" });
      },
    },
    {
      icon: inLib ? Check : Plus,
      label: inLib ? "Remove from library" : "Add to library",
      active: inLib,
      onClick: async () => {
        if (!requireAuth()) return;
        const ok=await toggle(track);
        toast(ok?{ title: inLib ? "Removed from library" : "Added to library" }:{title:"Could not update your library",variant:"destructive"});
      },
    },
    { icon: ListMusic, label: "Add to playlist", onClick: () => requireAuth() && ui.openPicker() },
    {
      icon: savingOffline ? Loader2 : offline ? Trash2 : CloudOff,
      label: savingOffline ? "Saving to offline…" : offline ? "Remove from offline" : "Add to offline",
      spin: savingOffline,
      disabled: savingOffline,
      onClick: toggleOffline,
    },
    {
      icon:Download,label:"Download to device",disabled:track.is_downloadable!==true,
      onClick:async()=>{
        if(!requireAuth()||exporting.current)return;
        exporting.current=true;
        try{const ok=await downloadTrackFile(track);toast(ok?{title:"File download started"}:{title:"Couldn’t start the download. Please try again.",variant:"destructive"});}
        catch{toast({title:"Couldn’t download this song. Please try again.",variant:"destructive"});}finally{exporting.current=false;}
      },
    },
    {
      icon: Heart,
      label: liked ? "Unlike" : "Like",
      active: liked,
      fill: liked,
      disabled:!!user&&!menuState.likeReady,
      onClick: toggleLike,
    },
    { icon: Music2, label: "Go to track", onClick: () => nav(`/track/${track.id}`) },
    { icon: User, label: "Go to artist", onClick: () => nav(artistPath) },
    canFollow && {
      icon: following ? UserCheck : UserPlus,
      label: following ? `Unfollow ${artistName}` : `Follow ${artistName}`,
      active: following,
      disabled:!!user&&!menuState.followReady,
      onClick: toggleFollow,
    },
    user&&(!menuState.likeReady||(canFollow&&!menuState.followReady))&&{icon:RefreshCw,label:"Refresh song actions",keepOpen:true,onClick:menuState.reload},
    { icon: Radio, label: "Mix", onClick: startMix },
    { icon: Smartphone, label: "Lounge", onClick: () => requireAuth() && ui.openLounge() },
    { icon: Share2, label: "Share", onClick: share },
    {
      icon: Send,
      label: "Send to a friend",
      onClick: () => requireAuth() && ui.openSend(),
    },
    !isOwner && {
      icon: Flag,
      label: "Report",
      danger: true,
      onClick: () => (ui.onReport ? ui.onReport(track) : requireAuth() && ui.openReport()),
    },
  ].filter(Boolean);

  // Visual dividers: playback | your stuff | navigate/follow | extras | report
  const GROUPS = [
    [Play, Pause, ListPlus],
    [Check, Plus, ListMusic, Download, CloudOff, Trash2, Loader2, Heart],
    [Music2, User, UserPlus, UserCheck],
    [Radio, Smartphone, Share2, Send, RefreshCw],
    [Flag],
  ];
  standard.forEach((item) => {
    item.group = GROUPS.findIndex((g) => g.includes(item.icon));
  });

  const manage = [];
  if (user?.role === "admin" && track.is_published) {
    manage.push({ icon: EyeOff, label: "Remove from PUBLIC", danger: true, onClick: takedown });
  }

  return { standard, manage };
}