import { useEffect, useRef, useState } from "react";
import { ImageOff, RotateCcw, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { usePlayer } from "@/context/PlayerContext";
import { profileViewerMedia } from "@/lib/profileViewerMedia";
import ProfileComments from "./ProfileComments";
import "./profile-media-viewer.css";

export default function ProfileMediaViewer({ profile, profileId, isOwn, onClose, onReturnFocus }) {
  const media = profileViewerMedia(profile);
  const poster = useCoverUrl(media.poster);
  const player = usePlayer();
  const video = useRef(null), content = useRef(null);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(false), [playError, setPlayError] = useState("");
  const name = profile?.display_name || profile?.full_name || profile?.username || "PUBLIC member";

  useEffect(() => {
    const element = video.current;
    const hide = () => { if (document.hidden) element?.pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide);element?.pause(); };
  }, [media.source, attempt]);
  useEffect(() => { if (player?.isPlaying) video.current?.pause(); }, [player?.isPlaying]);
  useEffect(() => { setFailed(false);setPlaying(false);setMuted(false);setPlayError(""); }, [media.source]);

  function toggleVideo() {
    const element = video.current;if (!element) return;setPlayError("");
    if (!element.paused) {element.pause();return;}
    try {const request = element.play();request?.catch(() => {if (video.current === element) setPlayError("Couldn’t play this clip. Tap play to retry.");});}
    catch {setPlayError("Couldn’t play this clip. Tap play to retry.");}
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent ref={content} className="profile-media-viewer" onOpenAutoFocus={(event) => { event.preventDefault();content.current?.querySelector(":scope > button:last-child")?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault();onReturnFocus?.(); }}>
      <div className="profile-media-viewer-backdrop" aria-hidden="true" style={poster ? { backgroundImage: `url(${JSON.stringify(poster)})` } : undefined} />
      <div className="profile-media-viewer-topbar"><span className="profile-media-viewer-brand">PUBLIC.</span></div>
      <div className="profile-media-viewer-layout">
        <div className="profile-media-viewer-stage">
          {media.type === "video" ? <video key={media.source + attempt} ref={video} src={media.source} poster={poster || undefined} controls={false} muted={muted} playsInline loop preload="metadata" aria-label={name + " profile clip"} onPlay={() => {setPlaying(true);setPlayError("");player?.pausePlayback?.();}} onPause={() => setPlaying(false)} onVolumeChange={(event) => {setMuted(event.currentTarget.muted);if (!event.currentTarget.muted && !event.currentTarget.paused) player?.pausePlayback?.();}} onError={() => setFailed(true)} /> :
            !failed ? <img key={media.source + attempt} src={(media.type === "gif" ? media.source : poster) || undefined} alt={name + " profile " + (media.type === "gif" ? "GIF" : "photo")} onError={() => setFailed(true)} /> : <ImageOff size={40} aria-hidden="true" />}
          {media.type === "video" && !failed && <div className="profile-media-viewer-controls" role="group" aria-label="Profile clip controls">
            <button type="button" aria-label={playing ? "Pause profile clip" : "Play profile clip"} onClick={toggleVideo}>{playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}</button>
            <button type="button" aria-label={muted ? "Unmute clip sound" : "Mute clip sound"} aria-pressed={muted} onClick={() => {const element = video.current;if (element) {element.muted = !element.muted;setMuted(element.muted);}}}>{muted ? <VolumeX size={21} /> : <Volume2 size={21} />}</button>
          </div>}
          {playError && <p className="profile-media-viewer-play-error" role="alert">{playError}</p>}
          {failed && <div className="profile-media-viewer-error" role="alert"><p>This media couldn’t load.</p><button type="button" onClick={() => { setFailed(false);setAttempt((value) => value + 1); }}><RotateCcw size={15} /> Try again</button></div>}

        </div>
        <DialogHeader className="profile-media-viewer-identity">
          <DialogTitle>{name}</DialogTitle>
          <DialogDescription className="sr-only">View {name}’s profile {media.type === "video" ? "clip. Use the play and sound controls." : media.type === "gif" ? "GIF." : "photo."}</DialogDescription>
        </DialogHeader>
        <section className="profile-media-viewer-conversation" aria-label="Profile comments">
          <ProfileComments profileId={profileId} isOwn={isOwn} description="" emptyMessage="Start the conversation." onNavigate={onClose} presentation="media" />
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
