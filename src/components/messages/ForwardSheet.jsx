import { useState } from "react";
import { X, Search, Forward } from "lucide-react";

export default function ForwardSheet({ conversations, me, onPick, onClose }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const otherIdx = c.participant_ids.indexOf(me.id) === 0 ? 1 : 0;
        const name = c.participant_names[otherIdx] || "Unknown";
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-lg bg-background border border-border/50 rounded-t-3xl md:rounded-3xl max-h-[82vh] flex flex-col overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-background">
          <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-[17px] font-semibold">Forward to…</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-foreground/10 transition" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="relative mt-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 rounded-full bg-foreground/[0.07] text-[15px] border-0 focus:outline-none placeholder:text-foreground/40"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-foreground/40 py-8">No conversations found.</p>
          ) : (
            filtered.map((c) => {
              const otherIdx = c.participant_ids.indexOf(me.id) === 0 ? 1 : 0;
              const name = c.participant_names[otherIdx] || "Unknown";
              const avatar = c.participant_avatars[otherIdx] || "";
              return (
                <button
                  key={c.id}
                  onClick={() => onPick(c)}
                  className="w-full flex items-center gap-3 px-2 py-2 text-left hover:bg-foreground/[0.04] active:bg-foreground/[0.06] rounded-2xl transition"
                >
                  {avatar ? (
                    <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-foreground/10 grid place-items-center font-bold text-foreground/50 shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[15px] font-medium flex-1 truncate">{name}</span>
                  <Forward size={16} className="text-foreground/30 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}