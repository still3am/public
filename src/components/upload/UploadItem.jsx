import {
  CheckCheck,
  X,
  UploadCloud,
  Loader2,
  AlertCircle,
  Sparkles,
  Clock } from
"lucide-react";
import GenrePicker from "@/components/GenrePicker";
import ReleaseChecklist from "@/components/upload/ReleaseChecklist";
import CoverPicker from "@/components/upload/CoverPicker";
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
      
      <div className="p-3 md:p-4 flex gap-3 md:gap-4">
        {/* Cover — auto-detected, tap to replace with your own image */}
        <CoverPicker
          previewUrl={item.coverPreviewUrl}
          loading={item.status === "analyzing"}
          disabled={locked}
          onPick={(file) =>
          onChange({ coverFile: file, coverPreviewUrl: URL.createObjectURL(file) })
          } />

        {/* Fields */}
        <div className="flex-1 min-w-0 space-y-2.5">
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
              className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive text-foreground/35 transition"
              disabled={uploading}
              aria-label="Remove">
              
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="max-w-[16rem] flex-1">
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
        disabled={uploading || enhancing || disabled}
        className="w-full inline-flex items-center justify-center gap-2 py-3 bg-foreground text-background text-sm font-bold disabled:opacity-50 active:opacity-80 transition">
        
          {uploading || enhancing ?
        <Loader2 size={15} className="animate-spin" /> :

        <UploadCloud size={15} />
        }
          {enhancing ?
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