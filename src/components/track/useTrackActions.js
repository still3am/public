import {setLikeState} from "@/lib/likeActions";
import {useRef,useEffect} from "react";
import {
  Play, Pause, ListPlus, Check, Plus, ListMusic, Download, Heart,
  RefreshCw, Music2, User, UserPlus, UserCheck, Radio, Smartphone, Share2, Flag, EyeOff, Send,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import { useLibrary } from "@/context/LibraryContext";
import { useToast } from "@/components/ui/use-toast";
import { buildAutoQueue } from "@/lib/autoQueue";
import {downloadTrackFile} from "@/lib/downloadTrackFile";
import { shareTrack } from "@/lib/shareTrack";
import {prepareTrackShare} from "@/lib/trackShareUrl";

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
  const { isInLibrary, isPending, toggle } = useLibrary();
  const mixing=useRef(false),latestPlayer=useRef(p),account=useRef(user?.id),alive=useRef(true);latestPlayer.current=p;account.current=user?.id;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const exporting=useRef(false),likeLock=useRef(false);
  const actionKey=[user?.id,track.id,track.uploader_id].join(":"),latestAction=useRef(actionKey);latestAction.current=actionKey;

  useEffect(()=>{prepareTrackShare();},[track.id]);

  const requireAuth = () => {
    if (user) return true;
    toast({ title: "Sign in to do that" });
    base44.auth.redirectToLogin(window.location.href);
    return false;
  };

  const isCurrent = p.currentTrack?.id === track.id;
  const playingNow = isCurrent && p.isPlaying;
  const inLib = isInLibrary(track.id);
  const isOwner = track.uploader_id === user?.id;
  const { liked } = menuState;


  const toggleLike = async () => {
    if (!requireAuth()||!menuState.likeReady||likeLock.current) return;
    likeLock.current=true;const started=actionKey;
    try {
      const result=await setLikeState(base44,user.id,track.id,!liked);
      if(!alive.current||latestAction.current!==started)return;
      menuState.setLiked(result.liked);
      toast({ title: result.pending ? "Saved on this device · will sync when online" : result.liked ? "Liked" : "Removed from liked" });
    } catch {
      if(alive.current&&latestAction.current===started)menuState.setLiked(liked);
      toast({title:"Couldn’t update this song. Please try again.",variant:"destructive"});
    } finally{likeLock.current=false;}
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
      disabled:isPending(track.id),
      onClick: async () => {
        if (!requireAuth()) return;
        const ok=await toggle(track);
        toast(ok?{ title: "Library updated" }:{title:"Could not update your library",variant:"destructive"});
      },
    },
    { icon: ListMusic, label: "Add to playlist", onClick: () => requireAuth() && ui.openPicker() },
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
    user&&!menuState.likeReady&&{icon:RefreshCw,label:"Refresh song actions",keepOpen:true,onClick:menuState.reload},
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
    [Check, Plus, ListMusic, Download, CloudOff, Heart],
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