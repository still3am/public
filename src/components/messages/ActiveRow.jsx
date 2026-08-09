import { Plus } from "lucide-react";

function getOtherUser(conv, me) {
  const idx = conv.participant_ids.indexOf(me.id);
  const otherIdx = idx === 0 ? 1 : 0;
  return {
    id: conv.participant_ids[otherIdx],
    display_name: conv.participant_names[otherIdx] || "Unknown",
    avatar_url: conv.participant_avatars[otherIdx] || "",
  };
}

export default function ActiveRow({ conversations, me, onPick, onNew }) {
  const recent = conversations.slice(0, 15);

  return (
    <div className="flex gap-3.5 overflow-x-auto px-4 py-2 no-scrollbar">
      <button
        onClick={onNew}
        className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition"
      >
        <div className="w-[52px] h-[52px] rounded-full bg-foreground/[0.06] grid place-items-center">
          <Plus size={20} className="text-foreground/60" />
        </div>
        <span className="text-[11px] text-foreground/50 font-medium">New</span>
      </button>
      {recent.map((conv) => {
        const other = getOtherUser(conv, me);
        const firstName = (other.display_name || "").split(" ")[0];
        return (
          <button
            key={conv.id}
            onClick={() => onPick(conv)}
            className="flex flex-col items-center gap-1.5 shrink-0 active:scale-95 transition"
          >
            {other.avatar_url ? (
              <img src={other.avatar_url} alt="" className="w-[52px] h-[52px] rounded-full object-cover" />
            ) : (
              <div className="w-[52px] h-[52px] rounded-full bg-foreground/10 grid place-items-center text-lg font-bold text-foreground/50">
                {(other.display_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] text-foreground/60 font-medium truncate max-w-[56px]">{firstName}</span>
          </button>
        );
      })}
    </div>
  );
}