import { CheckSquare, ListPlus, Trash2, FolderMinus, Loader2 } from "lucide-react";

// Bulk edit toolbar for the library: toggles selection mode, then acts on
// everything currently selected.
export default function LibraryBulkBar({
  visible,
  active,
  count,
  canRemove,
  canDelete,
  busy,
  onStart,
  onExit,
  onAddToPlaylist,
  onRemove,
  onDelete,
}) {
  if (!visible) return null;

  if (!active) {
    return (
      <div className="flex justify-end mb-3">
        <button
          onClick={onStart}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border border-border hover:bg-accent transition"
        >
          <CheckSquare size={14} /> Select
        </button>
      </div>
    );
  }

  const actionClass =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border border-border hover:bg-accent transition disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div className="sticky top-2 z-30 mb-4 rounded-2xl border border-border bg-card/95 backdrop-blur px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold mr-auto tabular-nums">
          {count} selected
        </span>
        {busy && <Loader2 size={14} className="animate-spin text-foreground/50" />}
        <button onClick={onAddToPlaylist} disabled={!count || busy} className={actionClass}>
          <ListPlus size={14} /> Add to playlist
        </button>
        {canRemove && (
          <button onClick={onRemove} disabled={busy} className={actionClass}>
            <FolderMinus size={14} /> Remove from library
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border border-destructive/40 text-destructive hover:bg-destructive/10 transition disabled:opacity-40"
          >
            <Trash2 size={14} /> Delete uploads
          </button>
        )}
        <button
          onClick={onExit}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-foreground text-background"
        >
          Done
        </button>
      </div>
    </div>
  );
}