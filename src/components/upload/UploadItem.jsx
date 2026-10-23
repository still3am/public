import CatalogMetadataPicker from '@/components/upload/CatalogMetadataPicker';
import {
  CheckCheck,
  X,
  UploadCloud,
  Loader2,
  AlertCircle,
  Sparkles } from
"lucide-react";
import MusicVideoPicker from "@/components/upload/MusicVideoPicker";
import AlbumMetadataFields from "@/components/upload/AlbumMetadataFields";
import GenrePicker from "@/components/GenrePicker";
import ReleaseChecklist from "@/components/upload/ReleaseChecklist";
import CoverPicker from "@/components/upload/CoverPicker";
import { ensureHighResCover } from "@/lib/coverImage";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

/** @param {any} props */
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
  const locked = uploading || enhancing || done;

  const toggles = [
  { key: "rightsConfirmed", label: "I own or have permission to distribute this audio, artwork, lyrics and any attached video", icon: null },
  { key: "allowDownloads", label: "Allow file downloads", icon: null },
  { key: "explicit", label: "Explicit", icon: null },
  { key: "aiLyrics", label: "AI lyrics", icon: Sparkles }];


  return (
    <div
      className={`upload-item rounded-2xl overflow-hidden bg-card ring-1 ring-inset transition ${
      done ? "ring-emerald-500/40" : "ring-border"}`
      }>
      
      <div className="upload-file-header">
        <div><strong title={item.file?.name}>{item.file?.name || item.title || 'Audio file'}</strong><small>{item.file?.size ? `${(item.file.size / (1024 * 1024)).toFixed(1)} MB` : 'Audio'}{item.duration ? ` · ${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}` : ''}</small></div>
        <span className={`upload-file-status ${!done && item.error ? 'has-error' : ''}`} role="status">{(uploading || enhancing || item.status === 'analyzing' || item.detecting) && !done ? <Loader2 size={12} className="animate-spin"/> : done ? <CheckCheck size={13}/> : null}{done ? 'Complete' : uploading ? 'Uploading' : enhancing ? 'Adding lyrics' : item.status === 'analyzing' ? 'Reading file' : item.error ? 'Needs attention' : item.detecting ? 'Finding details' : 'Review details'}</span>
      </div>
      <div className="p-3 md:p-4 flex flex-col items-center sm:flex-row sm:items-start gap-3 md:gap-4">
        {/* Cover — auto-detected, tap to replace with your own image */}
        <CoverPicker
          previewUrl={item.coverPreviewUrl}
          loading={item.status === "analyzing"}
          disabled={locked}
          onPick={async (file) => {
          const hi = await ensureHighResCover(file);
          if (item.coverPreviewUrl) { try { URL.revokeObjectURL(item.coverPreviewUrl); } catch {} }
          onChange({ coverFile: hi, coverPreviewUrl: URL.createObjectURL(hi) });
          }} />

        {/* Fields */}
        <div className="w-full flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2">
              <Input
                aria-label="Track title" maxLength={200}
                value={item.title}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder="Track title"
                className="h-10 font-bold text-[15px] border-0 bg-foreground/[0.04] focus-visible:bg-foreground/[0.07]"
                disabled={locked} />
              
              <Input
                aria-label="Artist name" maxLength={200}
                value={item.artist}
                onChange={(e) => onChange({ artist: e.target.value })}
                placeholder="Artist name"
                className="h-9 border-0 bg-foreground/[0.04] focus-visible:bg-foreground/[0.07]"
                disabled={locked} />
              
            </div>
            <button
              onClick={onRemove}
              className="shrink-0 tap-target rounded-full hover:bg-destructive/10 hover:text-destructive text-foreground/35 transition"
              disabled={uploading || enhancing}
              aria-label={`Remove ${item.title || "upload"}`}>
              
              <X size={16} />
            </button>
          </div>

          <AlbumMetadataFields value={item} onChange={onChange} disabled={locked}/>
          {!done && <CatalogMetadataPicker item={item} onChange={onChange} disabled={locked || disabled}/>}
          <div className="flex items-center gap-3">
            <div className="w-full sm:max-w-[16rem] flex-1">
              <GenrePicker value={item.genre} onChange={(g) => onChange({ genre: g })} />
            </div>
            

            
          </div>

          <MusicVideoPicker file={item.videoFile} onChange={videoFile=>onChange({videoFile,rightsConfirmed:false})} disabled={locked || disabled} />
          <div className="grid grid-cols-2 gap-2">
            {toggles.map(({ key, label, icon: Icon }) =>
            <label
              key={key}
              className={`upload-option ${key === "rightsConfirmed" ? "col-span-2" : ""} flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium leading-snug cursor-pointer transition ring-1 ring-inset ${
              item[key] ?
              "bg-foreground text-background ring-foreground" :
              "bg-transparent text-foreground/55 ring-border hover:bg-foreground/[0.04]"} ${
              locked ? "opacity-60 pointer-events-none" : ""}`}>
              
                <Checkbox
                checked={item[key]}
                onCheckedChange={(v) => onChange({ [key]: !!v })}
                disabled={locked}
                className="upload-option-checkbox rounded-[4px] border-current shrink-0" />
              
                {Icon && <Icon size={13} className="shrink-0" />}
                <span className="min-w-0">{label}</span>
              </label>
            )}
          </div>

          {item.releaseStatus&&<p className="text-xs font-semibold">Saved · {item.releaseStatus==="approved"?"Published":item.releaseStatus==="pending"?"Awaiting review":"Private"}</p>}
          {!done&&<label className="flex items-start gap-2 text-xs leading-relaxed py-1"><input className="mt-0.5" type="checkbox" checked={!!item.duplicateAcknowledged} onChange={e=>onChange({duplicateAcknowledged:e.target.checked})} disabled={locked}/>If a metadata match appears, I confirm this is a different recording.</label>}
          <ReleaseChecklist
            hasGenre={hasGenre}
            hasArtist={hasArtist}
            hasCover={hasCover}
            isAdmin={isAdmin} />
          

          {item.error &&
          <div role="status" className="flex items-start gap-2 text-xs text-foreground/60 leading-relaxed">
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
        disabled={uploading || enhancing || disabled || item.status==="error"}
        className="upload-item-action flex items-center justify-center gap-2 mx-3 mb-3 px-4 rounded-xl bg-foreground text-background text-xs sm:text-sm font-semibold disabled:opacity-50 active:opacity-80 transition">
        
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