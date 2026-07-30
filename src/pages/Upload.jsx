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
  extractEmbeddedCover } from
"@/lib/audio-utils";
import { findDuplicateTracks } from "@/lib/duplicateCheck";
import BackHeader from "@/components/BackHeader";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import DuplicateModal from "@/components/upload/DuplicateModal";
import { useLibrary } from "@/context/LibraryContext";
import { UploadCloud, Loader2, Plus, CheckCheck, Wand2 } from "lucide-react";

let idc = 0;

export default function Upload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refresh: refreshLibrary } = useLibrary();
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [dupes, setDupes] = useState(null);
  const inputRef = useRef(null);
  const [classifyBusy, setClassifyBusy] = useState(false);
  const [classifyInfo, setClassifyInfo] = useState(null);

  async function classifyAll() {
    if (classifyBusy) return;
    setClassifyBusy(true);
    setClassifyInfo(null);
    let total = 0;
    try {
      while (true) {
        const res = await base44.functions.invoke("classifyGenres", {});
        const d = res?.data || {};
        total += d.processed || 0;
        setClassifyInfo({ total, done: !d.has_more });
        if (!d.has_more) break;
      }
      toast({ title: `Classified ${total} track${total !== 1 ? "s" : ""}` });
    } catch (err) {
      toast({ title: "Classification failed", variant: "destructive" });
    } finally {
      setClassifyBusy(false);
    }
  }

  const addFiles = useCallback(async (files) => {
    const list = Array.from(files).filter(
      (f) =>
      f.type.startsWith("audio") ||
      /\.(mp3|wav|m4a|ogg|flac|aac|opus|aiff|webm)$/i.test(f.name)
    );
    // Also accept image files dropped alongside audio so we can auto-pair a
    // cover by filename (e.g. "Track.mp3" + "Track.jpg" → cover attached).
    const imageFiles = Array.from(files).filter(
      (f) =>
      f.type.startsWith("image") ||
      /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(f.name)
    );
    const imageByBase = {};
    imageFiles.forEach((img) => {
      const b = img.name.replace(/\.[^.]+$/, "").toLowerCase();
      if (!imageByBase[b]) imageByBase[b] = img;
    });
    if (!list.length && !imageFiles.length) return;
    if (!list.length) return;
    const newItems = await Promise.all(
      list.map(async (file) => {
        const [dur, title, artist, cover] = await Promise.all([
        getAudioDuration(file),
        extractEmbeddedTitle(file),
        extractEmbeddedArtist(file),
        extractEmbeddedCover(file)]
        );
        // Fall back to "Artist - Title" filename pattern when tags are missing.
        let fbTitle = deriveDefaultTitle(file);
        let fbArtist = "";
        const base = file.name.replace(/\.[^.]+$/, "");
        const sep = base.indexOf(" - ");
        if (sep > 0) {
          fbArtist = base.slice(0, sep).replace(/[_-]+/g, " ").trim();
          const t = base.slice(sep + 3).replace(/[_-]+/g, " ").trim();
          if (t) fbTitle = t;
        } else {
          // Try an "Artist-Title" hyphen (no spaces) fallback as well,
          // since many downloads are named that way.
          const h = base.indexOf("-");
          if (h > 0) {
            const a = base.slice(0, h).replace(/[_]+/g, " ").trim();
            const t = base.slice(h + 1).replace(/[_]+/g, " ").trim();
            if (a && t && a !== t) {
              fbArtist = a;
              fbTitle = t;
            }
          }
        }
        // Pair a same-named image file from the drop as the cover when the
        // audio file has no embedded artwork.
        const baseLower = base.toLowerCase();
        const pairFile = !cover ? (imageByBase[baseLower] || null) : null;
        const coverFile = cover || pairFile || null;
        return {
          id: ++idc,
          file,
          title: title || fbTitle,
          artist: artist || fbArtist || user?.display_name || user?.full_name || "",
          genre: "Other",
          duration: dur,
          coverFile,
          coverPreviewUrl: coverFile ? URL.createObjectURL(coverFile) : "",
          explicit: false,
          is_published: false,
          rights_confirmed: false,
          status: "editing",
          error: "",
          aiGenre: true,
          aiLyrics: false
        };
      })
    );
    setItems((prev) => [...prev, ...newItems]);
    // Auto-generate album art for any new track that arrived with no embedded
    // or paired cover so the upload tile is never blank. Runs in the
    // background; the tile re-renders automatically when the image lands.
    for (const n of newItems) {
      if (!n.coverFile) autoGenCover(n);
    }
    try {
      const existing = await base44.entities.Track.filter(
        { uploader_id: user.id },
        "-created_date",
        200
      );
      const found = [];
      const seenItem = new Set();
      for (const c of newItems) {
        const dups = findDuplicateTracks(existing, {
          title: c.title,
          artist: c.artist,
          duration: c.duration,
          file_name: c.file.name
        });
        if (dups.length && !seenItem.has(c.id)) {
          seenItem.add(c.id);
          found.push(c);
        }
      }
      if (found.length) setDupes(found);
    } catch {}
  }, [user]);

  function updateItem(id, patch) {
    setItems((prev) =>
    prev.map((it) => it.id === id ? { ...it, ...patch } : it)
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

  // Burns down title/artist fixes while the file is still uploading.
  // Validation runs before we ever hit the network.
  function validate(item) {
    if (!item.title.trim()) {
      updateItem(item.id, { error: "Title is required" });
      return null;
    }
    if (!item.genre) {
      updateItem(item.id, { error: "Pick a genre" });
      return null;
    }
    // To be released on PUBLIC, a track must have a cover image, a genre, and an artist name.
    // Anything missing is saved to the uploader's own library only (never public).
    const meetsRules =
    !!(item.coverFile || item.coverPreviewUrl) &&
    !!item.artist.trim() &&
    !!item.genre;
    return { meetsRules };
  }

  // Auntie AI jobs run in the background so they never stall the next upload.
  // Lock the track while enhancements are in flight so it doesn't get removed
  // from the list before the truth hits the server.
  async function runEnhancements(item, trackId) {
    if (item.aiGenre) {
      try {await base44.functions.invoke("detectGenre", { track_id: trackId });}
      catch {}
    }
    if (item.aiLyrics) {
      try {
        const lr = await base44.functions.invoke("generateLyrics", { track_id: trackId });
        const text = lr?.data?.lyrics;
        if (text) await base44.entities.Track.update(trackId, { lyrics_text: text.trim() });
      } catch {}
    }
  }

  async function uploadOne(item) {
    const v = validate(item);
    if (!v) return false;
    const { meetsRules } = v;
    updateItem(item.id, { status: "uploading", error: "" });
    try {
      // Upload audio + cover in parallel — they're independent files.
      const [audioRes, coverRes] = await Promise.all([
      base44.integrations.Core.UploadFile({ file: item.file }),
      item.coverFile ?
      base44.integrations.Core.UploadFile({ file: item.coverFile }) :
      Promise.resolve(null)]
      );
      // Admins bypass the approval queue — tracks that meet the public
      // release rules go live on PUBLIC the instant they finish uploading.
      const isAdmin = user?.role === "admin";
      const goLive = isAdmin && meetsRules;
      const created = await base44.entities.Track.create({
        title: item.title.trim(),
        audio_url: audioRes.file_url,
        cover_art_url: coverRes?.file_url || "",
        uploader_id: user.id,
        uploader_name: user.display_name || user.full_name || "",
        uploader_avatar_url: user.avatar_url || "",
        artist: item.artist.trim(),
        genre: item.genre,
        duration_seconds: item.duration || 0,
        explicit: item.explicit,
        rights_confirmed: true,
        is_published: goLive,
        approval_status: goLive ?
        "approved" :
        meetsRules ?
        "pending" :
        "private"
      });

      // Always keep a copy in the uploader's library so they can find/play it
      // while it awaits approval or as a private library-only track.
      try {
        await base44.entities.LibraryItem.create({
          user_id: user.id,
          track_id: created.id
        });
        refreshLibrary();
      } catch {}

      // Track is fully uploaded — mark done now; AI runs in the background.
      markDone(item.id);
      if (item.aiGenre || item.aiLyrics) runEnhancements(item, created.id);
      return true;
    } catch (err) {
      updateItem(item.id, {
        status: "error",
        error: err?.message || "Upload failed"
      });
      return false;
    }
  }

  // Generates AI album art on the fly so uploads that arrive with no embedded
  // or paired cover still get a visible thumbnail. Fire-and-forget per track.
  async function autoGenCover(item) {
    try {
      const prompt =
        `Square album cover art, single panel, no text, no titles, no logos. ` +
        `Bold, evocative aesthetic for a ${item.genre || "music"} track titled ` +
        `"${item.title || "Untitled"}"${item.artist ? ` by ${item.artist}` : ""}. ` +
        `Moody, textured, modern.`;
      const res = await base44.integrations.Core.GenerateImage({ prompt });
      const url = res?.url;
      if (!url) return;
      const resp = await fetch(url);
      const blob = await resp.blob();
      const file = new File([blob], "cover.jpg", {
        type: blob.type || "image/jpeg",
      });
      const preview = URL.createObjectURL(file);
      updateItem(item.id, { coverFile: file, coverPreviewUrl: preview });
    } catch {}
  }

  async function uploadAll() {
    const pending = items.filter(
      (it) => it.status === "editing" || it.status === "error"
    );
    if (!pending.length) return;
    setBusy(true);
    setProgress({ done: 0, total: pending.length });

    // Upload several tracks at once instead of one-by-one. The integration
    // layer handles its own queue; this just keeps more files in flight.
    const CONCURRENCY = 5;
    let done = 0;
    let ok = 0;
    let cursor = 0;
    async function worker() {
      while (cursor < pending.length) {
        const item = pending[cursor++];
        const success = await uploadOne(item);
        if (success) ok++;
        done++;
        setProgress({ done, total: pending.length });
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker)
    );

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
      {user?.role === "admin" &&
      <div className="mb-3 rounded-xl border border-foreground/15 bg-foreground/[0.03] px-3.5 py-2.5 text-xs font-medium text-foreground/70 flex items-center gap-2">
          <CheckCheck size={14} className="shrink-0" />
          Admin uploads skip the approval queue — tracks that have a cover, genre, and artist go live on PUBLIC instantly.
        </div>
      }
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
        }} />
      

      {items.length > 0 &&
      <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
            <div className="text-sm font-semibold text-foreground/60">
              {items.length} file{items.length !== 1 ? "s" : ""}
              {doneCount > 0 &&
            <span className="text-foreground/40 font-normal">
                  {" "}
                  · {doneCount} uploaded
                </span>
            }
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 &&
            <button
              onClick={() => setItems([])}
              disabled={busy}
              className="text-xs font-medium text-foreground/50 hover:text-foreground px-2 py-1.5 rounded-full hover:bg-foreground/5 transition disabled:opacity-40">
              
                  {items.every((it) => it.status === "done") ? "Clear all" : "Delete all"}
                </button>
            }
              <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border hover:bg-foreground/5 transition disabled:opacity-40">
              
                <Plus size={14} /> Add more
              </button>
              <button
              onClick={uploadAll}
              disabled={!anyPending || busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-40 active:scale-95 transition">
              
                {busy ?
              <Loader2 size={15} className="animate-spin" /> :

              <UploadCloud size={15} />
              }
                {busy ?
              `Uploading ${progress.done}/${progress.total}` :
              "Upload all"}
              </button>
            </div>
          </div>
          {items.map((it) =>
        <UploadItem
          key={it.id}
          item={it}
          onChange={(patch) => updateItem(it.id, patch)}
          onRemove={() => removeItem(it.id)}
          onUpload={() => uploadOne(it)}
          disabled={busy}
          isAdmin={user?.role === "admin"} />

        )}
        </div>
      }

      {user?.role === "admin" &&
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold flex items-center gap-2">
                <Wand2 size={15} /> Auto-classify genres
              </div>
              <div className="text-xs text-foreground/50 mt-0.5">
                Runs AI genre detection on existing tracks that still need one.
              </div>
            </div>
            <button
            onClick={classifyAll}
            disabled={classifyBusy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50 active:scale-95 transition">
            
              {classifyBusy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              {classifyBusy ? "Classifying…" : "Classify all"}
            </button>
          </div>
          {classifyInfo &&
        <div className="text-xs text-foreground/50 mt-2">
              {classifyBusy ?
          `Classified ${classifyInfo.total} so far…` :
          classifyInfo.total ?
          `Done — ${classifyInfo.total} track${classifyInfo.total !== 1 ? "s" : ""} updated.` :
          "Nothing to do — all tracks already have a genre."}
            </div>
        }
        </div>
      }

      {dupes &&
      <DuplicateModal
        tracks={dupes}
        onClose={() => setDupes(null)}
        onRemove={(id) => removeItem(id)} />

      }
    </div>);

}