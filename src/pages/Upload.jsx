import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import BackHeader from "@/components/BackHeader";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import { parseId3, getAudioDuration } from "@/lib/id3";
import { CheckCircle2 } from "lucide-react";

let nextId = 1;

export default function Upload() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  function patch(id, data) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...data } : it)));
  }

  async function processFile(file, id) {
    try {
      // read embedded metadata (silent)
      let tags = { title: "", artist: "", picture: null };
      try {
        tags = await parseId3(file);
      } catch {}
      const fromName = file.name.replace(/\.[^.]+$/, "");
      const dashMatch = !tags.artist && fromName.includes(" - ") ? fromName.split(" - ") : null;
      let title = tags.title || (dashMatch ? dashMatch.slice(1).join(" - ").trim() : fromName);
      let artist = tags.artist || (dashMatch ? dashMatch[0].trim() : "");
      const cover = tags.picture ? URL.createObjectURL(tags.picture) : "";
      patch(id, { title, artist, cover, status: "uploading" });

      const duration = await getAudioDuration(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      let cover_art_url = "";
      if (tags.picture) {
        try {
          const ext = (tags.picture.type || "image/jpeg").split("/")[1] || "jpg";
          const coverFile = new File([tags.picture], `cover.${ext}`, { type: tags.picture.type });
          const r = await base44.integrations.Core.UploadFile({ file: coverFile });
          cover_art_url = r.file_url;
        } catch {}
      }

      patch(id, { status: "finalizing" });

      // silent AI detection: canonical title, artist and explicit flag
      let explicit = false;
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt:
            `A user uploaded a music file. Using web knowledge, identify the song and return its canonical metadata.\n` +
            `File name: "${file.name}"\n` +
            `Embedded title tag: "${tags.title || ""}"\n` +
            `Embedded artist tag: "${tags.artist || ""}"\n\n` +
            `Return JSON: {"title": "<clean song title without artist, junk words or file extensions>", ` +
            `"artist": "<artist name, empty string if unknown>", ` +
            `"explicit": <true if this song is known to contain explicit lyrics, false otherwise>}. ` +
            `If you cannot identify the song, clean up the provided title/artist as best you can.`,
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              artist: { type: "string" },
              explicit: { type: "boolean" }
            }
          }
        });
        if (res?.title?.trim()) title = res.title.trim();
        if (res?.artist?.trim()) artist = res.artist.trim();
        explicit = !!res?.explicit;
      } catch {}

      patch(id, { title, artist, explicit });

      const track = await base44.entities.Track.create({
        title,
        artist,
        audio_url: file_url,
        cover_art_url,
        uploader_id: user.id,
        uploader_name: user.display_name || user.full_name || "",
        uploader_avatar_url: user.avatar_url || "",
        genre: "Other",
        duration_seconds: Math.round(duration),
        explicit,
        rights_confirmed: true
      });

      // silent genre detection in background
      base44.functions.invoke("detectGenre", { track_id: track.id }).catch(() => {});

      patch(id, { status: "done" });
    } catch (e) {
      patch(id, { status: "error", error: e?.message || "Upload failed" });
    }
  }

  function addFiles(files) {
    const newItems = files.map((file) => ({
      id: nextId++,
      file,
      name: file.name.replace(/\.[^.]+$/, ""),
      title: "",
      artist: "",
      cover: "",
      explicit: false,
      status: "processing",
      error: ""
    }));
    setItems((prev) => [...newItems, ...prev]);
    newItems.forEach((it) => processFile(it.file, it.id));
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  const busyCount = items.filter((i) => i.status !== "done" && i.status !== "error").length;

  return (
    <div className="min-h-dvh pb-24 md:pb-12">
      <BackHeader title="Upload" />
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-4 space-y-4">
        <FileDropZone onFiles={addFiles} />

        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold">
                {busyCount > 0
                  ? `Uploading ${busyCount} file${busyCount !== 1 ? "s" : ""}…`
                  : "Uploads"}
              </h2>
              {doneCount > 0 && busyCount === 0 && (
                <span className="text-xs text-green-600 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 size={13} /> {doneCount} uploaded
                </span>
              )}
            </div>
            {items.map((it) => (
              <UploadItem
                key={it.id}
                item={it}
                onRemove={(id) => setItems((prev) => prev.filter((x) => x.id !== id))}
              />
            ))}
            {doneCount > 0 && (
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Uploaded tracks are reviewed before going public — you can find them in your
                library right away.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}