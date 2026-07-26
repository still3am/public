import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import {
  AUDIO_ACCEPT,
  getAudioDuration,
  deriveDefaultTitle,
  deriveDefaultArtist,
  extractEmbeddedTitle,
  extractEmbeddedArtist,
  extractEmbeddedCover,
} from "@/lib/audio-utils";
import BackHeader from "@/components/BackHeader";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import { UploadCloud, Loader2 } from "lucide-react";

let idc = 0;

export default function Upload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback(async (files) => {
    const list = Array.from(files).filter(
      (f) =>
        f.type.startsWith("audio") ||
        /\.(mp3|wav|m4a|ogg|flac|aac|opus|aiff|webm)$/i.test(f.name)
    );
    if (!list.length) return;
    const newItems = await Promise.all(
      list.map(async (file) => {
        const [dur, title, artist, cover] = await Promise.all([
          getAudioDuration(file),
          extractEmbeddedTitle(file),
          extractEmbeddedArtist(file),
          extractEmbeddedCover(file),
        ]);
        return {
          id: ++idc,
          file,
          title: title || deriveDefaultTitle(file),
          artist: artist || deriveDefaultArtist(file),
          genre: "Other",
          duration: dur,
          coverFile: cover || null,
          coverPreviewUrl: cover ? URL.createObjectURL(cover) : "",
          explicit: false,
          is_published: true,
          rights_confirmed: false,
          status: "editing",
          error: "",
        };
      })
    );
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  function updateItem(id, patch) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function uploadOne(item) {
    if (!item.title.trim()) {
      updateItem(item.id, { error: "Title is required" });
      return false;
    }
    if (!item.genre) {
      updateItem(item.id, { error: "Pick a genre" });
      return false;
    }
    if (!item.rights_confirmed) {
      updateItem(item.id, { error: "Confirm you own the rights" });
      return false;
    }
    updateItem(item.id, { status: "uploading", error: "" });
    try {
      const audioRes = await base44.integrations.Core.UploadFile({
        file: item.file,
      });
      let coverUrl = "";
      if (item.coverFile) {
        const coverRes = await base44.integrations.Core.UploadFile({
          file: item.coverFile,
        });
        coverUrl = coverRes.file_url;
      }
      await base44.entities.Track.create({
        title: item.title.trim(),
        audio_url: audioRes.file_url,
        cover_art_url: coverUrl,
        uploader_id: user.id,
        uploader_name: user.display_name || user.full_name || "",
        uploader_avatar_url: user.avatar_url || "",
        artist: item.artist.trim(),
        genre: item.genre,
        duration_seconds: item.duration || 0,
        explicit: item.explicit,
        rights_confirmed: true,
        is_published: item.is_published,
      });
      updateItem(item.id, { status: "done" });
      return true;
    } catch (err) {
      updateItem(item.id, {
        status: "error",
        error: err?.message || "Upload failed",
      });
      return false;
    }
  }

  async function uploadAll() {
    const pending = items.filter(
      (it) => it.status === "editing" || it.status === "error"
    );
    if (!pending.length) return;
    setBusy(true);
    let ok = 0;
    for (const it of pending) {
      const success = await uploadOne(it);
      if (success) ok++;
    }
    setBusy(false);
    if (ok) toast({ title: `${ok} track${ok !== 1 ? "s" : ""} uploaded` });
  }

  const anyPending = items.some(
    (it) => it.status === "editing" || it.status === "error"
  );

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-0 pb-24">
      <BackHeader title="Upload" />
      <FileDropZone onFiles={addFiles} inputRef={inputRef} />
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {items.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-foreground/60">
              {items.length} file{items.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={uploadAll}
              disabled={!anyPending || busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-40 active:scale-95 transition"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <UploadCloud size={15} />
              )}
              Upload all
            </button>
          </div>
          {items.map((it) => (
            <UploadItem
              key={it.id}
              item={it}
              onChange={(patch) => updateItem(it.id, patch)}
              onRemove={() => removeItem(it.id)}
              onUpload={() => uploadOne(it)}
              disabled={busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}