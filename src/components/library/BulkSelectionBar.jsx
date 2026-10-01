import { Check, Download, ListMusic, Trash2, X } from "lucide-react";

function Action({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold transition disabled:opacity-40 shrink-0 ${
        danger ? "text-destructive hover:bg-destructive/15" : "text-background/85 hover:bg-background/10"
      }`}
    >
      <Icon size={14} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function BulkSelectionBar({
  count,
  allSelected,
  busyLabel,
  onToggleAll,
  onAddToPlaylist,
  onDownload,
  onRemove,
  onCancel,
}) {
  return (
    <div className="fixed left-0 right-0 z-[55] px-3 selection-bar-bottom pointer-events-none">
      <div className="max-w-5xl mx-auto rounded-2xl bg-foreground text-background shadow-2xl px-2.5 py-2 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleAll}
          disabled={!!busyLabel}
          className="inline-flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-full hover:bg-background/10 transition shrink-0 disabled:opacity-50"
        >
          <span
            className={`w-5 h-5 rounded-full grid place-items-center border-2 ${
              allSelected ? "bg-background text-foreground border-background" : "border-background/50"
            }`}
          >
            {allSelected && <Check size={12} strokeWidth={3} />}
          </span>
          <span className="text-xs font-bold whitespace-nowrap">
            {allSelected ? "Clear" : "Select all"}
          </span>
        </button>

        <span className="text-xs font-semibold text-background/60 shrink-0 tabular-nums">
          {busyLabel || `${count} selected`}
        </span>

        <div className="flex-1 flex items-center justify-end gap-1 overflow-x-auto no-scrollbar">
          <Action
            icon={ListMusic}
            label="Playlist"
            onClick={onAddToPlaylist}
            disabled={!count || !!busyLabel}
          />
          <Action
            icon={Download}
            label="Offline"
            onClick={onDownload}
            disabled={!count || !!busyLabel}
          />
          <Action
            icon={Trash2}
            label="Remove"
            onClick={onRemove}
            disabled={!count || !!busyLabel}
            danger
          />
        </div>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel selection"
          className="shrink-0 w-9 h-9 rounded-full grid place-items-center hover:bg-background/10 transition"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}