import { useState } from "react";
import { Music2, Trash2, Loader2, X, AlertTriangle, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { formatTime } from "@/lib/audio-utils";

export default function DuplicateModal({
  entries,
  onClose,
  onRemoveQueue,
  onExistingDeleted,
}) {
  const { toast } = useToast();
  const [deleting, setDeleting] = useState({});

  async function delExisting(id) {
    setDeleting((s) => ({ ...s, [id]: true }));
    try {
      await base44.entities.Track.delete(id);
      onExistingDeleted?.(id);
      toast({ title: "Existing track deleted" });
    } catch (e) {
      toast({
        title: "Could not delete",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setDeleting((s) => ({ ...s, [id]: false }));
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
              Some uploads already exist in your library.{" "}
              <span className="inline-flex items-center align-middle text-foreground/70">
                <XCircle size={12} className="mr-1" />
              </span>
              skip the upload, or
              <span className="text-destructive font-medium"> delete </span>
              the existing track to replace it.
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
          {entries.length === 0 ? (
            <div className="text-center text-sm text-foreground/50 py-10">
              No duplicates left.
            </div>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/[0.03]"
              >
                <div className="w-11 h-11 rounded-md overflow-hidden bg-foreground/10 grid place-items-center shrink-0">
                  {e.item.coverPreviewUrl ? (
                    <img
                      src={e.item.coverPreviewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music2 size={16} className="text-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {e.item.title}
                  </div>
                  <div className="text-xs text-foreground/50 truncate">
                    Matches{" "}
                    <span className="font-medium text-foreground/70">
                      {e.existing.title}
                    </span>
                    {e.existing.artist ? ` · ${e.existing.artist}` : ""} ·{" "}
                    {formatTime(e.existing.duration_seconds)}
                  </div>
                </div>
                <button
                  onClick={() => onRemoveQueue?.(e.id)}
                  title="Skip this upload (remove from queue)"
                  aria-label="Skip this upload"
                  className="p-2 rounded-full text-foreground/40 hover:text-foreground hover:bg-foreground/10"
                >
                  <XCircle size={16} />
                </button>
                <button
                  onClick={() => delExisting(e.existing.id)}
                  disabled={deleting[e.existing.id]}
                  title="Delete existing track from your library"
                  aria-label="Delete existing track"
                  className="p-2 rounded-full text-foreground/40 hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                >
                  {deleting[e.existing.id] ? (
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