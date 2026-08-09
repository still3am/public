import { Image } from "@/components/ui/image";
import { Play, Pause, Music2, Check, CheckCheck } from "lucide-react";
import { usePlayer } from "@/context/PlayerContext";
import { useLongPress } from "@/hooks/useLongPress";
import VoiceMessage from "@/components/messages/VoiceMessage";

export default function MessageBubble({ message, isMine, myId, isFirstInGroup, showReadReceipt, onLongPress, onMediaClick }) {
  const { currentTrack, togglePlay, playTrackAt } = usePlayer();
  const isTrack = !!message.track_id;
  let trackData = null;
  if (isTrack) {
    try { trackData = JSON.parse(message.track); } catch { trackData = null; }
  }

  const isPlayingThis = trackData && currentTrack?.id === trackData.id;
  const hasMedia = !!message.media_url && !!message.media_type;
  const isAudio = hasMedia && message.media_type === "audio";
  const isVisualMedia = hasMedia && (message.media_type === "image" || message.media_type === "video");

  let replyData = null;
  if (message.reply_preview) {
    try { replyData = JSON.parse(message.reply_preview); } catch { replyData = null; }
  }

  let reactions = {};
  if (message.reactions) {
    try { reactions = JSON.parse(message.reactions); } catch { reactions = {}; }
  }
  const reactionEntries = Object.entries(reactions).filter(([, ids]) => ids?.length > 0);

  const handlePlayTrack = () => {
    if (!trackData) return;
    if (isPlayingThis) togglePlay();
    else playTrackAt([trackData]);
  };

  const { triggered, bind } = useLongPress(() => onLongPress?.(message));

  const handleClick = (action) => {
    if (triggered.current) {
      triggered.current = false;
      return;
    }
    action?.();
  };

  const tailClass = isMine
    ? isFirstInGroup ? "rounded-br-[6px]" : "rounded-br-[18px]"
    : isFirstInGroup ? "rounded-bl-[6px]" : "rounded-bl-[18px]";

  const textBubbleBase = "max-w-[78%] sm:max-w-[68%] px-3.5 py-2 text-[15px] leading-relaxed break-words rounded-[18px]";
  const sentBubble = `${textBubbleBase} ${tailClass} bg-foreground text-background`;
  const recvBubble = `${textBubbleBase} ${tailClass} bg-foreground/[0.08] text-foreground`;

  const replyLabel = replyData?.sender_name || (isMine ? "You" : "");
  const replyText = replyData?.text
    || (replyData?.media_type === "image" ? "📷 Photo"
      : replyData?.media_type === "video" ? "🎥 Video"
      : replyData?.media_type === "audio" ? "🎤 Voice message"
      : replyData?.media_type ? "🎵 Song" : "");

  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`} {...bind}>
      {/* Reply preview */}
      {replyData && (
        <div className={`max-w-[78%] sm:max-w-[68%] mb-1 px-3 py-1.5 rounded-lg bg-foreground/[0.06] border-l-2 ${isMine ? "border-background/40" : "border-foreground/30"}`}>
          <div className="text-[11px] font-semibold text-foreground/60 truncate">{replyLabel}</div>
          <div className="text-[12px] text-foreground/50 truncate">{replyText}</div>
        </div>
      )}

      {/* Track card */}
      {isTrack && trackData ? (
        <button
          onClick={() => handleClick(handlePlayTrack)}
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
            <div className={`text-sm font-semibold truncate ${isMine ? "text-background" : "text-foreground"}`}>{trackData.title}</div>
            <div className={`text-xs truncate ${isMine ? "text-background/50" : "text-foreground/50"}`}>{trackData.artist || trackData.uploader_name}</div>
          </div>
          <div className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${isMine ? "bg-background/15" : "bg-foreground/10"}`}>
            {isPlayingThis ? <Pause size={16} className={isMine ? "text-background" : "text-foreground"} /> : <Play size={16} className={`ml-0.5 ${isMine ? "text-background" : "text-foreground"}`} />}
          </div>
        </button>
      ) : null}

      {/* Visual media (image/video) */}
      {isVisualMedia ? (
        <div
          onClick={() => handleClick(() => onMediaClick?.(message.media_url, message.media_type))}
          className={`rounded-[18px] ${tailClass} overflow-hidden max-w-[240px] sm:max-w-[300px] cursor-pointer relative bg-foreground/[0.05]`}
        >
          {message.media_type === "video" ? (
            <div className="relative w-full aspect-[4/3] bg-black">
              <video src={message.media_url} preload="metadata" playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 grid place-items-center bg-black/20">
                <div className="w-12 h-12 rounded-full bg-black/50 grid place-items-center">
                  <Play size={22} className="text-white ml-1" />
                </div>
              </div>
            </div>
          ) : (
            <Image src={message.media_url} fittingType="fill" alt="" className="w-full aspect-[4/3]" />
          )}
        </div>
      ) : null}

      {/* Voice message */}
      {isAudio ? (
        <VoiceMessage url={message.media_url} isMine={isMine} />
      ) : null}

      {/* Text */}
      {message.text ? (
        <div className={isMine ? sentBubble : recvBubble}>
          {message.text}
          {message.edited && <span className={`ml-1.5 text-[10px] ${isMine ? "text-background/40" : "text-foreground/30"}`}>edited</span>}
        </div>
      ) : null}

      {/* Reactions */}
      {reactionEntries.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 max-w-[78%] ${isMine ? "justify-end" : "justify-start"}`}>
          {reactionEntries.map(([emoji, ids]) => {
            const reacted = ids.includes(myId);
            return (
              <span
                key={emoji}
                className={`px-2 py-0.5 rounded-full text-sm flex items-center gap-1 transition ${
                  reacted ? "bg-foreground/15" : "bg-foreground/[0.08]"
                }`}
              >
                {emoji} <span className="text-xs text-foreground/60">{ids.length}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Delivery status */}
      {showReadReceipt && (
        <span className="flex items-center gap-0.5 mt-0.5 pr-1 text-foreground/40">
          {message.read ? <CheckCheck size={14} /> : <Check size={14} />}
        </span>
      )}
    </div>
  );
}