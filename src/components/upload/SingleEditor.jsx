import { useState, useRef, useMemo } from "react";
import { AUDIO_ACCEPT } from "@/lib/audio-utils";
import GenrePicker from "@/components/GenrePicker";
import { UrlAddRow, AudioVerify, fmtBytes, fmtDur } from "@/components/upload/parts";
import { UploadCloud, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Loader2, X, Plus, ListMusic, ChevronUp, ChevronDown } from "lucide-react";

export default function SingleEditor({
  item, index, count, onPrev, onNext, update, rights, setRights,
  publishing, onPublish, onPublishAll, canPublish, progress,
  onPickFile, onAddUrl, onClear, onAddMore
}) {
  if (!item) return <DropZoneHelper onPickFile={onAddMore} onAddUrl={onAddUrl} />;
  return (
    <SingleForm
      item={item}
      update={update}
      rights={rights}
      setRights={setRights}
      publishing={publishing}
      onPublish={onPublish}
      onPublishAll={onPublishAll}
      canPublish={canPublish}
      progress={progress}
      count={count}
      onPickFile={onPickFile}
      onAddUrl={onAddUrl}
      onClear={onClear}
      onAddMore={onAddMore}
      index={index}
      onPrev={onPrev}
      onNext={onNext}
    />
  );
}

function DropZoneHelper({ onPickFile, onAddUrl }) {
  const inputRef = useRef(null);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) onPickFile(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-border rounded-3xl p-10 text-center cursor-pointer hover:bg-foreground/[0.02]">
        <UploadCloud size={28} className="mx-auto text-foreground/40 mb-2" />
        <p className="text-sm font-medium">Drop an audio file or click to browse</p>
        <p className="text-xs text-foreground/40 mt-1">or paste a URL below</p>
      </div>
      <div className="mt-3">
        <UrlAddRow onAdded={onAddUrl} />
      </div>
    </div>
  );
}

function ToggleChip({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border transition ${
        active ? "bg-foreground text-background border-foreground" : "border-border text-foreground/60 hover:bg-foreground/[0.04]"
      }`}>
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

function SingleForm({ item, update, rights, setRights, publishing, onPublish, onPublishAll, canPublish, progress, count, onPickFile, onClear, onAddMore, index, onPrev, onNext }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const coverPreview = useMemo(() => {
    if (item.cover_url) return item.cover_url;
    if (item.cover) return URL.createObjectURL(item.cover);
    return "";
  }, [item.cover_url, item.cover]);
  return (
    <div className="space-y-3">
      {count > 1 && (
        <div className="flex items-center justify-center gap-3 mb-1 text-xs text-foreground/50">
          <button
            type="button"
            onClick={onPrev}
            disabled={index === 0}
            className="p-2 rounded-full border border-border disabled:opacity-30 hover:bg-foreground/[0.04] flex items-center">
            <ChevronLeft size={14} />
          </button>
          <span className="font-semibold">Track {index + 1} of {count}</span>
          <button
            type="button"
            onClick={onNext}
            disabled={index === count - 1}
            className="p-2 rounded-full border border-border disabled:opacity-30 hover:bg-foreground/[0.04] flex items-center">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <label className="w-full sm:w-28 h-28 rounded-2xl overflow-hidden bg-foreground/10 grid place-items-center text-xs text-foreground/40 cursor-pointer shrink-0">
          {coverPreview ? (
            <img src={coverPreview} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="inline-flex flex-col items-center gap-1">
              <UploadCloud size={20} /> Cover
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) update({ cover: f });
            }}
          />
        </label>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={item.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Track title *"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-white text-sm font-semibold"
          />
          <input
            value={item.artist}
            onChange={(e) => update({ artist: e.target.value })}
            placeholder="Artist (defaults to your name)"
            className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
          />
          <GenrePicker value={item.genre} onChange={(g) => update({ genre: g })} />
        </div>
      </div>

      <div className="text-xs text-foreground/40 flex items-center gap-2 flex-wrap">
        <span className="truncate">{item.file_name || "no file"}</span>
        {item.size ? <>· {fmtBytes(item.size)}</> : null}
        {item.duration ? <>· {fmtDur(item.duration)}</> : null}
        {!item.audio_url && !item.file && (
          <button onClick={onPickFile} className="underline text-foreground/60">Choose file</button>
        )}
        {item.audio_url && <span className="ml-1 px-1.5 py-0.5 rounded bg-foreground/10 text-[10px]">From URL</span>}
      </div>

      <AudioVerify item={item} />

      <textarea
        value={item.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <ToggleChip active={!!item.explicit} onClick={() => update({ explicit: !item.explicit })} icon={EyeOff}>
          Explicit
        </ToggleChip>
        <ToggleChip active={!!item.downloadable} onClick={() => update({ downloadable: !item.downloadable })} icon={Download}>
          Allow download
        </ToggleChip>
        <ToggleChip active={!!item.is_published} onClick={() => update({ is_published: !item.is_published })} icon={item.is_published ? Eye : EyeOff}>
          {item.is_published ? "Public" : "Draft"}
        </ToggleChip>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-foreground/50 hover:text-foreground inline-flex items-center gap-1">
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Lyrics & advanced
      </button>
      {showAdvanced && (
        <textarea
          value={item.lyrics}
          onChange={(e) => update({ lyrics: e.target.value })}
          placeholder="Paste the full lyrics — one line per row"
          rows={5}
          className="w-full px-3 py-2 rounded-xl border border-border bg-white text-sm font-mono"
        />
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
        I confirm I have the rights to share this content on PUBLIC.
      </label>

      {publishing && (
        <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      <button
        onClick={count > 1 && onPublishAll ? onPublishAll : onPublish}
        disabled={!canPublish || publishing}
        className="w-full px-5 py-3 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-40 active:scale-[0.98] transition">
        {publishing ? <Loader2 size={16} className="animate-spin" /> : (count > 1 && onPublishAll ? <ListMusic size={16} /> : <UploadCloud size={16} />)}
        {publishing ? `Uploading ${progress}%` : (count > 1 && onPublishAll ? "Publish all tracks" : "Publish track")}
      </button>

      <div className="flex items-center gap-2">
        {onAddMore && (
          <button
            type="button"
            onClick={onAddMore}
            className="flex-1 px-4 py-2.5 rounded-full border border-border text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-foreground/[0.04] transition">
            <Plus size={16} /> Add more
          </button>
        )}
        {onClear && (
          <button
            onClick={onClear}
            className="px-4 py-2.5 rounded-full border border-border text-sm font-semibold flex items-center gap-1 hover:bg-foreground/[0.04] transition">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {!canPublish && !publishing && (
        <div className="text-xs text-foreground/40">Add a title and confirm your rights to enable publish.</div>
      )}
    </div>
  );
}