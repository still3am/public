import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  Music,
  Disc,
  ListMusic,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { GENRES, getAudioDuration, deriveDefaultTitle, AUDIO_ACCEPT } from "@/lib/audio-utils";

function UploadButton({ active, onClick, icon: Icon, title, sub }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-6 rounded-2xl border text-center transition ${
        active
          ? "border-foreground bg-foreground/[0.04]"
          : "border-border hover:bg-foreground/[0.02]"
      }`}
    >
      <div className="w-12 h-12 rounded-full bg-foreground/10 grid place-items-center">
        <Icon size={22} />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-foreground/50 max-w-[14rem]">{sub}</div>
    </button>
  );
}

function GenreSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-white text-sm w-full"
    >
      {GENRES.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}

export default function Upload() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("choose"); // choose | single | bulk
  const [bulkKind, setBulkKind] = useState(null); // album | separate
  const [items, setItems] = useState([]); // { file, title, cover, genre, description, duration, audio_url, cover_url }
  const [album, setAlbum] = useState({
    title: "",
    cover_url: "",
    genre: "Electronic",
    description: "",
  });
  const [rights, setRights] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const singleInputRef = useRef(null);
  const bulkInputRef = useRef(null);
  const pendingBulkKind = useRef(null);

  function pickSingle() {
    singleInputRef.current?.click();
  }
  function pickBulk(kind) {
    pendingBulkKind.current = kind;
    bulkInputRef.current?.click();
  }

  async function onFilesSelected(files, isBulk) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("audio/"));
    if (!arr.length) return;
    if (!isBulk && arr.length > 1) arr.length = 1;
    const built = await Promise.all(
      arr.map(async (f) => {
        const duration = await getAudioDuration(f);
        return {
          file: f,
          title: deriveDefaultTitle(f),
          cover: null,
          genre: "Other",
          artist: "",
          explicit: false,
          lyrics: "",
          description: "",
          duration,
          audio_url: "",
          cover_url: "",
        };
      })
    );
    setItems(built);
  }

  async function uploadAudio(item) {
    if (item.audio_url) return item.audio_url;
    const { file_url } = await base44.integrations.Core.UploadFile({
      file: item.file,
    });
    return file_url;
  }

  async function uploadCover(item) {
    if (!item.cover) return item.cover_url || "";
    if (item.cover_url) return item.cover_url;
    const { file_url } = await base44.integrations.Core.UploadFile({
      file: item.cover,
    });
    return file_url;
  }

  async function uploadAlbumCover() {
    if (!album.coverFile) return album.cover_url || "";
    if (album.cover_url) return album.cover_url;
    const { file_url } = await base44.integrations.Core.UploadFile({
      file: album.coverFile,
    });
    return file_url;
  }

  function updateItem(i, patch) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
    );
  }

  async function publishSingle() {
    if (!items.length || !rights) return;
    setPublishing(true);
    try {
      const item = items[0];
      const audio_url = await uploadAudio(item);
      const cover_url = item.cover ? await uploadCover(item) : "";
      const t = await base44.entities.Track.create({
        title: item.title,
        audio_url,
        cover_art_url: cover_url,
        uploader_id: user.id,
        uploader_name: user.display_name || user.full_name || user.email,
        uploader_avatar_url: user.avatar_url || "",
        artist: (item.artist || "").trim() || (user.display_name || user.full_name || user.email),
        genre: item.genre,
        duration_seconds: item.duration,
        description: item.description,
        lyrics_text: item.lyrics || "",
        explicit: !!item.explicit,
        rights_confirmed: true,
        is_published: true,
      });
      setDone(true);
      setTimeout(() => nav(`/track/${t.id}`), 800);
    } finally {
      setPublishing(false);
    }
  }

  async function publishBulk() {
    if (!items.length || !rights) return;
    setPublishing(true);
    try {
      if (bulkKind === "album") {
        const cover_url = await uploadAlbumCover();
        const albumRec = await base44.entities.Album.create({
          title: album.title || "Untitled Album",
          cover_art_url: cover_url,
          creator_id: user.id,
          genre: album.genre,
          description: album.description,
        });
        const built = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const audio_url = await uploadAudio(it);
          built.push({
            title: it.title,
            audio_url,
            cover_art_url: cover_url,
            uploader_id: user.id,
            uploader_name: user.display_name || user.full_name || user.email,
            uploader_avatar_url: user.avatar_url || "",
            artist: (it.artist || "").trim() || (user.display_name || user.full_name || user.email),
            album_id: albumRec.id,
            track_number: i + 1,
            genre: it.genre || album.genre,
            duration_seconds: it.duration,
            description: it.description || "",
            lyrics_text: it.lyrics || "",
            explicit: !!it.explicit,
            rights_confirmed: true,
            is_published: true,
          });
        }
        await base44.entities.Track.bulkCreate(built);
        setDone(true);
        setTimeout(() => nav(`/profile`), 800);
      } else {
        const built = [];
        for (const it of items) {
          const audio_url = await uploadAudio(it);
          const cover_url = it.cover ? await uploadCover(it) : "";
          built.push({
            title: it.title,
            audio_url,
            cover_art_url: cover_url,
            uploader_id: user.id,
            uploader_name: user.display_name || user.full_name || user.email,
            uploader_avatar_url: user.avatar_url || "",
            artist: (it.artist || "").trim() || (user.display_name || user.full_name || user.email),
            genre: it.genre,
            duration_seconds: it.duration,
            description: it.description,
            lyrics_text: it.lyrics || "",
            explicit: !!it.explicit,
            rights_confirmed: true,
            is_published: true,
          });
        }
        await base44.entities.Track.bulkCreate(built);
        setDone(true);
        setTimeout(() => nav(`/profile`), 800);
      }
    } finally {
      setPublishing(false);
    }
  }

  function reset() {
    setMode("choose");
    setBulkKind(null);
    setItems([]);
    setAlbum({ title: "", cover_url: "", genre: "Electronic", description: "" });
    setRights(false);
    setDone(false);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CheckCircle2 size={40} className="text-foreground mb-3" />
        <h2 className="text-xl font-bold mb-1">Published</h2>
        <p className="text-sm text-foreground/50">Your audio is live on PUBLIC.</p>
      </div>
    );
  }

  return (
    <>
      <input
        ref={singleInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          await onFilesSelected(files, false);
          if (files && files.length) setMode("single");
          if (singleInputRef.current) singleInputRef.current.value = "";
        }}
      />
      <input
        ref={bulkInputRef}
        type="file"
        accept={AUDIO_ACCEPT}
        multiple
        className="hidden"
        onChange={async (e) => {
          const files = e.target.files;
          await onFilesSelected(files, true);
          const kind = pendingBulkKind.current;
          if (files && files.length && kind) {
            setBulkKind(kind);
            setMode("bulk");
          }
          if (bulkInputRef.current) bulkInputRef.current.value = "";
        }}
      />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight mb-6">Upload</h1>

      {mode === "choose" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <UploadButton
            onClick={pickSingle}
            icon={Music}
            title="Single Track"
            sub="Upload one audio file with title, cover art, and details."
            active
          />
          <UploadButton
            onClick={() => pickBulk("album")}
            icon={Disc}
            title="Album"
            sub="Multiple files grouped as one album with a shared cover."
            active
          />
          <UploadButton
            onClick={() => pickBulk("separate")}
            icon={ListMusic}
            title="Separate Tracks"
            sub="Upload many tracks at once, each with its own details."
            active
          />
        </div>
      )}

      {mode === "single" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Single Track</h2>
            <button onClick={reset} className="text-sm text-foreground/50 hover:text-foreground flex items-center gap-1">
              <X size={14} /> Cancel
            </button>
          </div>
          {items.length === 0 ? (
            <label className="block border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:bg-foreground/[0.02]">
              <UploadCloud size={28} className="mx-auto text-foreground/40 mb-2" />
              <p className="text-sm font-medium">Choose an audio file</p>
              <input
                type="file"
                accept={AUDIO_ACCEPT}
                className="hidden"
                onChange={async (e) => {
                  await onFilesSelected(e.target.files, false);
                }}
              />
            </label>
          ) : (
            <SingleForm
              item={items[0]}
              update={(p) => updateItem(0, p)}
              rights={rights}
              setRights={setRights}
              publishing={publishing}
              onPublish={publishSingle}
            />
          )}
        </div>
      )}

      {mode === "bulk" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {bulkKind === "album" ? "Album Upload" : "Bulk Track Upload"}
            </h2>
            <button onClick={reset} className="text-sm text-foreground/50 hover:text-foreground flex items-center gap-1">
              <X size={14} /> Cancel
            </button>
          </div>

          {bulkKind === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <UploadButton
                onClick={() => setBulkKind("album")}
                icon={Disc}
                title="Release as Album"
                sub="One cover, one title; tracks auto-numbered."
                active
              />
              <UploadButton
                onClick={() => setBulkKind("separate")}
                icon={ListMusic}
                title="Upload as Separate Tracks"
                sub="Fill in title, cover, and genre for each file."
                active
              />
            </div>
          ) : (
            <div>
              {items.length === 0 ? (
                <label className="block border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:bg-foreground/[0.02]">
                  <UploadCloud size={28} className="mx-auto text-foreground/40 mb-2" />
                  <p className="text-sm font-medium">Choose multiple audio files</p>
                  <input
                    type="file"
                    accept={AUDIO_ACCEPT}
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      await onFilesSelected(e.target.files, true);
                    }}
                  />
                </label>
              ) : (
                <>
                  {bulkKind === "album" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-4 rounded-2xl border border-border bg-foreground/[0.02]">
                      <div className="md:col-span-2 font-semibold flex items-center gap-2">
                        <Disc size={16} /> Album details
                      </div>
                      <input
                        value={album.title}
                        onChange={(e) => setAlbum((a) => ({ ...a, title: e.target.value }))}
                        placeholder="Album title"
                        className="px-3 py-2 rounded-lg border border-border bg-white text-sm"
                      />
                      <GenreSelect
                        value={album.genre}
                        onChange={(g) => setAlbum((a) => ({ ...a, genre: g }))}
                      />
                      <textarea
                        value={album.description}
                        onChange={(e) => setAlbum((a) => ({ ...a, description: e.target.value }))}
                        placeholder="Album description"
                        className="md:col-span-2 px-3 py-2 rounded-lg border border-border bg-white text-sm"
                        rows={2}
                      />
                      <label className="md:col-span-2 text-sm font-medium flex items-center gap-2 cursor-pointer">
                        <span className="text-foreground/50">Cover:</span>
                        <span className="px-3 py-1.5 rounded-lg bg-foreground text-background text-xs">
                          {album.coverFile ? album.coverFile.name : "Choose image"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setAlbum((a) => ({ ...a, coverFile: f }));
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <div className="space-y-3 mb-4">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl border border-border bg-white"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Music size={16} className="text-foreground/40 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-foreground/40 truncate">
                              {it.file.name} · {Math.round(it.duration)}s
                            </div>
                            {bulkKind !== "album" || !album.title ? (
                              <input
                                value={it.title}
                                onChange={(e) => updateItem(i, { title: e.target.value })}
                                className="w-full bg-transparent text-sm font-semibold focus:outline-none"
                                placeholder="Track title"
                              />
                            ) : (
                              <div className="text-sm font-semibold truncate">
                                {it.title}
                              </div>
                            )}
                          </div>
                          {bulkKind === "separate" && (
                            <GenreSelect
                              value={it.genre}
                              onChange={(g) => updateItem(i, { genre: g })}
                            />
                          )}
                        </div>
                        {bulkKind === "separate" && (
                          <div className="space-y-2 mt-1">
                            <div className="flex gap-2 flex-wrap items-center">
                              <label className="text-xs px-2 py-1 rounded border border-border cursor-pointer flex items-center gap-1">
                                {it.cover ? it.cover.name : "Cover art"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) updateItem(i, { cover: f });
                                  }}
                                />
                              </label>
                              <input
                                value={it.artist}
                                onChange={(e) => updateItem(i, { artist: e.target.value })}
                                placeholder="Artist (defaults to your name)"
                                className="flex-1 min-w-[10rem] px-2 py-1 rounded border border-border text-xs"
                              />
                              <label className="text-xs flex items-center gap-1 px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={!!it.explicit}
                                  onChange={(e) => updateItem(i, { explicit: e.target.checked })}
                                />
                                Explicit
                              </label>
                            </div>
                            <input
                              value={it.description}
                              onChange={(e) => updateItem(i, { description: e.target.value })}
                              placeholder="Description (optional)"
                              className="w-full px-2 py-1 rounded border border-border text-xs"
                            />
                            <textarea
                              value={it.lyrics}
                              onChange={(e) => updateItem(i, { lyrics: e.target.value })}
                              placeholder="Lyrics (optional)"
                              rows={3}
                              className="w-full px-2 py-1 rounded border border-border text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={rights}
                        onChange={(e) => setRights(e.target.checked)}
                      />
                      I confirm I have the rights to share this content on PUBLIC.
                    </label>
                    <button
                      onClick={publishBulk}
                      disabled={!rights || publishing}
                      className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-40"
                    >
                      {publishing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <UploadCloud size={16} />
                      )}
                      Publish {items.length} track{items.length === 1 ? "" : "s"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}

function SingleForm({ item, update, rights, setRights, publishing, onPublish }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        <label className="w-28 h-28 rounded-xl overflow-hidden bg-foreground/10 grid place-items-center text-xs text-foreground/40 cursor-pointer shrink-0">
          {item.cover_url ? (
            <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
          ) : item.cover ? (
            <img src={URL.createObjectURL(item.cover)} alt="" className="w-full h-full object-cover" />
          ) : (
            "Cover"
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
        <div className="flex-1 space-y-2">
          <input
            value={item.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Track title"
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm font-semibold"
          />
          <input
            value={item.artist}
            onChange={(e) => update({ artist: e.target.value })}
            placeholder="Artist (defaults to your name)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
          />
          <select
            value={item.genre}
            onChange={(e) => update({ genre: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-white text-sm w-full"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        value={item.description}
        onChange={(e) => update({ description: e.target.value })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!item.explicit}
          onChange={(e) => update({ explicit: e.target.checked })}
        />
        Contains explicit content
      </label>
      <div>
        <div className="text-xs font-semibold text-foreground/50 mb-1">
          Lyrics (optional)
        </div>
        <textarea
          value={item.lyrics}
          onChange={(e) => update({ lyrics: e.target.value })}
          placeholder="Paste the full lyrics — one line per row"
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm font-mono"
        />
      </div>
      <div className="text-xs text-foreground/40">
        {item.file.name} · {Math.round(item.duration)} seconds
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
        />
        I confirm I have the rights to share this content on PUBLIC.
      </label>
      <button
        onClick={onPublish}
        disabled={!rights || publishing}
        className="px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-semibold flex items-center gap-2 justify-center disabled:opacity-40"
      >
        {publishing ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        Publish track
      </button>
    </div>
  );
}