import { X, Play, Trash2 } from "lucide-react";
import { formatTime } from "@/lib/audio-utils";
import { Link } from "react-router-dom";

export default function QueueDrawer({ p, onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-bold">Up Next</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/5"
            aria-label="Close queue"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {p.queue.length === 0 && (
            <div className="text-sm text-foreground/50 p-6 text-center">
              Queue is empty
            </div>
          )}
          {p.queue.map((t, i) => (
            <div
              key={t.id}
              className={`group flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/[0.03] cursor-pointer ${
                i === p.currentIndex ? "bg-foreground/[0.05]" : ""
              }`}
              onClick={() => p.setCurrentIndex(i)}
            >
              {t.cover_art_url ? (
                <img
                  src={t.cover_art_url}
                  alt=""
                  className="w-10 h-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-foreground/10 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{t.title}</div>
                <div className="text-xs text-foreground/50 truncate">
                  {t.uploader_name || "Unknown"}
                </div>
              </div>
              <span className="text-xs text-foreground/40">
                {formatTime(t.duration_seconds)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  p.removeFromQueue(t.id);
                }}
                className="p-1.5 opacity-0 group-hover:opacity-100 text-foreground/50 hover:text-foreground"
                aria-label="Remove from queue"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}