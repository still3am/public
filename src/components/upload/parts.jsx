import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useStableAudioSrc } from "@/hooks/useStableAudioSrc";
import { UploadCloud, Music, Play, Pause, Plus, Link2, Loader2, Download, Eye, EyeOff, Music2 } from "lucide-react";

export const fmtBytes = (b) => {
  if (!b) return "";
  if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
};

export const fmtDur = (s) => {
  if (!s) return "--:--";
  const m = Math.floor(s / 60),
    x = Math.floor(s % 60);
  return `${m}:${String(x).padStart(2, "0")}`;
};

export function UploadButton({ icon: Icon, title, sub, onClick, hint }) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 p-5 md:p-6 rounded-3xl border border-border text-left transition hover:shadow-lg hover:-translate-y-0.5 hover:border-foreground/40 hover:bg-foreground/[0.02] active:scale-[0.99]">
      <div className="w-14 h-14 rounded-2xl bg-foreground/[0.06] grid place-items-center group-hover:bg-foreground/[0.1] transition">
        <Icon size={26} />
      </div>
      <div>
        <div className="text-lg font-extrabold tracking-tight">{title}</div>
        <div className="text-sm text-foreground/55 leading-snug mt-0.5 max-w-[20rem]">{sub}</div>
      </div>
      {hint && <div className="text-[10px] uppercase tracking-widest text-foreground/35">{hint}</div>}
    </button>);

}

export function UrlAddRow({ onAdded, disabled }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e?.preventDefault?.();
    if (!url.trim() || loading || disabled) return;
    setLoading(true);
    setErr("");
    try {
      const res = await base44.functions.invoke("urlToAudio", { url: url.trim() });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      if (!data.file_url) throw new Error("No file returned");
      onAdded({ url: data.file_url, file_name: data.filename || "from-url.mp3", size: data.size || 0 });
      setUrl("");
    } catch (e2) {
      setErr(e2.message || "Could not convert URL");
    } finally {
      setLoading(false);
    }
  }

  return null;























}

export function PreviewButton({ item }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  const src = useStableAudioSrc(item);
  if (!src) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        const a = ref.current;
        if (!a) return;
        if (playing) {
          a.pause();
          setPlaying(false);
        } else {
          a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        }
      }}
      className="p-1.5 rounded-full border border-border hover:bg-foreground/[0.04] shrink-0">
      {playing ? <Pause size={14} /> : <Play size={14} />}
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden" />
      
    </button>);

}

export function AudioVerify({ item }) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(item?.duration || 0);
  const ref = useRef(null);
  const src = useStableAudioSrc(item);
  if (!src) return null;
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (playing) a.pause();else
    a.play().catch(() => {});
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-foreground/25 bg-foreground/[0.02]">
      <button
        type="button"
        onClick={toggle}
        className="w-10 h-10 rounded-full bg-foreground text-background grid place-items-center shrink-0 active:scale-90 transition"
        aria-label={playing ? "Pause" : "Play"}>
        {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground/70 mb-1.5">Play to verify this is the right audio</div>
        <div className="relative h-1.5 bg-foreground/15 rounded-full">
          <div className="absolute left-0 top-0 h-1.5 bg-foreground/70 rounded-full" style={{ width: `${dur ? pos / dur * 100 : 0}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-foreground/40 mt-1">
          <span>{fmtDur(pos)}</span>
          <span>{fmtDur(dur)}</span>
        </div>
      </div>
      <audio
        ref={ref}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
        onTimeUpdate={(e) => setPos(e.target.currentTime || 0)}
        onLoadedMetadata={(e) => setDur(e.target.duration || item?.duration || 0)}
        className="hidden" />
      
    </div>);

}

export function DropZone({ children, onPick, disabled }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const files = e.dataTransfer?.files;
        if (files?.length) onPick(files);
      }}
      onClick={() => !disabled && onPick?.()}
      className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition ${
      over ? "border-foreground bg-foreground/[0.04]" : "border-border hover:bg-foreground/[0.02]"} ${
      disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {children}
    </div>);

}

export function AdvancedFields({ it, i, updateItem, separate }) {
  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      <div className="flex gap-2 flex-wrap">
        {separate &&
        <label className="text-xs px-2 py-1 rounded border border-border cursor-pointer flex items-center gap-1">
            <Music2 size={12} /> {it.cover ? it.cover.name : "Cover art"}
            <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) updateItem(i, { cover: f });
            }} />
          
          </label>
        }
        <input
          value={it.artist}
          onChange={(e) => updateItem(i, { artist: e.target.value })}
          placeholder="Artist (defaults to your name)"
          className="flex-1 min-w-[10rem] px-2 py-1 rounded border border-border text-xs" />
        
      </div>
      <input
        value={it.description}
        onChange={(e) => updateItem(i, { description: e.target.value })}
        placeholder="Description (optional)"
        className="w-full px-2 py-1 rounded border border-border text-xs" />
      
      <textarea
        value={it.lyrics}
        onChange={(e) => updateItem(i, { lyrics: e.target.value })}
        placeholder="Lyrics (optional)"
        rows={3}
        className="w-full px-2 py-1 rounded border border-border text-xs font-mono" />
      
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!it.explicit} onChange={(e) => updateItem(i, { explicit: e.target.checked })} />
          Explicit
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!it.downloadable} onChange={(e) => updateItem(i, { downloadable: e.target.checked })} />
          <Download size={12} /> Allow download
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={!!it.is_published} onChange={(e) => updateItem(i, { is_published: e.target.checked })} />
          {it.is_published ? <Eye size={12} /> : <EyeOff size={12} />} {it.is_published ? "Public" : "Draft"}
        </label>
      </div>
    </div>);

}

export function PublishBar({ rights, setRights, onPublish, publishing, progress, label, canPublish, albumVisibility, setAlbumPublish }) {
  return (
    <div className="flex flex-col gap-3">
      {albumVisibility !== null &&
      <label className="flex items-center gap-2 text-sm">
          {albumVisibility ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="text-foreground/60">Album visibility:</span>
          <input type="checkbox" checked={!!albumVisibility} onChange={(e) => setAlbumPublish(e.target.checked)} />
          <span className="text-foreground/60">{albumVisibility ? "Public" : "Draft (visible only to you)"}</span>
        </label>
      }
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
        I confirm I have the rights to share this content on PUBLIC.
      </label>
      {publishing &&
      <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
      }
      <button
        onClick={onPublish}
        disabled={!canPublish || publishing}
        className="px-5 py-3 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-40 active:scale-[0.98] transition">
        {publishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {publishing ? `Uploading ${progress}%` : label}
      </button>
      {!canPublish && !publishing &&
      <div className="text-xs text-foreground/40 text-center">Tip: every track needs a title and you must confirm your rights to publish.</div>
      }
    </div>);

}