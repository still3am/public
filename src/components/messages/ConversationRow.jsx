import { BellOff, Pin } from "lucide-react";
import Avatar from "@/components/Avatar";
import { otherParticipant, shortTime } from "@/lib/messaging";

export default function ConversationRow({ conversation, myId, unread = 0, onOpen }) {
  const other = otherParticipant(conversation, myId);
  const name = other?.name || "Unknown";
  const preview = conversation.last_message_text
    ? `${conversation.last_sender_id === myId ? "You: " : ""}${conversation.last_message_text}`
    : "No messages yet";

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-foreground/[0.04] transition">
      
      <Avatar user={{ full_name: name, avatar_url: other?.avatar_url }} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`truncate text-sm ${unread ? "font-extrabold" : "font-semibold"}`}>
            {name}
          </span>
          {conversation.is_pinned && <Pin size={12} className="shrink-0 text-foreground/45" />}
          {conversation.is_muted && <BellOff size={12} className="shrink-0 text-foreground/45" />}
          <span className="ml-auto shrink-0 text-[11px] text-foreground/50">
            {shortTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`truncate text-xs ${unread ? "text-foreground" : "text-foreground/55"}`}>
            {preview}
          </span>
          {unread > 0 &&
          <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-bold grid place-items-center">
              {unread > 9 ? "9+" : unread}
            </span>
          }
        </div>
      </div>
    </button>);

}