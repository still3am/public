import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
  getAudioDuration,
  deriveDefaultTitle,
  deriveDefaultArtist,
  AUDIO_ACCEPT,
  extractEmbeddedCover,
  extractEmbeddedArtist } from
"@/lib/audio-utils";
import { findDuplicateTracks } from "@/lib/duplicateCheck";
import ChooseMode from "@/components/upload/ChooseMode";
import SingleEditor from "@/components/upload/SingleEditor";
import BulkEditor from "@/components/upload/BulkEditor";
import DuplicateConfirmModal from "@/components/upload/DuplicateConfirmModal";
import { X, Plus, CheckCircle2, Loader2 } from "lucide-react";

const audioFilter = (f) =>
(f.type || "").startsWith("audio/") || /\.(mp3|wav|m4a|flac|ogg|aac|webm)$/i.test(f.name || "");

const FACTORY = (overrides = {}) => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID?.() || String(Math.random()),
  file: null,
  file_name: "",
  size: 0,
  title: "",
  cover: null,
  cover_url: "",
  genre: "Other",
  artist: "",
  explicit: false,
  downloadable: true,
  is_published: true,
  lyrics: "",
  description: "",
  duration: 0,
  audio_url: "",
  ...overrides
});

export default function Upload() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState("choose");
  const [bulkKind, setBulkKind] = useState("album");
  const [items, setItems] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [album, setAlbum] = useState({
    title: "",
    cover_url: "",
    coverFile: null,
    genre: "Electronic",
    description: "",
    artist: "",
    explicit: false,
    is_published: true
  });
  const [rights, setRights] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(null);
  const [dupWarning, setDupWarning] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const singleInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  const addTrackInputRef = useRef(null);
  const moreInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const pendingBatchRef = useRef([]);

  const albumUploaderName = user?.display_name || user?.full_name || user?.email || "You";

  // ---------- selection ----------
  async function filesToItems(files) {
    const arr = Array.from(files || []).filter(audioFilter);
    if (!arr.length) return [];
    return Promise.all(
      arr.map(async (f) => {
        const [dur, cover, artist] = await Promise.all([
        getAudioDuration(f).catch(() => 0),
        extractEmbeddedCover(f),
        extractEmbeddedArtist(f)]
        );
        return FACTORY({
          file: f,
          file_name: f.name,
          size: f.size,
          title: deriveDefaultTitle(f),
          artist: artist || deriveDefaultArtist(f),
          duration: dur,
          cover
        });
      })
    );
  }

  async function onFilesSelected(files, isBulk) {
    let built = await filesToItems(files);
    if (!built.length) return;
    if (!isBulk) built = built.slice(0, 1);
    setMode(isBulk ? "bulk" : "single");
    setItems(built);
    setQueueIndex(0);
  }

  async function appendFiles(files) {
    const built = await filesToItems(files);
    if (!built.length) return;
    setItems((prev) => [...prev, ...built]);
  }

  async function addMoreFiles(files) {
    const built = await filesToItems(files);
    if (!built.length) return;
    setItems((prev) => prev.length ? [...prev, ...built] : built);
  }

  async function appendFromUrl({ url, file_name, size }) {
    const item = FACTORY({
      audio_url: url,
      file_name,
      size,
      title: deriveDefaultTitle({ name: file_name }),
      artist: deriveDefaultArtist({ name: file_name })
    });
    setItems((prev) => [...prev, item]);
  }

  function addUrlSingle(urlItem) {
    setItems([
    FACTORY({
      audio_url: urlItem.url,
      file_name: urlItem.file_name,
      size: urlItem.size,
      title: deriveDefaultTitle({ name: urlItem.file_name }),
      artist: deriveDefaultArtist({ name: urlItem.file_name })
    })]
    );
    setMode("single");
    setQueueIndex(0);
  }

  function updateItem(i, patch) {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveItem(from, to) {
    setItems((prev) => {
      const next = [...prev];
      const moved = next.splice(from, 1)[0];
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onDragEnd(res) {
    if (!res.destination || res.destination.index === res.source.index) return;
    moveItem(res.source.index, res.destination.index);
  }

  // ---------- uploads ----------
  async function uploadAudio(item) {
    if (item.audio_url) return item.audio_url;
    const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
    return file_url;
  }

  async function uploadCover(item) {
    if (!item.cover) return item.cover_url || "";
    if (item.cover_url) return item.cover_url;
    const { file_url } = await base44.integrations.Core.UploadFile({ file: item.cover });
    return file_url;
  }

  async function uploadAlbumCover() {
    if (!album.coverFile) return album.cover_url || "";
    const { file_url } = await base44.integrations.Core.UploadFile({ file: album.coverFile });
    return file_url;
  }

  // ---------- publication ----------
  async function dupCheck(candidates, kind) {
    try {
      const existing = await base44.entities.Track.filter(
        { uploader_id: user.id },
        "-created_date",
        500
      ).catch(() => []);
      const matches = [];
      candidates.forEach((it) => {
        const found = findDuplicateTracks(existing, it);
        if (found.length) matches.push({ item: it, existing: found[0] });
      });
      if (matches.length) {
        setDupWarning({ matches, kind });
        return true;
      }
    } catch {}
    return false;
  }

  // Detect duplicates INSIDE the current upload batch (e.g. same file added twice
  // to an album/queue). The cross-library check only sees already-saved tracks,
  // so without this two identical files in one batch both get published.
  function toTrackLike(it) {
    return {
      id: it.id,
      title: it.title || it.file_name,
      artist: it.artist,
      duration_seconds: it.duration,
      audio_url: it.audio_url,
      cover_art_url: it.cover_url || ""
    };
  }

  function dedupeBatch(list) {
    const kept = [];
    const pool = [];
    let removed = 0;
    for (const it of list) {
      if (findDuplicateTracks(pool, it).length) {
        removed++;
        continue;
      }
      kept.push(it);
      pool.push(toTrackLike(it));
    }
    return { kept, removed };
  }

  async function deleteDuplicate(id) {
    const matches = dupWarning?.matches || [];
    const remaining = matches.filter((m) => m.existing.id !== id).length;
    const kind = dupWarning?.kind;
    try {
      await base44.entities.Track.delete(id);
      setDupWarning((d) => {
        if (!d) return d;
        const next = d.matches.filter((m) => m.existing.id !== id);
        return next.length ? { ...d, matches: next } : null;
      });
      toast({ title: "Duplicate deleted" });
      // When the last copy is removed, the upload proceeds automatically — no re-click, no stale list.
      if (remaining === 0 && kind) {
        if (kind === "single") doPublishSingle();else
        if (kind === "queue") publishQueue();else
        doPublishBulk();
      }
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message || "Try again", variant: "destructive" });
    }
  }

  function trackPayload(item, extra) {
    return {
      title: item.title || item.file_name || "Untitled",
      audio_url: item.audio_url,
      cover_art_url: item.cover_url || "",
      uploader_id: user.id,
      uploader_name: albumUploaderName,
      uploader_avatar_url: user.avatar_url || "",
      artist: (item.artist || "").trim() || albumUploaderName,
      genre: item.genre || "Other",
      duration_seconds: item.duration || 0,
      description: item.description || "",
      lyrics_text: item.lyrics || "",
      explicit: !!item.explicit,
      rights_confirmed: true,
      is_downloadable: !!item.downloadable,
      is_published: !!item.is_published,
      ...extra
    };
  }

  function validSingle() {
    if (!items.length) return false;
    const it = items[queueIndex];
    if (!it.title?.trim() && !it.file_name?.trim()) return false;
    if (!it.audio_url && !it.file) return false;
    return rights;
  }

  function validBulk() {
    if (!items.length) return false;
    if (bulkKind === "album" && !album.title?.trim()) return false;
    for (const it of items) {
      if (!it.title?.trim() && !it.file_name?.trim()) return false;
      if (!it.audio_url && !it.file) return false;
    }
    return rights;
  }

  async function publishSingle() {
    if (!validSingle()) return;
    if (await dupCheck([items[queueIndex]], "single")) return;
    await doPublishSingle();
  }

  async function doPublishSingle() {
    setPublishing(true);
    setProgress(0);
    try {
      const item = items[queueIndex];
      setProgress(33);
      const audio_url = await uploadAudio(item);
      setProgress(60);
      const cover_url = await uploadCover(item);
      setProgress(85);
      const t = await base44.entities.Track.create(
        trackPayload(item, { audio_url, cover_art_url: cover_url })
      );
      setProgress(100);
      const remaining = items.filter((_, idx) => idx !== queueIndex);
      if (remaining.length) {
        setItems(remaining);
        setQueueIndex(Math.min(queueIndex, remaining.length - 1));
        setPublishing(false);
        setProgress(0);
        toast({ title: "Track published", description: `${remaining.length} left in queue` });
      } else {
        setDone({ id: t.id, kind: "single", title: item.title });
        setQueueIndex(0);
        toast({ title: "Track published" });
        setTimeout(() => nav(`/track/${t.id}`), 700);
      }
    } catch (e) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
      setPublishing(false);
    }
  }

  async function publishBulk() {
    if (!validBulk()) return;
    const { kept, removed } = dedupeBatch(items);
    if (removed) {
      setItems(kept);
      toast({ title: `Removed ${removed} duplicate${removed > 1 ? "s" : ""} from your upload`, description: "Kept one copy of each." });
    }
    const candidates = kept.length ? kept : items;
    pendingBatchRef.current = candidates;
    if (await dupCheck(candidates, "bulk")) return;
    await doPublishBulk(candidates);
  }

  async function doPublishBulk(list) {
    setPublishing(true);
    setProgress(0);
    try {
      const cover_url = await uploadAlbumCover();
      setProgress(15);
      const albumRec = await base44.entities.Album.create({
        title: album.title || "Untitled Album",
        cover_art_url: cover_url,
        creator_id: user.id,
        artisan: album.artist || albumUploaderName,
        genre: album.genre,
        description: album.description
      });
      setProgress(30);
      const built = [];
      for (let i = 0; i < list.length; i++) {
        const src = list[i];
        const audio_url = await uploadAudio(src);
        const resolvedGenre = src.genre && src.genre !== "Other" ? src.genre : album.genre;
        built.push(
          trackPayload(src, {
            audio_url,
            cover_art_url: cover_url,
            album_id: albumRec.id,
            track_number: i + 1,
            artist: albumRec.artisan,
            is_published: !!album.is_published,
            explicit: !!(src.explicit ?? album.explicit),
            genre: resolvedGenre
          })
        );
        setProgress(30 + Math.round((i + 1) / list.length * 65));
      }
      await base44.entities.Track.bulkCreate(built);
      setProgress(100);
      setDone({ id: albumRec.id, kind: "album", title: album.title, count: list.length });
      toast({ title: "Album published", description: `${list.length} tracks grouped as one album` });
      setTimeout(() => nav(`/album/${albumRec.id}`), 700);
    } catch (e) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
      setPublishing(false);
    }
  }

  async function publishQueue() {
    if (!items.length || !rights) return;
    const { kept, removed } = dedupeBatch(items);
    if (removed) {
      setItems(kept);
      toast({ title: `Removed ${removed} duplicate${removed > 1 ? "s" : ""} from your queue`, description: "Kept one copy of each." });
    }
    const candidates = kept.length ? kept : items;
    pendingBatchRef.current = candidates;
    if (await dupCheck(candidates, "queue")) return;
    await doPublishQueue(candidates);
  }

  async function doPublishQueue(list) {
    setPublishing(true);
    setProgress(0);
    try {
      const total = list.length;
      for (let i = 0; i < total; i++) {
        const item = list[i];
        if (!item.title?.trim() && !item.file_name?.trim()) continue;
        if (!item.audio_url && !item.file) continue;
        const audio_url = await uploadAudio(item);
        const cover_url = await uploadCover(item);
        await base44.entities.Track.create(
          trackPayload(item, { audio_url, cover_art_url: cover_url })
        );
        setProgress(Math.round((i + 1) / total * 100));
      }
      setDone({ kind: "separate", count: total });
      setItems([]);
      setQueueIndex(0);
      toast({ title: "Tracks published", description: `${total} separate tracks` });
      setTimeout(() => nav(`/profile`), 700);
    } catch (e) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
      setPublishing(false);
    }
  }

  function reset() {
    setMode("choose");
    setBulkKind("album");
    setItems([]);
    setQueueIndex(0);
    setAlbum({ title: "", cover_url: "", coverFile: null, genre: "Electronic", description: "", artist: "", explicit: false, is_published: true });
    setRights(false);
    setPublishing(false);
    setProgress(0);
    setDone(null);
  }

  function resetItems() {
    setItems([]);
  }

  function removeCurrent() {
    const next = items.filter((_, idx) => idx !== queueIndex);
    setItems(next);
    if (!next.length) {
      setMode("choose");
      setQueueIndex(0);
    } else {
      setQueueIndex(Math.min(queueIndex, next.length - 1));
    }
  }

  if (done) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={44} className="text-foreground mb-3" />
        <h2 className="text-xl font-bold mb-1">
          {done.kind === "album" ? "Album published" : done.kind === "separate" ? "Tracks published" : "Track published"}
        </h2>
        <p className="text-sm text-foreground/50">
          {done.kind === "album" && `${done.count} songs are grouped together as "${done.title}".`}
          {done.kind === "separate" && `${done.count} tracks are now live on PUBLIC.`}
          {done.kind === "single" && `"${done.title}" is now live on PUBLIC.`}
        </p>
        <div className="flex gap-2 mt-4">
          <Link
            to="/upload"
            onClick={reset}
            className="px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2">
            <Plus size={14} /> Upload more
          </Link>
          <button
            onClick={() => nav("/profile")}
            className="px-4 py-2.5 rounded-full border border-border text-sm font-semibold">
            Go to profile
          </button>
        </div>
      </div>);

  }

  const totalDuration = items.reduce((s, it) => s + (it.duration || 0), 0);

  const hiddenInputs =
  <>
      <input
      ref={singleInputRef}
      type="file"
      accept={AUDIO_ACCEPT}
      className="hidden"
      onChange={async (e) => {
        await onFilesSelected(e.target.files, false);
        if (singleInputRef.current) singleInputRef.current.value = "";
      }} />
    
      <input
      ref={bulkInputRef}
      type="file"
      accept={AUDIO_ACCEPT}
      multiple
      className="hidden"
      onChange={async (e) => {
        await onFilesSelected(e.target.files, true);
        if (bulkInputRef.current) bulkInputRef.current.value = "";
      }} />
    
      <input
      ref={addTrackInputRef}
      type="file"
      accept={AUDIO_ACCEPT}
      multiple
      className="hidden"
      onChange={async (e) => {
        await appendFiles(e.target.files);
        if (addTrackInputRef.current) addTrackInputRef.current.value = "";
      }} />
    
      <input
      ref={moreInputRef}
      type="file"
      accept={AUDIO_ACCEPT}
      multiple
      className="hidden"
      onChange={async (e) => {
        await addMoreFiles(e.target.files);
        if (moreInputRef.current) moreInputRef.current.value = "";
      }} />
    
      <input
      ref={replaceInputRef}
      type="file"
      accept={AUDIO_ACCEPT}
      className="hidden"
      onChange={async (e) => {
        const f = e.target.files?.[0];
        if (f) {
          const built = (await filesToItems([f]))[0];
          if (built)
          setItems((prev) =>
          prev.map((it, idx) =>
          idx === queueIndex ?
          { ...it, file: built.file, file_name: built.file_name, size: built.size, duration: built.duration, audio_url: "" } :
          it
          )
          );
        }
        if (replaceInputRef.current) replaceInputRef.current.value = "";
      }} />
    
    </>;


  return (
    <>
      {hiddenInputs}
      {dupWarning &&
      <DuplicateConfirmModal
        matches={dupWarning.matches}
        onCancel={() => setDupWarning(null)}
        onDelete={deleteDuplicate}
        onContinue={() => {
        const k = dupWarning.kind;
        setDupWarning(null);
        if (k === "single") doPublishSingle();else
        if (k === "queue") doPublishQueue(pendingBatchRef.current);else
        doPublishBulk(pendingBatchRef.current);
        }} />

      }

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          
          {mode !== "choose" &&
          <button
            onClick={reset}
            className="text-sm text-foreground/50 hover:text-foreground flex items-center gap-1">
              <X size={14} /> Reset
            </button>
          }
        </div>

        {mode === "choose" &&
        <ChooseMode
          onPickSingle={() => singleInputRef.current?.click()}
          onPickAlbum={() => bulkInputRef.current?.click()}
          onAddUrl={addUrlSingle} />

        }

        {mode === "single" &&
        <SingleEditor
          item={items[queueIndex]}
          index={queueIndex}
          count={items.length}
          onPrev={() => setQueueIndex(Math.max(0, queueIndex - 1))}
          onNext={() => setQueueIndex(Math.min(items.length - 1, queueIndex + 1))}
          update={(p) => updateItem(queueIndex, p)}
          rights={rights}
          setRights={setRights}
          publishing={publishing}
          onPublish={publishSingle}
          canPublish={validSingle()}
          progress={progress}
          onPickFile={() => replaceInputRef.current?.click()}
          onAddUrl={appendFromUrl}
          onClear={removeCurrent}
          onPublishAll={publishQueue}
          onAddMore={() => moreInputRef.current?.click()} />

        }

        {mode === "bulk" &&
        <BulkEditor
          album={album}
          setAlbum={setAlbum}
          items={items}
          updateItem={updateItem}
          removeItem={removeItem}
          onDragEnd={onDragEnd}
          rights={rights}
          setRights={setRights}
          publishing={publishing}
          progress={progress}
          onPublish={publishBulk}
          canPublish={validBulk()}
          onAddFiles={() => addTrackInputRef.current?.click()}
          onAddUrl={appendFromUrl}
          onClear={resetItems}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          totalDuration={totalDuration} />

        }
      </div>
    </>);

}