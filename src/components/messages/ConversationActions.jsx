import { Pin, BellOff, Bell, Trash2, X, Eraser } from "lucide-react";

export default function ConversationActions({ conversation, onPin, onMute, onClear, onDelete, onClose }) {
  return (
    <div className="fixed inset-0 z-[75] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-sm bg-background rounded-t-3xl md:rounded-3xl overflow-hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mt-3" />

        <button
          onClick={() => { onPin(); onClose(); }}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition"
        >
          <Pin size={20} className="text-foreground/60" />
          <span className="text-[15px]">{conversation.is_pinned ? "Unpin" : "Pin"}</span>
        </button>

        <button
          onClick={() => { onMute(); onClose(); }}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition"
        >
          {conversation.is_muted ? <Bell size={20} className="text-foreground/60" /> : <BellOff size={20} className="text-foreground/60" />}
          <span className="text-[15px]">{conversation.is_muted ? "Unmute" : "Mute"}</span>
        </button>

        <button
          onClick={() => { onClear(); onClose(); }}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition"
        >
          <Eraser size={20} className="text-foreground/60" />
          <span className="text-[15px]">Clear Conversation</span>
        </button>

        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-3.5 px-5 py-3.5 text-left hover:bg-foreground/5 transition text-destructive"
        >
          <Trash2 size={20} />
          <span className="text-[15px]">Delete</span>
        </button>

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