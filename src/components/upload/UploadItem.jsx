import { useRef } from "react";
import {
  Check,
  CheckCheck,
  X,
  UploadCloud,
  Loader2,
  AlertCircle,
  Music2,
  ImagePlus,
  Sparkles,
  Wand2,
  GripVertical,
} from "lucide-react";
import GenrePicker from "@/components/GenrePicker";
import { formatTime } from "@/lib/audio-utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS = {
  editing: { label: "Queued", tone: "muted" },
  uploading: { label: "Uploading", tone: "active" },
  enhancing: { label: "Enhancing", tone: "active" },
  done: { label: "Done", tone: "ok" },
  error: { label: "Error", tone: "err" },
};

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.editing;
  const toneCls = {
    muted: "text-foreground/50 bg-foreground/5",
    active: "text-foreground bg-foreground/10",
    ok: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    err: "text-destructive bg-destructive/10",
  }[s.tone];
  const spin = s.tone === "active";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 ${toneCls}`}
    >
      {spin ? <Loader2 size={11} className="animate-spin" /> : null}
      {s.label}
    </span>
  );
}

export default function UploadItem({
  item,
  index,
  onChange,
  onRemove,
  onUpload,
  dragHandleProps,
  disabled,
}) {
  const uploading = item.status === "uploading";
  const enhancing = item.status === "enhancing";
  const done = item.status === "done";
  const locked = uploading || enhancing || done;
  const imgInputRef = useRef(null);

  const hasCover = !!(item.coverFile || item.coverPreviewUrl);
  const hasArtist = !!item.artist.trim();
  const hasGenre = !!item.genre;
  const meetsRules = hasCover && hasArtist && hasGenre;

  function pickCover(file) {
    if (!file) return;
    onChange({ coverFile: file, coverPreviewUrl: URL.createObjectURL(file) });
  }

  return (
    <div
      className={`flex gap-2.5 px-3 py-3 transition ${
        done ? "bg-emerald-500/[0.04]" : ""
      }`}
    >
      {/* Queue position + drag handle */}
      <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
        <button
          type="button"
          {...(dragHandleProps || {})}
          className="p-0.5 rounded text-foreground/30 hover:text-foreground/70 hover:bg-foreground/5 cursor-grab active:cursor-grabbing disabled:opacity-30 touch-none"
          disabled={locked || disabled}
          aria-label="Drag to reorder queue"
        >
          <GripVertical size={16} />
        </button>
        <span className="text-[11px] font-bold text-foreground/35 tabular-nums w-5 text-center">
          {index != null ? index + 1 : ""}
        </span>
      </div>

      {/* Cover */}
      <div className="relative w-16 h-16 shrink-0">
        <button
          type="button"
          onClick={() => !locked && imgInputRef.current?.click()}
          disabled={locked}
          className="relative w-full h-full rounded-lg overflow-hidden bg-foreground/10 grid place-items-center group"
          aria-label="Add cover image"
        >
          {item.coverPreviewUrl ? (
            <img
              src={item.coverPreviewUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Music2 size={20} className="text-foreground/30" />
          )}
          {!done && (
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-foreground/75 text-background grid place-items-center shadow ring-2 ring-card">
              <ImagePlus size={11} />
            </span>
          )}
          {done && (
            <div className="absolute inset-0 bg-foreground/55 grid place-items-center">
              <Check size={22} className="text-background" />
            </div>
          )}
        </button>
        <input
          ref={imgInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) pickCover(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <Input
              value={item.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Track title"
              className="h-9 font-semibold"
              disabled={locked}
            />
            <Input
              value={item.artist}
              onChange={(e) => onChange({ artist: e.target.value })}
              placeholder="Artist"
              className="h-9"
              disabled={locked}
            />
          </div>
          <StatusPill status={item.status} />
          <button
            onClick={onRemove}
            className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/40"
            disabled={uploading}
            aria-label="Remove"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[8rem] flex-1 max-w-[14rem]">
            <GenrePicker
              value={item.genre}
              onChange={(g) => onChange({ genre: g })}
            />
          </div>
          <span className="text-xs text-foreground/50 px-1">
            {formatTime(item.duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-2 text-xs font-medium text-foreground/70">
            <Checkbox
              checked={item.explicit}
              onCheckedChange={(v) => onChange({ explicit: !!v })}
              disabled={locked}
            />
            Explicit
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground/70">
            <Checkbox
              checked={item.aiGenre}
              onCheckedChange={(v) => onChange({ aiGenre: !!v })}
              disabled={locked}
            />
            <Wand2 size={12} /> Auto-detect genre
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground/70">
            <Checkbox
              checked={item.aiLyrics}
              onCheckedChange={(v) => onChange({ aiLyrics: !!v })}
              disabled={locked}
            />
            <Sparkles size={12} /> Generate lyrics
          </label>
        </div>

        {/* Release rules: cover + genre + artist are required to go public. */}
        <div className="rounded-lg bg-foreground/[0.03] border border-border/60 px-2.5 py-2 space-y-1.5">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {[
              { ok: hasCover, label: "Cover image" },
              { ok: hasGenre, label: "Genre" },
              { ok: hasArtist, label: "Artist name" },
            ].map((r) => (
              <span
                key={r.label}
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  r.ok
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground/50"
                }`}
              >
                {r.ok ? <Check size={12} /> : <X size={12} />}
                {r.label}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-foreground/55 leading-snug">
            {meetsRules
              ? "Eligible for public release — an admin will review before it goes live."
              : "Saving to your library only. Add a cover image, genre, and artist name to release it on PUBLIC."}
          </p>
        </div>

        {item.error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle size={13} /> {item.error}
          </div>
        )}

        {done && (
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1">
            <CheckCheck size={14} />{" "}
            {meetsRules ? "Submitted for approval" : "Saved to your library"}
          </div>
        )}
        {!done && (
          <button
            onClick={onUpload}
            disabled={locked || disabled}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-50 active:scale-95 transition"
          >
            {uploading || enhancing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <UploadCloud size={15} />
            )}
            {enhancing
              ? "Enhancing…"
              : uploading
              ? "Uploading…"
              : meetsRules
              ? "Submit for approval"
              : "Save to library"}
          </button>
        )}
      </div>
    </div>
  );
}