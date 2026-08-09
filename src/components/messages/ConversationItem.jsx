import { useLongPress } from "@/hooks/useLongPress";
import { Pin, BellOff } from "lucide-react";

function timeLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const day = 86400000;
  if (diff < day && d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationItem({ conv, other, me, isActive, unreadCount, isUnread, onOpen, onLongPress }) {
  const { triggered, bind } = useLongPress(() => onLongPress(conv));
  const hasUnread = unreadCount > 0 || isUnread;

  return (
    <div
      onClick={() => {
        if (triggered.current) { triggered.current = false; return; }
        onOpen(conv);
      }}
      className={`w-full flex items-center gap-3 px-4 py-2.5 cursor-pointer transition select-none ${
        isActive ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"
      }`}
      {...bind}
    >
      <div className="relative shrink-0">
        {other.avatar_url ? (
          <img src={other.avatar_url} alt="" className="w-[52px] h-[52px] rounded-full object-cover" />
        ) : (
          <div className="w-[52px] h-[52px] rounded-full bg-foreground/10 grid place-items-center text-lg font-bold text-foreground/50">
            {(other.display_name || "?").charAt(0).toUpperCase()}
          </div>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 rounded-full bg-foreground text-background text-[11px] font-bold grid place-items-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {conv.is_pinned && <Pin size={12} className="text-foreground/40 shrink-0" />}
            {conv.is_muted && <BellOff size={12} className="text-foreground/40 shrink-0" />}
            <span className={`text-[16px] truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>
              {other.display_name}
            </span>
          </div>
          {conv.last_message_at && (
            <span className={`text-[12px] shrink-0 ${hasUnread ? "text-foreground/60 font-medium" : "text-foreground/40"}`}>
              {timeLabel(conv.last_message_at)}
            </span>
          )}
        </div>
        <p className={`text-[14px] truncate mt-0.5 ${hasUnread ? "text-foreground/70 font-medium" : "text-foreground/40"}`}>
          {conv.last_message_text || "No messages yet"}
        </p>
      </div>
    </div>
  );
}