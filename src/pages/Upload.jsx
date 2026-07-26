import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import {
  AUDIO_ACCEPT,
  getAudioDuration,
  deriveDefaultTitle,
  extractEmbeddedTitle,
  extractEmbeddedArtist,
  extractEmbeddedCover,
} from "@/lib/audio-utils";
import { findDuplicateTracks } from "@/lib/duplicateCheck";
import BackHeader from "@/components/BackHeader";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import DuplicateModal from "@/components/upload/DuplicateModal";
import { UploadCloud, Loader2, Plus, CheckCheck } from "lucide-react";

let idc = 0;

export default function Upload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dupes, setDupes] = useState(null);
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
        // Fall back to "Artist - Title" filename pattern when tags are missing.
        let fbTitle = deriveDefaultTitle(file);
        let fbArtist = "";
        const base = file.name.replace(/\.[^.]+$/, "");
        const sep = base.indexOf(" - ");
        if (sep > 0) {
          fbArtist = base.slice(0, sep).replace(/[_-]+/g, " ").trim();
          const t = base.slice(sep + 3).replace(/[_-]+/g, " ").trim();
          if (t) fbTitle = t;
        }
        return {
          id: ++idc,
          file,
          title: title || fbTitle,
          artist: artist || fbArtist,
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
    try {
      const existing = await base44.entities.Track.filter(
        { uploader_id: user.id },
        "-created_date",
        200
      );
      const entries = [];
      const seenExisting = new Set();
      for (const c of newItems) {
        const dups = findDuplicateTracks(existing, {
          title: c.title,
          artist: c.artist,
          duration: c.duration,
          file_name: c.file.name,
        });
        if (dups.length) {
          entries.push({ id: c.id, item: c, existing: dups[0] });
          for (const d of dups) seenExisting.add(d.id);
        }
      }
      if (entries.length) setDupes(entries);
    } catch {}
  }, [user]);

  function updateItem(id, patch) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function markDone(id) {
    updateItem(id, { status: "done" });
    setTimeout(
      () => setItems((prev) => prev.filter((it) => it.id !== id)),
      1200
    );
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
      markDone(item.id);
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
    setProgress({ done: 0, total: pending.length });
    let ok = 0;
    for (let i = 0; i < pending.length; i++) {
      const success = await uploadOne(pending[i]);
      if (success) ok++;
      setProgress({ done: i + 1, total: pending.length });
    }
    setBusy(false);
    if (ok) toast({ title: `${ok} track${ok !== 1 ? "s" : ""} uploaded` });
  }

  function clearDone() {
    setItems((prev) => prev.filter((it) => it.status !== "done"));
  }

  const anyPending = items.some(
    (it) => it.status === "editing" || it.status === "error"
  );
  const doneCount = items.filter((it) => it.status === "done").length;

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
          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
            <div className="text-sm font-semibold text-foreground/60">
              {items.length} file{items.length !== 1 ? "s" : ""}
              {doneCount > 0 && (
                <span className="text-foreground/40 font-normal">
                  {" "}
                  · {doneCount} published
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {doneCount > 0 && (
                <button
                  onClick={clearDone}
                  className="text-xs font-medium text-foreground/50 hover:text-foreground px-2 py-1.5 rounded-full hover:bg-foreground/5 transition"
                >
                  Clear published
                </button>
              )}
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-foreground/5 transition disabled:opacity-40"
              >
                <Plus size={14} /> Add more
              </button>
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
                {busy
                  ? `Uploading ${progress.done}/${progress.total}`
                  : "Upload all"}
              </button>
            </div>
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

      {dupes && (
        <DuplicateModal
          entries={dupes}
          onClose={() => setDupes(null)}
          onRemoveQueue={(qid) => {
            removeItem(qid);
            setDupes((prev) =>
              prev ? prev.filter((e) => e.id !== qid) : prev
            );
          }}
          onExistingDeleted={(exId) =>
            setDupes((prev) =>
              prev ? prev.filter((e) => e.existing.id !== exId) : prev
            )
          }
        />
      )}
    </div>
  );
}