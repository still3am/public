import { ListPlus, Tag, Download, Trash2 } from "lucide-react";

function Action({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition disabled:opacity-35 ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/70 hover:bg-foreground/[0.06]"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

export default function LibrarySelectionBar({
  count,
  onDone,
  onPlaylist,
  onTag,
  onOffline,
  onRemove,
}) {
  const disabled = count === 0;
  return (
    <div className="sticky top-0 z-40 -mx-3 md:mx-0 mb-4 top-bar-safe bg-background/85 backdrop-blur border-b border-border">
      <div className="flex items-center gap-1 px-3 py-2">
        <button
          onClick={onDone}
          className="text-xs font-bold text-foreground/70 hover:text-foreground px-1"
          aria-label="Exit selection"
        >
          Done
        </button>
        <span className="text-sm font-extrabold flex-1 truncate">
          {count} selected
        </span>
        <Action icon={ListPlus} label="Playlist" onClick={onPlaylist} disabled={disabled} />
        <Action icon={Tag} label="Tag" onClick={onTag} disabled={disabled} />
        <Action icon={Download} label="Offline" onClick={onOffline} disabled={disabled} />
        <Action icon={Trash2} label="Remove" onClick={onRemove} danger disabled={disabled} />
      </div>
    </div>
  );
}