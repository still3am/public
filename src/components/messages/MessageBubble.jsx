import { Image } from "@/components/ui/image";
import { Play, Pause, Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function MessageBubble({ message, isMine, showAvatar, senderAvatar }) {
  const { currentTrack, togglePlay, playTrackAt } = usePlayer();
  const isTrack = !!message.track_id;
  let trackData = null;
  if (isTrack) {
    try { trackData = JSON.parse(message.track); } catch { trackData = null; }
  }

  const isPlayingThis = trackData && currentTrack?.id === trackData.id;

  const handlePlayTrack = () => {
    if (!trackData) return;
    if (isPlayingThis) {
      togglePlay();
    } else {
      playTrackAt([trackData]);
    }
  };

  return (
    <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      {/* Avatar slot — only on received messages, only when showAvatar */}
      <div className="w-7 shrink-0">
        {!isMine && showAvatar && senderAvatar ? (
          <img
            src={senderAvatar}
            alt=""
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : !isMine && showAvatar ? (
          <div className="w-7 h-7 rounded-full bg-foreground/10 grid place-items-center text-[10px] font-bold text-foreground/50">
            {(message.sender_name || "?").charAt(0).toUpperCase()}
          </div>
        ) : null}
      </div>

      <div className={`max-w-[78%] sm:max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {isTrack && trackData ? (
          <button
            onClick={handlePlayTrack}
            className={`flex items-center gap-3 p-2.5 rounded-2xl transition active:scale-[0.98] ${
              isMine
                ? "bg-foreground text-background rounded-br-md"
                : "bg-card border border-border rounded-bl-md"
            } ${isPlayingThis ? "ring-2 ring-foreground/30" : ""}`}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-foreground/10 shrink-0 grid place-items-center">
              {trackData.cover_art_url ? (
                <Image src={trackData.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
              ) : (
                <Music2 size={18} className="text-foreground/40" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className={`text-sm font-semibold truncate ${isMine ? "text-background" : "text-foreground"}`}>
                {trackData.title}
              </div>
              <div className={`text-xs truncate ${isMine ? "text-background/60" : "text-foreground/50"}`}>
                {trackData.artist || trackData.uploader_name}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
              isMine ? "bg-background/15" : "bg-foreground/8"
            }`}>
              {isPlayingThis ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </div>
          </button>
        ) : null}

        {message.text ? (
          <div
            className={`px-3.5 py-2 rounded-2xl text-[15px] leading-relaxed break-words ${
              isMine
                ? "bg-foreground text-background rounded-br-md"
                : "bg-card border border-border rounded-bl-md"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <span className="text-[10px] text-foreground/30 px-1">
          {timeLabel(message.created_date)}
        </span>
      </div>
    </div>
  );
}