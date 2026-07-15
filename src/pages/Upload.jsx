import { useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  UploadCloud,
  Music,
  Disc,
  ListMusic,
  X,
  Loader2,
  CheckCircle2,
  Link2,
  Play,
  Pause,
  GripVertical,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Tag,
  ChevronDown,
  ChevronUp,
  Music2 } from
"lucide-react";
import { getAudioDuration, deriveDefaultTitle, AUDIO_ACCEPT } from "@/lib/audio-utils";
import GenrePicker from "@/components/GenrePicker";
import { useToast } from "@/components/ui/use-toast";

const fmtBytes = (b) => {
  if (!b) return "";
  if (b > 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
};
const fmtDur = (s) => {
  if (!s) return "--:--";
  const m = Math.floor(s / 60),
    x = Math.floor(s % 60);
  return `${m}:${String(x).padStart(2, "0")}`;
};

function UploadButton({ icon: Icon, title, sub, onClick, hint }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border text-center transition hover:bg-foreground/[0.02] hover:border-foreground/40">
      
      <div className="w-12 h-12 rounded-full bg-foreground/10 grid place-items-center">
        <Icon size={22} />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-foreground/50 max-w-[14rem]">{sub}</div>
      {hint && <div className="text-[10px] uppercase tracking-wider text-foreground/30">{hint}</div>}
    </button>);

}

function PreviewButton({ item }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef(null);
  if (!item.audio_url && !item.file) return null;
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
      className="p-1.5 rounded-full border border-border hover:bg-foreground/[0.04]"
      aria-label="Preview">
      
      {playing ? <Pause size={14} /> : <Play size={14} />}
      <audio
        ref={ref}
        src={item.audio_url || (item.file ? URL.createObjectURL(item.file) : "")}
        onEnded={() => setPlaying(false)}
        className="hidden" />
      
    </button>);

}

function UrlAddRow({ onAdded, disabled }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);
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
      onAdded({
        url: data.file_url,
        file_name: data.filename || "from-url.mp3",
        size: data.size || 0
      });
      setUrl("");
    } catch (e2) {
      setErr(e2.message || "Could not convert URL");
    } finally {
      setLoading(false);
    }
  }
  if (!open) {
    return null;








  }
  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border p-3 mb-3 bg-foreground/[0.02] space-y-2">
      
      <div className="flex items-center gap-1 text-xs font-semibold text-foreground/60">
        <Link2 size={12} /> Paste a direct audio URL
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e2) => setUrl(e2.target.value)}
          placeholder="https://example.com/track.mp3"
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
          disabled={loading} />
        
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-3 py-2 rounded-lg bg-foreground text-background text-xs font-semibold flex items-center gap-1 disabled:opacity-40">
          
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
        </button>
      </div>
      {err && <div className="text-xs text-red-600">{err}</div>}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setErr("");
          setUrl("");
        }}
        className="text-xs text-foreground/40">
        
        Cancel
      </button>
    </form>);

}

