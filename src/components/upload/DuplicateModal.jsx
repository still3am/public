import { useState } from "react";
import { Music2, Loader2, X, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatTime } from "@/lib/audio-utils";

export default function DuplicateModal({ tracks, onClose, onRemove }) {
  const { toast } = useToast();
  const [removing, setRemoving] = useState({});
  const [list, setList] = useState(tracks);

  async function remove(id) {
    setRemoving((s) => ({ ...s, [id]: true }));
    try {
      onRemove?.(id);
      setList((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Removed from upload" });
    } finally {
      setRemoving((s) => ({ ...s, [id]: false }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 grid place-items-center shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold tracking-tight">
              Possible duplicates
            </h3>
            <p className="text-xs text-foreground/60 mt-0.5">
              These tracks you're uploading already exist in your library.
              Remove any you don't want to upload.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {list.length === 0 ? (
            <div className="text-center text-sm text-foreground/50 py-10">
              No duplicates left.
            </div>
          ) : (
            list.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/[0.03]"
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-foreground/10 grid place-items-center shrink-0">
                  {t.coverPreviewUrl ? (
                    <img
                      src={t.coverPreviewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music2 size={16} className="text-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{t.title}</div>
                  <div className="text-xs text-foreground/50 truncate">
                    {t.artist || "Unknown"} · {formatTime(t.duration)}
                  </div>
                </div>
                <button
                  onClick={() => remove(t.id)}
                  disabled={removing[t.id]}
                  className="p-2 rounded-full text-foreground/40 hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                  aria-label="Remove from upload"
                >
                  {removing[t.id] ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}