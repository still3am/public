import { Reply, Copy, Trash2, X } from "lucide-react";

const QUICK_EMOJIS = ["❤️", "🔥", "😂", "👍", "😮", "😢"];

export default function MessageContextMenu({ message, isMine, myId, onReact, onReply, onCopy, onDelete, onClose }) {
  const hasText = !!message.text;
  return (
    <div className="fixed inset-0 z-[75] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-sm bg-background rounded-t-3xl md:rounded-3xl overflow-hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mt-3" />

        <div className="flex justify-center gap-1 py-4 px-3">
          {QUICK_EMOJIS.map((emoji) => {
            let active = false;
            try {
              const reactions = JSON.parse(message.reactions || "{}");
              active = (reactions[emoji] || []).includes(myId);
            } catch {}
            return (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); onClose(); }}
                className={`w-11 h-11 rounded-full grid place-items-center text-2xl transition active:scale-90 ${
                  active ? "bg-foreground/10" : "hover:bg-foreground/5"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>

        <div className="border-t border-border/30" />

        <button
          onClick={() => { onReply(); onClose(); }}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition"
        >
          <Reply size={20} className="text-foreground/60" />
          <span className="text-[15px]">Reply</span>
        </button>

        {hasText && (
          <button
            onClick={() => { onCopy(); onClose(); }}
            className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition"
          >
            <Copy size={20} className="text-foreground/60" />
            <span className="text-[15px]">Copy</span>
          </button>
        )}

        {isMine && (
          <button
            onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition text-destructive"
          >
            <Trash2 size={20} />
            <span className="text-[15px]">Delete</span>
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition border-t border-border/30"
        >
          <X size={20} className="text-foreground/60" />
          <span className="text-[15px]">Cancel</span>
        </button>
      </div>
    </div>
  );
}