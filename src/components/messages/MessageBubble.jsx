import { Image } from "@/components/ui/image";
import { Play, Pause, Music2 } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";

export default function MessageBubble({ message, isMine, isFirstInGroup, showReadReceipt }) {
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

  const tailClass = isMine
    ? isFirstInGroup ? "rounded-br-[6px]" : "rounded-br-[18px]"
    : isFirstInGroup ? "rounded-bl-[6px]" : "rounded-bl-[18px]";

  const textBubbleBase = "max-w-[78%] sm:max-w-[68%] px-3.5 py-2 text-[15px] leading-relaxed break-words rounded-[18px]";
  const sentBubble = `${textBubbleBase} ${tailClass} bg-foreground text-background`;
  const recvBubble = `${textBubbleBase} ${tailClass} bg-foreground/[0.08] text-foreground`;

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      {isTrack && trackData ? (
        <button
          onClick={handlePlayTrack}
          className={`flex items-center gap-3 p-2.5 rounded-[18px] ${tailClass} transition active:scale-[0.98] max-w-[78%] sm:max-w-[68%] ${
            isMine ? "bg-foreground text-background" : "bg-foreground/[0.08] text-foreground"
          } ${isPlayingThis ? "ring-2 ring-foreground/20" : ""}`}
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/10 shrink-0 grid place-items-center">
            {trackData.cover_art_url ? (
              <Image src={trackData.cover_art_url} fittingType="fill" alt="" className="w-full h-full" />
            ) : (
              <Music2 size={18} className={isMine ? "text-background/50" : "text-foreground/40"} />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className={`text-sm font-semibold truncate ${isMine ? "text-background" : "text-foreground"}`}>
              {trackData.title}
            </div>
            <div className={`text-xs truncate ${isMine ? "text-background/50" : "text-foreground/50"}`}>
              {trackData.artist || trackData.uploader_name}
            </div>
          </div>
          <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
            isMine ? "bg-background/15" : "bg-foreground/10"
          }`}>
            {isPlayingThis ? <Pause size={16} className={isMine ? "text-background" : "text-foreground"} /> : <Play size={16} className={`ml-0.5 ${isMine ? "text-background" : "text-foreground"}`} />}
          </div>
        </button>
      ) : null}

      {message.text ? (
        <div className={isMine ? sentBubble : recvBubble}>
          {message.text}
        </div>
      ) : null}

      {showReadReceipt && (
        <span className="text-[11px] text-foreground/40 mt-0.5 pr-1">
          {message.read ? "Read" : "Delivered"}
        </span>
      )}
    </div>
  );
}