import {
  CheckCheck,
  X,
  UploadCloud,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Clock } from
"lucide-react";
import GenrePicker from "@/components/GenrePicker";
import ReleaseChecklist from "@/components/upload/ReleaseChecklist";
import CoverPicker from "@/components/upload/CoverPicker";
import { ensureHighResCover } from "@/lib/coverImage";
import { formatTime } from "@/lib/audio-utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function UploadItem({
  item,
  onChange,
  onRemove,
  onUpload,
  disabled,
  isAdmin = false
}) {
  const uploading = item.status === "uploading";
  const enhancing = item.status === "enhancing";
  const done = item.status === "done";

  const hasArtist = !!item.artist.trim();
  const hasGenre = !!item.genre;
  const hasCover = !!item.coverFile;
  const meetsRules = hasArtist && hasGenre && hasCover;
  const locked = uploading || done;

  const toggles = [
  { key: "explicit", label: "Explicit", icon: null },
  { key: "aiLyrics", label: "AI lyrics", icon: Sparkles }];


  return (
    <div
      className={`rounded-2xl overflow-hidden bg-card ring-1 ring-inset transition ${
      done ? "ring-emerald-500/40" : "ring-border"}`
      }>
      
      <div className="p-3 md:p-4 flex flex-col items-center sm:flex-row sm:items-start gap-3 md:gap-4">
        {/* Cover — auto-detected, tap to replace with your own image */}
        <CoverPicker
          previewUrl={item.coverPreviewUrl}
          loading={item.status === "analyzing"}
          disabled={locked}
          onPick={async (file) => {
          const hi = await ensureHighResCover(file);
          onChange({ coverFile: hi, coverPreviewUrl: URL.createObjectURL(hi) });
          }} />

        {/* Fields */}
        <div className="w-full flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <Input
                value={item.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Track title"
                className="h-10 font-bold text-[15px] border-0 bg-foreground/[0.04] focus-visible:bg-foreground/[0.07]"
                disabled={locked} />
              
              <Input
                value={item.artist}
                onChange={(e) => onChange({ artist: e.target.value })}
                placeholder="Artist name"
                className="h-9 border-0 bg-foreground/[0.04] focus-visible:bg-foreground/[0.07]"
                disabled={locked} />
              
            </div>
            <button
              onClick={onRemove}
              className="shrink-0 tap-target rounded-full hover:bg-destructive/10 hover:text-destructive text-foreground/35 transition"
              disabled={uploading}
              aria-label="Remove">
              
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-full sm:max-w-[16rem] flex-1">
              <GenrePicker value={item.genre} onChange={(g) => onChange({ genre: g })} />
            </div>
            

            
          </div>

          <div className="flex flex-wrap gap-1.5">
            {toggles.map(({ key, label, icon: Icon }) =>
            <label
              key={key}
              className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition ring-1 ring-inset hidden ${
              item[key] ?
              "bg-foreground text-background ring-foreground" :
              "bg-transparent text-foreground/55 ring-border hover:bg-foreground/[0.04]"} ${
              locked ? "opacity-60 pointer-events-none" : ""}`}>
              
                <Checkbox
                checked={item[key]}
                onCheckedChange={(v) => onChange({ [key]: !!v })}
                disabled={locked}
                className="h-3.5 w-3.5 rounded-[4px] border-current" />
              
                {Icon && <Icon size={11} />}
                {label}
              </label>
            )}
          </div>

          <ReleaseChecklist
            hasGenre={hasGenre}
            hasArtist={hasArtist}
            hasCover={hasCover}
            isAdmin={isAdmin} />

          {item.dupeOf && !item.dupeOverride &&
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 ring-1 ring-inset ring-amber-500/25">
            <AlertTriangle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex-1 min-w-0 text-xs font-medium text-amber-700 dark:text-amber-400">
              Duplicate of <span className="font-bold">"{item.dupeOf.title}"</span>
              {item.dupeOf.artist ? ` by ${item.dupeOf.artist}` : ""} — already on PUBLIC.
            </div>
            <button
              onClick={() => onChange({ dupeOverride: true })}
              className="shrink-0 text-[11px] font-bold text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:opacity-70 transition">
              Upload anyway
            </button>
          </div>
          }

          

          {item.error &&
          <div className="flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertCircle size={13} /> {item.error}
            </div>
          }
        </div>
      </div>

      {/* Action footer */}
      {done ?
      <div className="flex items-center justify-center gap-2 py-2.5 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCheck size={14} />
          {isAdmin && meetsRules ?
        "Published on PUBLIC" :
        meetsRules ?
        "Submitted for approval" :
        "Saved to your library"}
        </div> :

      <button
        onClick={onUpload}
        disabled={uploading || enhancing || disabled || item.detecting || (!!item.dupeOf && !item.dupeOverride)}
        className={`w-full inline-flex items-center justify-center gap-2 py-3 text-sm font-bold disabled:opacity-50 active:opacity-80 transition ${
          item.dupeOf && !item.dupeOverride
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
            : "bg-foreground text-background"}`}>
        
          {item.detecting ?
        <><Loader2 size={15} className="animate-spin" /> Analyzing…</> :
        item.dupeOf && !item.dupeOverride ?
        <><AlertTriangle size={15} /> Duplicate detected</> :
        uploading || enhancing ?
        <Loader2 size={15} className="animate-spin" /> :
        <UploadCloud size={15} />
        }
          {item.detecting ?
        "" :
        item.dupeOf && !item.dupeOverride ?
        "" :
        enhancing ?
        "Enhancing with AI…" :
        uploading ?
        "Uploading…" :
        meetsRules ?
        isAdmin ?
        "Publish on PUBLIC" :
        "Submit for approval" :
        "Save to library"}
        </button>
      }
    </div>);

}