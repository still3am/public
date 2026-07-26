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
} from "lucide-react";
import GenrePicker from "@/components/GenrePicker";
import { formatTime } from "@/lib/audio-utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

export default function UploadItem({
  item,
  onChange,
  onRemove,
  onUpload,
  disabled,
}) {
  const uploading = item.status === "uploading";
  const done = item.status === "done";
  const imgInputRef = useRef(null);

  function pickCover(file) {
    if (!file) return;
    onChange({ coverFile: file, coverPreviewUrl: URL.createObjectURL(file) });
  }

  return (
    <div
      className={`rounded-2xl border bg-card p-3 md:p-4 transition ${
        done
          ? "border-emerald-300/70 bg-emerald-50/40 dark:bg-emerald-900/10"
          : "border-border"
      }`}
    >
      <div className="flex gap-3">
        <div className="relative w-20 h-20 shrink-0">
          <button
            type="button"
            onClick={() =>
              !uploading && !done && imgInputRef.current?.click()
            }
            disabled={uploading || done}
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
              <Music2 size={22} className="text-foreground/30" />
            )}
            {!done && (
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-foreground/75 text-background grid place-items-center shadow ring-2 ring-card">
                <ImagePlus size={11} />
              </span>
            )}
            {done && (
              <div className="absolute inset-0 bg-foreground/60 grid place-items-center">
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

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <Input
                value={item.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Track title"
                className="h-9 font-semibold"
                disabled={uploading || done}
              />
              <Input
                value={item.artist}
                onChange={(e) => onChange({ artist: e.target.value })}
                placeholder="Artist"
                className="h-9"
                disabled={uploading || done}
              />
            </div>
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
                disabled={uploading || done}
              />
              Explicit
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-foreground/70">
              <Switch
                checked={item.is_published}
                onCheckedChange={(v) => onChange({ is_published: !!v })}
                disabled={uploading || done}
              />
              Public
            </label>
          </div>

          <label className="flex items-start gap-2 text-xs text-foreground/60">
            <Checkbox
              checked={item.rights_confirmed}
              onCheckedChange={(v) => onChange({ rights_confirmed: !!v })}
              disabled={uploading || done}
            />
            <span>
              I own/have rights to this audio and it doesn't violate others' rights.
            </span>
          </label>

          {item.error && (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle size={13} /> {item.error}
            </div>
          )}

          {done && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-1">
              <CheckCheck size={14} /> Published to PUBLIC
            </div>
          )}
          {!done && (
            <button
              onClick={onUpload}
              disabled={uploading || disabled}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-semibold disabled:opacity-50 active:scale-95 transition"
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <UploadCloud size={15} />
              )}
              {uploading ? "Uploading…" : "Upload track"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}