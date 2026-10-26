import { useEffect, useRef, useState } from "react";
import { ImageOff, RotateCcw } from "lucide-react";
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
  const name = profile?.display_name || profile?.full_name || profile?.username || "PUBLIC member";

  useEffect(() => {
    const element = video.current;
    const hide = () => { if (document.hidden) element?.pause(); };
    document.addEventListener("visibilitychange", hide);
    return () => { document.removeEventListener("visibilitychange", hide);element?.pause(); };
  }, [media.source, attempt]);
  useEffect(() => { if (player?.isPlaying) video.current?.pause(); }, [player?.isPlaying]);
  useEffect(() => { setFailed(false); }, [media.source]);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent ref={content} className="profile-media-viewer" onOpenAutoFocus={(event) => { event.preventDefault();content.current?.querySelector(":scope > button:last-child")?.focus(); }} onCloseAutoFocus={(event) => { event.preventDefault();onReturnFocus?.(); }}>
      <div className="profile-media-viewer-backdrop" aria-hidden="true" style={poster ? { backgroundImage: `url(${JSON.stringify(poster)})` } : undefined} />
      <DialogHeader className="profile-media-viewer-header">
        <span className="profile-media-viewer-brand">PUBLIC.</span>
        <DialogTitle>{name}</DialogTitle>
        <DialogDescription>Profile {media.type === "video" ? "clip" : media.type === "gif" ? "GIF" : "photo"}</DialogDescription>
      </DialogHeader>
      <div className="profile-media-viewer-layout">
        <div className="profile-media-viewer-stage">
          {media.type === "video" ? <video key={media.source + attempt} ref={video} src={media.source} poster={poster || undefined} controls playsInline loop preload="metadata" aria-label={name + " profile clip"} onPlay={() => player?.pausePlayback?.()} onVolumeChange={(event) => { if (!event.currentTarget.muted && !event.currentTarget.paused) player?.pausePlayback?.(); }} onError={() => setFailed(true)} /> :
            !failed ? <img key={media.source + attempt} src={(media.type === "gif" ? media.source : poster) || undefined} alt={name + " profile " + (media.type === "gif" ? "GIF" : "photo")} onError={() => setFailed(true)} /> : <ImageOff size={40} aria-hidden="true" />}
          {failed && <div className="profile-media-viewer-error" role="alert"><p>This media couldn’t load.</p><button type="button" onClick={() => { setFailed(false);setAttempt((value) => value + 1); }}><RotateCcw size={15} /> Try again</button></div>}
          {media.type === "video" && <p className="profile-media-viewer-hint">Tap play to watch with sound.</p>}
        </div>
        <section className="profile-media-viewer-conversation" aria-label="Profile comments">
          <ProfileComments profileId={profileId} isOwn={isOwn} description="Shared with this profile’s conversation." emptyMessage="Be the first to leave a comment." onNavigate={onClose} />
        </section>
      </div>
    </DialogContent>
  </Dialog>;
}
