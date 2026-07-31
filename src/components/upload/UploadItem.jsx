import { Link } from "react-router-dom";
import {
  CheckCheck,
  X,
  UploadCloud,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
  ExternalLink,
} from "lucide-react";
import GenrePicker from "@/components/GenrePicker";
import ReleaseChecklist from "@/components/upload/ReleaseChecklist";
import CoverPicker from "@/components/upload/CoverPicker";
import { formatTime } from "@/lib/audio-utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

function DoneCard({ item, isAdmin, onRemove }) {
  const meets = !!(item.artist?.trim() && item.genre && item.coverFile);
  const label = meets
    ? isAdmin
      ? "Published on PUBLIC"
      : "Submitted for approval"
    : "Saved to your library";

  return (
    <div className="rounded-3xl bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/25 overflow-hidden transition">
      <div className="p-3 md:p-4 flex items-center gap-3">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-foreground/10 grid place-items-center shrink-0 ring-1 ring-inset ring-border">
          {item.coverPreviewUrl ? (
            <img src={item.coverPreviewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <CheckCheck size={22} className="text-emerald-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {label}
          </div>
          <div className="font-bold text-sm truncate">{item.title || "Untitled"}</div>
          <div className="text-xs text-foreground/55 truncate">{item.artist || "Unknown"}</div>
        </div>
        {item.trackId && (
          <Link
            to={`/track/${item.trackId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-foreground text-background text-xs font-bold active:scale-95 transition shrink-0"
          >
            View track <ExternalLink size={13} />
          </Link>
        )}
        <button
          onClick={onRemove}
          className="p-2 rounded-full text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default function UploadItem({
  item,
  onChange,
  onRemove,
  onUpload,
  disabled,
  isAdmin = false,
}) {
  if (item.status === "done") return <DoneCard item={item} isAdmin={isAdmin} onRemove={onRemove} />;

  const analyzing = item.status === "analyzing";
  const uploading = item.status === "uploading";
  const enhancing = item.status === "enhancing";
  const locked = analyzing || uploading || enhancing;

  const hasArtist = !!item.artist.trim();
  const hasGenre = !!item.genre;
  const hasCover = !!item.coverFile;
  const meetsRules = hasArtist && hasGenre && hasCover;

  const toggles = [
    { key: "explicit", label: "Explicit" },
    { key: "aiLyrics", label: "AI lyrics", icon: Sparkles },
  ];

  return (
    <div className="rounded-3xl bg-card ring-1 ring-inset ring-border overflow-hidden transition">
      <div className="p-3 md:p-4 flex gap-3 md:gap-4">
        <CoverPicker
          previewUrl={item.coverPreviewUrl}
          loading={analyzing}
          disabled={locked}
          onPick={(file) =>
            onChange({ coverFile: file, coverPreviewUrl: URL.createObjectURL(file) })
          }
        />

        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <Input
                value={item.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Track title"
                className="h-10 font-bold text-[15px] border-0 bg-foreground/[0.04] focus-visible:bg-foreground/[0.07]"
                disabled={locked}
              />
              <Input
                value={item.artist}
                onChange={(e) => onChange({ artist: e.target.value })}
                placeholder="Artist name"
                className="h-9 border-0 bg-foreground/[0.04] focus-visible:bg-foreground/[0.07]"
                disabled={locked}
              />
            </div>
            <button
              onClick={onRemove}
              className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive text-foreground/35 transition"
              disabled={uploading || enhancing}
              aria-label="Remove"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="max-w-[16rem] flex-1 min-w-[10rem]">
              <GenrePicker value={item.genre} onChange={(g) => onChange({ genre: g })} />
            </div>
            {item.duration > 0 && (
              <span className="px-2.5 py-2 rounded-lg text-[11px] font-bold bg-foreground/[0.05] text-foreground/60 whitespace-nowrap">
                {formatTime(item.duration)}
              </span>
            )}
            {item.detecting && !locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-bold bg-violet-500/10 text-purple-600 dark:text-violet-300">
                <Wand2 size={12} className="animate-pulse" /> Detecting
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {toggles.map(({ key, label, icon: Icon }) => (
              <label
                key={key}
                className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition ring-1 ring-inset ${
                  item[key]
                    ? "bg-foreground text-background ring-foreground"
                    : "bg-transparent text-foreground/55 ring-border hover:bg-foreground/[0.04]"
                } ${locked ? "opacity-60 pointer-events-none" : ""}`}
              >
                <Checkbox
                  checked={item[key]}
                  onCheckedChange={(v) => onChange({ [key]: !!v })}
                  disabled={locked}
                  className="h-3.5 w-3.5 rounded-[4px] border-current"
                />
                {Icon && <Icon size={11} />}
                {label}
              </label>
            ))}
          </div>

          <ReleaseChecklist
            hasGenre={hasGenre}
            hasArtist={hasArtist}
            hasCover={hasCover}
            isAdmin={isAdmin}
          />

          {item.error && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle size={13} /> {item.error}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onUpload}
        disabled={analyzing || uploading || enhancing || disabled}
        className="w-full inline-flex items-center justify-center gap-2 py-3 bg-foreground text-background text-sm font-bold disabled:opacity-50 active:opacity-80 transition"
      >
        {analyzing || uploading || enhancing ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <UploadCloud size={15} />
        )}
        {analyzing
          ? "Analyzing audio…"
          : enhancing
          ? "Enhancing with AI…"
          : uploading
          ? "Uploading…"
          : meetsRules
          ? isAdmin
            ? "Publish on PUBLIC"
            : "Submit for approval"
          : "Save to library"}
      </button>
    </div>
  );
}