const audioFilter = (f) => (f.type || "").startsWith("audio/") || /\.(mp3|wav|m4a|flac|ogg|aac|webm)$/i.test(f.name || "");

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
  const [bulkKind, setBulkKind] = useState(null);
  const [items, setItems] = useState([]);
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
  const [done, setDone] = useState(null); // { id, kind, title, count }
  const [dragOver, setDragOver] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const singleInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  const addTrackInputRef = useRef(null);
  const pendingBulkKind = useRef(null);

  const albumUploaderName = user?.display_name || user?.full_name || user?.email || "You";

  // ---------- selection ----------
  async function filesToItems(files) {
    const arr = Array.from(files || []).filter(audioFilter);
    if (!arr.length) return [];
    return Promise.all(
      arr.map(async (f) => {
        const dur = await getAudioDuration(f).catch(() => 0);
        return FACTORY({
          file: f,
          file_name: f.name,
          size: f.size,
          title: deriveDefaultTitle(f),
          duration: dur
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
  }

  async function appendFiles(files) {
    const built = await filesToItems(files);
    if (!built.length) return;
    setItems((prev) => [...prev, ...built]);
  }

  async function appendFromUrl({ url, file_name, size }) {
    const item = FACTORY({
      audio_url: url,
      file_name,
      size,
      title: deriveDefaultTitle({ name: file_name })
    });
    setItems((prev) => [...prev, item]);
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
    const it = items[0];
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
    setPublishing(true);
    setProgress(0);
    try {
      const item = items[0];
      setProgress(33);
      const audio_url = await uploadAudio(item);
      setProgress(60);
      const cover_url = item.cover ? await uploadCover(item) : "";
      setProgress(85);
      const t = await base44.entities.Track.create(
        trackPayload(item, { audio_url, cover_url: cover_url || item.cover_url || "" })
      );
      setProgress(100);
      setDone({ id: t.id, kind: "single", title: item.title });
      toast({ title: "Track published" });
      setTimeout(() => nav(`/track/${t.id}`), 700);
    } catch (e) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
      setPublishing(false);
    }
  }

  async function publishBulk() {
    if (!validBulk()) return;
    setPublishing(true);
    setProgress(0);
    try {
      if (bulkKind === "album") {
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
        for (let i = 0; i < items.length; i++) {
          const src = items[i];
          const audio_url = await uploadAudio(src);
          const resolvedGenre =
          src.genre && src.genre !== "Other" ? src.genre : album.genre;
          built.push(trackPayload(src, {
            audio_url,
            cover_art_url: cover_url,
            album_id: albumRec.id,
            track_number: i + 1,
            is_published: !!album.is_published,
            explicit: !!(src.explicit ?? album.explicit),
            genre: resolvedGenre
          }));
          setProgress(30 + Math.round((i + 1) / items.length * 65));
        }
        await base44.entities.Track.bulkCreate(built);
        setProgress(100);
        setDone({ id: albumRec.id, kind: "album", title: album.title, count: items.length });
        toast({ title: "Album published", description: `${items.length} tracks grouped as one album` });
        setTimeout(() => nav(`/playlist/album-${albumRec.id}`), 700);
      } else {
        const built = [];
        for (let i = 0; i < items.length; i++) {
          const audio_url = await uploadAudio(items[i]);
          built.push(trackPayload(items[i], { audio_url }));
          setProgress(Math.round((i + 1) / items.length * 100));
        }
        await base44.entities.Track.bulkCreate(built);
        setProgress(100);
        setDone({ kind: "separate", count: items.length });
        toast({ title: "Tracks published", description: `${items.length} separate tracks` });
        setTimeout(() => nav(`/profile`), 700);
      }
    } catch (e) {
      toast({ title: "Publish failed", description: e?.message || "Try again", variant: "destructive" });
      setPublishing(false);
    }
  }

  function reset() {
    setMode("choose");
    setBulkKind(null);
    setItems([]);
    setAlbum({ title: "", cover_url: "", coverFile: null, genre: "Electronic", description: "", artist: "", explicit: false, is_published: true });
    setRights(false);
    setPublishing(false);
    setProgress(0);
    setDone(null);
  }

  function resetItems() {
    setItems([]);
  }

  // ---------- done state ----------
  if (done) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={44} className="text-foreground mb-3" />
        <h2 className="text-xl font-bold mb-1">
          {done.kind === "album" ?
          "Album published" :
          done.kind === "separate" ?
          "Tracks published" :
          "Track published"}
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
            className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2">
            
            <Plus size={14} /> Upload more
          </Link>
          <button
            onClick={() => nav("/profile")}
            className="px-4 py-2 rounded-full border border-border text-sm font-semibold">
            
            Go to profile
          </button>
        </div>
      </div>);

  }

  const totalDuration = items.reduce((s, it) => s + (it.duration || 0), 0);

  // hidden file inputs
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
        const kind = pendingBulkKind.current;
        await onFilesSelected(e.target.files, true);
        if (kind) setBulkKind(kind);
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
    
    </>;


  function DropZone({ children, onPick }) {
    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (publishing) return;
          const dt = e.dataTransfer;
          const files = dt && dt.files;
          if (files && files.length) onPick(files);
        }}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${
        dragOver ? "border-foreground bg-foreground/[0.04]" : "border-border hover:bg-foreground/[0.02]"}`
        }
        onClick={onPick}>
        
        {children}
      </div>);

  }

  return (
    <>
      {hiddenInputs}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Upload</h1>
          {mode !== "choose" &&
          <button
            onClick={reset}
            className="text-sm text-foreground/50 hover:text-foreground flex items-center gap-1">
            
              <X size={14} /> Reset
            </button>
          }
        </div>

        {mode === "choose" &&
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <UploadButton
              onClick={() => singleInputRef.current?.click()}
              icon={Music}
              title="Single Track"
              sub="One audio file with title, cover art, and lyrics."
              hint="MP3 · WAV · M4A · FLAC" />
            
              <UploadButton
              onClick={() => {
                pendingBulkKind.current = "album";
                bulkInputRef.current?.click();
              }}
              icon={Disc}
              title="Album"
              sub="Tracks grouped as one album with shared cover and track list."
              hint="Grouped collection" />
            
              <UploadButton
              onClick={() => {
                pendingBulkKind.current = "separate";
                bulkInputRef.current?.click();
              }}
              icon={ListMusic}
              title="Separate Tracks"
              sub="Many tracks at once, each with its own details and cover."
              hint="Batch upload" />
            
            </div>
            <UrlAddRow
            onAdded={(urlItem) => {
              setItems([FACTORY({
                audio_url: urlItem.url,
                file_name: urlItem.file_name,
                size: urlItem.size,
                title: deriveDefaultTitle({ name: urlItem.file_name })
              })]);
              setMode("single");
            }} />
          
            


          
          </>
        }

        {mode === "single" &&
        <SingleEditor
          item={items[0]}
          update={(p) => updateItem(0, p)}
          rights={rights}
          setRights={setRights}
          publishing={publishing}
          onPublish={publishSingle}
          canPublish={validSingle()}
          progress={progress}
          onPickFile={(files) => {
            if (files && files.length) onFilesSelected(files, false);else
            singleInputRef.current?.click();
          }}
          onAddUrl={appendFromUrl}
          onClear={resetItems} />

        }

        {mode === "bulk" &&
        <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                {bulkKind === "album" ? "Album Upload" : "Separate Tracks"}
              </h2>
              <button
              onClick={reset}
              className="text-sm text-foreground/50 hover:text-foreground flex items-center gap-1">
              
                <X size={14} /> Cancel
              </button>
            </div>

            {bulkKind === null ?
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <UploadButton
              onClick={() => setBulkKind("album")}
              icon={Disc}
              title="Group as Album"
              sub="One cover, one title, auto-numbered track list you can reorder." />
            
                <UploadButton
              onClick={() => setBulkKind("separate")}
              icon={ListMusic}
              title="Upload as Separate Tracks"
              sub="Independent metadata and cover per track." />
            
              </div> :

          <div>
                {bulkKind === "album" &&
            <AlbumMeta
              album={album}
              setAlbum={setAlbum} />

            }

                {items.length === 0 ?
            <DropZone
              onPick={(files) => onFilesSelected(files, true)}>
              
                    <UploadCloud size={28} className="mx-auto text-foreground/40 mb-2" />
                    <p className="text-sm font-medium">
                      Drop audio files here or click to browse
                    </p>
                    <p className="text-xs text-foreground/40 mt-1">
                      Add as many tracks as you like — you can reorder, preview, and edit each one before publishing.
                    </p>
                  </DropZone> :

            <BulkToolbar
              count={items.length}
              totalDuration={totalDuration}
              onAddFiles={() => addTrackInputRef.current?.click()}
              onAddUrl={appendFromUrl}
              onClear={resetItems}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced} />

            }

                {items.length > 0 &&
            <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="track-list">
                      {(provided) =>
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 mb-4">
                  
                          {items.map((it, i) =>
                  <Draggable
                    key={it.id}
                    draggableId={it.id}
                    index={i}
                    isDragDisabled={bulkKind !== "album"}>
                    
                              {(dragProvided, snapshot) =>
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`p-3 rounded-xl border bg-white transition ${
                      snapshot.isDragging ? "border-foreground shadow-lg" : "border-border"}`
                      }>
                      
                                  <div className="flex items-center gap-3">
                                    {bulkKind === "album" &&
                        <span
                          {...dragProvided.dragHandleProps}
                          className="cursor-grab px-1.5 py-2 text-foreground/40 hover:text-foreground">
                          
                                        <GripVertical size={16} />
                                      </span>
                        }
                                    {bulkKind === "album" &&
                        <span className="w-6 h-6 grid place-items-center rounded-full bg-foreground/10 text-[10px] font-bold shrink-0">
                                        {i + 1}
                                      </span>
                        }
                                    <div className="min-w-0 flex-1">
                                      <input
                            value={it.title}
                            onChange={(e) => updateItem(i, { title: e.target.value })}
                            placeholder="Track title"
                            className="w-full bg-transparent text-sm font-semibold focus:outline-none" />
                          
                                      <div className="text-xs text-foreground/40 truncate">
                                        {it.file_name} {it.size ? `· ${fmtBytes(it.size)}` : ""}
                                        {it.duration ? ` · ${fmtDur(it.duration)}` : ""}
                                        {it.fromUrl &&
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-foreground/10 text-[10px]">URL</span>
                            }
                                      </div>
                                    </div>
                                    <GenrePicker
                          value={it.genre}
                          onChange={(g) => updateItem(i, { genre: g })} />
                        
                                    <PreviewButton item={it} />
                                    <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="p-1.5 rounded-full border border-border hover:bg-foreground/[0.04] text-foreground/40 hover:text-red-600"
                          aria-label="Remove">
                          
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  {showAdvanced &&
                      <AdvancedFields it={it} i={i} updateItem={updateItem} separate={bulkKind === "separate"} />
                      }
                                </div>
                    }
                            </Draggable>
                  )}
                          {provided.placeholder}
                        </div>
                }
                    </Droppable>
                  </DragDropContext>
            }

                {items.length > 0 &&
            <PublishBar
              rights={rights}
              setRights={setRights}
              onPublish={publishBulk}
              publishing={publishing}
              progress={progress}
              count={items.length}
              label={bulkKind === "album" ? "Publish album" : `Publish ${items.length} track${items.length === 1 ? "" : "s"}`}
              canPublish={validBulk()}
              albumVisibility={bulkKind === "album" ? album.is_published : null}
              setAlbumPublish={(v) => setAlbum((a) => ({ ...a, is_published: v }))} />

            }
              </div>
          }
          </div>
        }
      </div>
    </>);

}

function BulkToolbar({ count, totalDuration, onAddFiles, onAddUrl, onClear, showAdvanced, setShowAdvanced }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
      <div className="text-xs text-foreground/50">
        {count} track{count === 1 ? "" : "s"}
        {totalDuration > 0 && ` · ${fmtDur(totalDuration)} total`}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs px-2 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-foreground/[0.04]">
          
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Advanced
        </button>
        <UrlAddRow onAdded={onAddUrl} />
        <button
          type="button"
          onClick={onAddFiles}
          className="text-xs px-2 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-foreground/[0.04]">
          
          <Plus size={12} /> Add files
        </button>
        <button
          type="button"
          onClick={onClear}
          className="text-xs px-2 py-1 rounded-full border border-border flex items-center gap-1 hover:bg-foreground/[0.04] hover:text-red-600">
          
          <RotateCcw size={12} /> Clear all
        </button>
      </div>
    </div>);

}

function AdvancedFields({ it, i, updateItem, separate }) {
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
          <input
            type="checkbox"
            checked={!!it.explicit}
            onChange={(e) => updateItem(i, { explicit: e.target.checked })} />
          
          Explicit
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!it.downloadable}
            onChange={(e) => updateItem(i, { downloadable: e.target.checked })} />
          
          <Download size={12} /> Allow download
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!it.is_published}
            onChange={(e) => updateItem(i, { is_published: e.target.checked })} />
          
          {it.is_published ? <Eye size={12} /> : <EyeOff size={12} />} {it.is_published ? "Public" : "Draft"}
        </label>
      </div>
    </div>);

}

function AlbumMeta({ album, setAlbum }) {
  return (
    <div className="mb-3 p-4 rounded-2xl border border-border bg-foreground/[0.02]">
      <div className="font-semibold flex items-center gap-2 mb-3">
        <Disc size={16} /> Album details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          value={album.title}
          onChange={(e) => setAlbum((a) => ({ ...a, title: e.target.value }))}
          placeholder="Album title *"
          className="px-3 py-2 rounded-lg border border-border bg-white text-sm md:col-span-2" />
        
        <input
          value={album.artist}
          onChange={(e) => setAlbum((a) => ({ ...a, artist: e.target.value }))}
          placeholder="Artist (defaults to your name)"
          className="px-3 py-2 rounded-lg border border-border bg-white text-sm md:col-span-2" />
        
        <GenrePicker
          value={album.genre}
          onChange={(g) => setAlbum((a) => ({ ...a, genre: g }))} />
        
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white text-sm cursor-pointer">
          <Tag size={14} className="text-foreground/40" />
          <span className="truncate">{album.coverFile ? album.coverFile.name : "Choose cover image"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setAlbum((a) => ({ ...a, coverFile: f }));
            }} />
          
        </label>
      </div>
      <textarea
        value={album.description}
        onChange={(e) => setAlbum((a) => ({ ...a, description: e.target.value }))}
        placeholder="Album description (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm mt-3" />
      
      <div className="flex items-center gap-4 flex-wrap text-xs mt-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={!!album.explicit}
            onChange={(e) => setAlbum((a) => ({ ...a, explicit: e.target.checked }))} />
          
          Album contains explicit content
        </label>
      </div>
    </div>);

}

function PublishBar({
  rights,
  setRights,
  onPublish,
  publishing,
  progress,
  count,
  label,
  canPublish,
  albumVisibility,
  setAlbumPublish
}) {
  return (
    <div className="flex flex-col gap-3">
      {albumVisibility !== null &&
      <label className="flex items-center gap-2 text-sm">
          {albumVisibility ? <Eye size={14} /> : <EyeOff size={14} />}
          <span className="text-foreground/60">
            Album visibility:
          </span>
          <input
          type="checkbox"
          checked={!!albumVisibility}
          onChange={(e) => setAlbumPublish(e.target.checked)} />
        
          <span className="text-foreground/60">{albumVisibility ? "Public" : "Draft (visible only to you)"}</span>
        </label>
      }
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)} />
        
        I confirm I have the rights to share this content on PUBLIC.
      </label>
      {publishing &&
      <div className="w-full h-2 rounded-full bg-foreground/10 overflow-hidden">
          <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${progress}%` }} />
        
        </div>
      }
      <button
        onClick={onPublish}
        disabled={!canPublish || publishing}
        className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-40">
        
        {publishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {publishing ? `Uploading ${progress}%` : label}
      </button>
      {!canPublish && !publishing &&
      <div className="text-xs text-foreground/40 text-center">
          Tip: every track needs a title and you must confirm your rights to publish.
        </div>
      }
    </div>);

}

