import { useEffect,useState,useRef } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X, Loader2, ImagePlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

/** @param {any} props */
export default function CreatePlaylistModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock=useRef(false),artwork=useRef(null),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);

  useEffect(()=>()=>{if(coverPreview)URL.revokeObjectURL(coverPreview);},[coverPreview]);
  async function handleCover(file) {
    if(!file?.type.startsWith("image/")||file.size>10*1024*1024||saveLock.current)return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function save() {
    if (!user?.id || !name.trim() || saveLock.current) return;
    saveLock.current=true;setSaving(true);
    try {
      let cover_art_url = "";
      if(coverFile){
        if(artwork.current?.file!==coverFile){const result=await base44.integrations.Core.UploadFile({file:coverFile});if(!result?.file_url)throw Error('Artwork did not upload');artwork.current={file:coverFile,url:result.file_url};}
        cover_art_url=artwork.current.url;
      }
      if(!alive.current)return;
      const pl = await base44.entities.Playlist.create({
        name: name.trim(),
        description: description.trim(),
        creator_id: user.id,
        track_ids: [],
        is_public: isPublic,
        cover_art_url,
      });
      window.dispatchEvent(new Event("playlists:changed"));
      if(alive.current){onCreated?.(pl);onClose();}
    } catch {
      // Keep the name, description, and uploaded artwork ready to retry.
    } finally {
      saveLock.current=false;if(alive.current)setSaving(false);
    }
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="New playlist" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();onClose();}}} className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-card border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto overscroll-contain">
        <div className="md:hidden w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold tracking-tight">New Playlist</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/10" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={event=>{event.preventDefault();save();}}>
          <div className="flex items-center gap-4">
            <label className="relative w-24 h-24 rounded-xl overflow-hidden bg-foreground/[0.06] grid place-items-center cursor-pointer shrink-0 ring-1 ring-inset ring-border">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImagePlus size={22} className="text-foreground/30" />
              )}
              <input
                aria-label="Choose playlist cover" disabled={saving}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];e.target.value="";
                  if (f) handleCover(f);
                }}
              />
            </label>
            <div className="flex-1 min-w-0">
              <input
                aria-label="Playlist name" required disabled={saving} maxLength={160}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Playlist name"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Cover artwork: choose an image up to 10 MB.</p>
          <textarea
            aria-label="Playlist description" disabled={saving} maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description…"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm resize-none"
            rows={2}
          />

          <div className="flex items-center justify-between p-3 rounded-xl bg-foreground/[0.03]">
            <div>
              <div className="text-sm font-semibold">Public</div>
              <div className="text-xs text-foreground/50">Anyone can find and listen</div>
            </div>
            <Switch aria-label="Make playlist public" disabled={saving} checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="w-full h-12 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-40 active:scale-95 transition flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? "Creating…" : "Create"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}