import { timeAgo } from "@/lib/audio-utils";

export default function ConversationList({ conversations, activeId, onSelect, currentUserId }) {
  if (!conversations?.length) return null;

  return (
    <div className="space-y-0.5">
      {conversations.map((c) => {
        const otherIdx = c.participant_ids?.indexOf(currentUserId) === 0 ? 1 : 0;
        const otherName = c.participant_names?.[otherIdx] || "User";
        const otherAvatar = c.participant_avatars?.[otherIdx] || "";
        const isActive = c.id === activeId;

        return (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left ${
              isActive ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.03]"
            }`}
          >
            {otherAvatar ? (
              <img src={otherAvatar} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-foreground/10 grid place-items-center text-sm font-semibold shrink-0">
                {otherName?.charAt(0) || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold truncate">{otherName}</span>
                {c.last_message_at && (
                  <span className="text-[10px] text-foreground/30 shrink-0">{timeAgo(c.last_message_at)}</span>
                )}
              </div>
              <div className="text-xs text-foreground/45 truncate mt-0.5">
                {c.last_message_text || "No messages yet"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}