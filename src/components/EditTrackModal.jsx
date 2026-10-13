import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { GENRES } from "@/lib/audio-utils";
import { Loader2, X, Save, Trash2 } from "lucide-react";
import BottomSheetSelect from "@/components/BottomSheetSelect";

/** @param {any} props */
export default function EditTrackModal({ track, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: track.title || "",
    artist: track.artist || "",
    genre: track.genre || "Other",
    description: track.description || "",
    lyrics_text: track.lyrics_text || "",
    explicit: !!track.explicit,
    is_downloadable: !!track.is_downloadable,
  });
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(track.cover_art_url || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const baseline=useRef(form),artwork=useRef(null),writeLock=useRef(false),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);

  // Revoke any blob: preview URL when the modal closes so picking a new cover
  // repeatedly doesn't leak object URLs.
  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) {
        try { URL.revokeObjectURL(coverPreview); } catch {}
      }
    };
  }, [coverPreview]);

  function patch(p) {
    setForm((f) => ({ ...f, ...p }));
  }

  function pickCover(file) {
    if(!file?.type.startsWith("image/")||file.size>10*1024*1024||writeLock.current)return;
    setCover(file);
    if (coverPreview?.startsWith("blob:")) {
      try { URL.revokeObjectURL(coverPreview); } catch {}
    }
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!form.title.trim()||writeLock.current) return;
    writeLock.current=true;setSaving(true);
    try {
      const normalized={...form,title:form.title.trim(),artist:(form.artist||'').trim()};
      const payload=Object.fromEntries(Object.entries(normalized).filter(([key,value])=>value!==baseline.current[key]));
      if(cover){
        if(artwork.current?.file!==cover){const result=await base44.integrations.Core.UploadFile({file:cover});if(!result?.file_url)throw Error('Artwork did not upload');artwork.current={file:cover,url:result.file_url};}
        payload.cover_art_url=artwork.current.url;
      }
      if(!alive.current)return;
      if(!Object.keys(payload).length){onClose();return;}
      const saved=await base44.entities.Track.update(track.id,payload);
      if(alive.current){onSaved?.(saved?.id?saved:{...track,...payload});onClose();}
    } catch (e) {
      // Keep the draft and uploaded artwork ready for another attempt.
    } finally {
      writeLock.current=false;if(alive.current)setSaving(false);
    }
  }

  async function del() {
    if(writeLock.current||!window.confirm("Delete this track permanently? This cannot be undone."))return;
    writeLock.current=true;setDeleting(true);
    try {
      await base44.entities.Track.delete(track.id);
      if(alive.current){onDeleted?.();onClose();}
    } catch {
      // Keep the track and the delete control available if the request fails.
    } finally {
      writeLock.current=false;if(alive.current)setDeleting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit track" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose?.();}}} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl w-full max-w-lg p-5 my-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold tracking-tight">Edit track</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-foreground/5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex gap-3 items-end">
            <label className="w-24 h-24 rounded-xl overflow-hidden bg-foreground/10 grid place-items-center text-xs text-foreground/40 cursor-pointer shrink-0 relative">
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                "Cover"
              )}
              <input
                aria-label="Choose track cover" disabled={saving||deleting}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];e.target.value="";
                  if (f) pickCover(f);
                }}
              />
            </label>
            <div className="flex-1 space-y-2">
              <input
                aria-label="Track title" disabled={saving||deleting}
            value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Track title"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none"
              />
              <input
                aria-label="Artist name" disabled={saving||deleting}
            value={form.artist}
                onChange={(e) => patch({ artist: e.target.value })}
                placeholder="Artist (defaults to your name)"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none"
              />
            </div>
          </div>

          <BottomSheetSelect
            value={form.genre}
            options={GENRES}
            onChange={(v) => patch({ genre: v })}
            className="w-full"
          />

          <textarea
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none"
          />

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.explicit}
                onChange={(e) => patch({ explicit: e.target.checked })}
              />
              Explicit content
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_downloadable}
                onChange={(e) => patch({ is_downloadable: e.target.checked })}
              />
              Allow downloads
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-foreground/50 mb-1">
              Lyrics
            </div>
            <textarea
              value={form.lyrics_text}
              onChange={(e) => patch({ lyrics_text: e.target.value })}
              placeholder="Paste full lyrics here (one line per lyric line)"
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-between pt-3 border-t border-border mt-3">
            <button
              onClick={del}
              disabled={deleting}
              className="px-4 py-2 rounded-full text-sm font-semibold text-red-600 border border-red-200 flex items-center gap-2 disabled:opacity-40"
            >
              {deleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Delete
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-border text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}