function SingleEditor({ item, update, rights, setRights, publishing, onPublish, canPublish, progress, onPickFile, onAddUrl, onClear }) {
  if (!item)
  return (
    <div>
        <DropZoneHelper onPickFile={onPickFile} onAddUrl={onAddUrl} />
      </div>);

  return (
    <div>
      <SingleForm
        item={item}
        update={update}
        rights={rights}
        setRights={setRights}
        publishing={publishing}
        onPublish={onPublish}
        canPublish={canPublish}
        progress={progress}
        onPickFile={onPickFile}
        onAddUrl={onAddUrl}
        onClear={onClear} />
      
    </div>);

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
        }} />
      
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) onPickFile(e.dataTransfer.files);
        }}
        className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:bg-foreground/[0.02]">
        
        <UploadCloud size={28} className="mx-auto text-foreground/40 mb-2" />
        <p className="text-sm font-medium">Drop an audio file or click to browse</p>
        <p className="text-xs text-foreground/40 mt-1">or paste a URL below</p>
      </div>
      <UrlAddRow onAdded={onAddUrl} />
    </div>);

}

function SingleForm({ item, update, rights, setRights, publishing, onPublish, canPublish, progress, onPickFile, onAddUrl, onClear }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end flex-wrap">
        <label className="w-28 h-28 rounded-xl overflow-hidden bg-foreground/10 grid place-items-center text-xs text-foreground/40 cursor-pointer shrink-0">
          {item.cover_url ?
          <img src={item.cover_url} alt="" className="w-full h-full object-cover" /> :
          item.cover ?
          <img src={URL.createObjectURL(item.cover)} alt="" className="w-full h-full object-cover" /> :

          <span className="inline-flex flex-col items-center gap-1">
              <UploadCloud size={20} /> Cover
            </span>
          }
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) update({ cover: f });
            }} />
          
        </label>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={item.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Track title *"
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm font-semibold" />
          
          <input
            value={item.artist}
            onChange={(e) => update({ artist: e.target.value })}
            placeholder="Artist (defaults to your name)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm" />
          
          <GenrePicker value={item.genre} onChange={(g) => update({ genre: g })} />
        </div>
      </div>

      <div className="text-xs text-foreground/40">
        {item.file_name || "no file"}
        {item.size ? ` · ${fmtBytes(item.size)}` : ""}
        {item.duration ? ` · ${fmtDur(item.duration)}` : ""}
        {!item.audio_url && !item.file &&
        <span className="ml-2">
            <button onClick={onPickFile} className="underline text-foreground/60">
              Choose file
            </button>
          </span>
        }
        {item.audio_url && <span className="ml-1 px-1.5 py-0.5 rounded bg-foreground/10 text-[10px]">From URL</span>}
      </div>

      <textarea
        value={item.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm" />
      

      <div className="flex items-center gap-4 flex-wrap text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!item.explicit}
            onChange={(e) => update({ explicit: e.target.checked })} />
          
          Explicit
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!item.downloadable}
            onChange={(e) => update({ downloadable: e.target.checked })} />
          
          <Download size={14} /> Allow download
        </label>
        <label className="flex items-center gap-2 cursor-pointer hidden">
          <input
            type="checkbox"
            checked={!!item.is_published}
            onChange={(e) => update({ is_published: e.target.checked })} />
          
          {item.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
          {item.is_published ? "Public" : "Draft"}
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-xs text-foreground/50 hover:text-foreground inline-flex items-center gap-1">
        
        {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />} Lyrics & advanced
      </button>
      {showAdvanced &&
      <textarea
        value={item.lyrics}
        onChange={(e) => update({ lyrics: e.target.value })}
        placeholder="Paste the full lyrics — one line per row"
        rows={5}
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm font-mono" />

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
      <div className="flex gap-2">
        <button
          onClick={onPublish}
          disabled={!canPublish || publishing}
          className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-40">
          
          {publishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
          {publishing ? `Uploading ${progress}%` : "Publish track"}
        </button>
        {onClear &&
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-full border border-border text-sm font-semibold flex items-center gap-1">
          
            <X size={14} /> Clear
          </button>
        }
      </div>
      {!canPublish && !publishing &&
      <div className="text-xs text-foreground/40">
          Add a title and confirm your rights to enable publish.
        </div>
      }
    </div>);

}