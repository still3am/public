import MusicVideoPicker from "@/components/upload/MusicVideoPicker";
import AlbumMetadataFields from "@/components/upload/AlbumMetadataFields";
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {reportActionError} from "@/lib/actionError";
import { GENRES } from "@/lib/audio-utils";
import { Loader2, X, Save, Trash2 } from "lucide-react";
import BottomSheetSelect from "@/components/BottomSheetSelect";

/** @param {any} props */
export default function EditTrackModal({ track, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: track.title || "",
    artist: track.artist || "",
    album_name:track.album_name||"",album_artist:track.album_artist||"",track_number:track.track_number||0,disc_number:track.disc_number||0,release_year:track.release_year||0,
    genre: track.genre || "Other",
    description: track.description || "",
    explicit: !!track.explicit,
    is_downloadable: !!track.is_downloadable,
  });
  const [cover, setCover] = useState(null);
  const [videoFile,setVideoFile]=useState(null),[videoRemoved,setVideoRemoved]=useState(false),[videoRights,setVideoRights]=useState(false);
  const videoUpload=useRef(null);
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
    if (!form.title.trim()||writeLock.current||(videoFile&&!videoRights)) return;
    writeLock.current=true;setSaving(true);
    try {
      const normalized={...form,title:form.title.trim(),artist:(form.artist||'').trim()};
      const payload=Object.fromEntries(Object.entries(normalized).filter(([key,value])=>value!==(key==='title'||key==='artist'?String(baseline.current[key]||'').trim():baseline.current[key])));
      if(cover){
        if(artwork.current?.file!==cover){const result=await base44.integrations.Core.UploadFile({file:cover});if(!result?.file_url)throw Error('Artwork did not upload');artwork.current={file:cover,url:result.file_url};}
        payload.cover_art_url=artwork.current.url;
      }
      if(videoFile){
        if(videoUpload.current?.file!==videoFile){const uploaded=await base44.integrations.Core.UploadPrivateFile({file:videoFile});if(!uploaded?.file_uri)throw Error('Video did not upload');videoUpload.current={file:videoFile,uri:uploaded.file_uri};}
        payload.music_video_file_uri=videoUpload.current.uri;payload.video_rights_confirmed=true;
      }else if(videoRemoved)payload.music_video_file_uri='';
      if(!alive.current)return;
      if(!Object.keys(payload).length){onClose();return;}
      const saved=await base44.entities.Track.update(track.id,payload);
      if(alive.current){onSaved?.(saved?.id?saved:{...track,...payload});onClose();}
    } catch (e) {
      reportActionError(e,"Couldn’t save this track. Your draft is still here.");
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
    } catch(error) {
      reportActionError(error,"Couldn’t delete this track. Please try again.");
    } finally {
      writeLock.current=false;if(alive.current)setDeleting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit track" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose?.();}}} className="edit-track-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm">
      <div className="edit-track-panel bg-card shadow-2xl">
        <div className="edit-track-header">
          <div><p className="eyebrow text-muted-foreground">Your music</p><h2 className="text-xl font-bold tracking-tight mt-1">Edit song</h2></div>
          <button
            onClick={onClose}
            className="edit-track-close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="edit-track-body space-y-5">
          <div className="edit-track-metadata flex gap-4 items-center">
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
            <div className="flex-1 min-w-0 space-y-3">
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

          <AlbumMetadataFields value={form} onChange={patch} disabled={saving||deleting}/>
          <BottomSheetSelect
            label="Genre" disabled={saving||deleting}
            value={form.genre}
            options={GENRES}
            onChange={(v) => patch({ genre: v })}
            className="w-full"
          />

          <MusicVideoPicker file={videoFile} existing={!videoRemoved&&!!(track.music_video_file_uri||track._has_music_video)} disabled={saving||deleting} onChange={file=>{setVideoFile(file);setVideoRights(false);}} onRemoveExisting={()=>setVideoRemoved(true)} />
          {videoFile&&<label className="flex items-start gap-2 text-xs leading-relaxed"><input type="checkbox" checked={videoRights} onChange={event=>setVideoRights(event.target.checked)} disabled={saving||deleting}/>I own or have permission to distribute this video.</label>}
          <textarea
            aria-label="Track description" disabled={saving||deleting}
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none"
          />

          <div className="edit-track-options">
            <label className="flex items-center gap-2 text-sm">
              <input
                disabled={saving||deleting}
                type="checkbox"
                checked={form.explicit}
                onChange={(e) => patch({ explicit: e.target.checked })}
              />
              Explicit content
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                disabled={saving||deleting}
                type="checkbox"
                checked={form.is_downloadable}
                onChange={(e) => patch({ is_downloadable: e.target.checked })}
              />
              Allow downloads
            </label>
          </div>


        </div>
          <footer className="edit-track-footer">
            <button
              onClick={del}
              disabled={saving||deleting}
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
                disabled={saving||deleting||!form.title.trim()||(!!videoFile&&!videoRights)}
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
          </footer>
      </div>
    </div>
  );
}