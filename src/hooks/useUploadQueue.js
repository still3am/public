import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  getAudioDuration,
  deriveDefaultTitle,
  extractEmbeddedCover,
  extractEmbeddedTitle,
  extractEmbeddedArtist,
  isAudioFile,
  GENRES,
} from "@/lib/audio-utils";

const IMAGE_EXT_RE =
  /\.(jpe?g|jfif|png|gif|webp|avif|heic|heif|bmp|tiff?|svg|ico|apng)$/i;
import { findDuplicateTracks } from "@/lib/duplicateCheck";
import { ensureHighResCover } from "@/lib/coverImage";

let uid = 0;
const nextId = () => `u${Date.now()}_${uid++}`;

// Auto-detects explicit flag + cleans up title/artist using AI (internet context).
async function detectMeta(title, artist) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt:
        `A user is uploading a song. Filename-derived / tag metadata:\n` +
        `Title: "${title}"\nArtist: "${artist || "unknown"}"\n\n` +
        `Using knowledge of this song (search the web if needed):\n` +
        `1. Is this song explicit (contains profanity / adult content)? If you can't identify the song, assume false.\n` +
        `2. Give the properly formatted song title (no file junk like "official audio", track numbers, underscores).\n` +
        `3. Give the artist name if identifiable, else keep the provided artist or empty string.\n` +
        `4. Choose the single most accurate genre from this exact list (use "Other" if unsure):\n${GENRES.join(", ")}`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          explicit: { type: "boolean" },
          title: { type: "string" },
          artist: { type: "string" },
          genre: { type: "string" },
        },
        required: ["explicit"],
      },
    });
    return res || null;
  } catch {
    return null;
  }
}

export function useUploadQueue({ user, isAdmin }) {
  const [items, setItems] = useState([]);
  const [dupes, setDupes] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const allTracksRef = useRef(null);
  const pendingCoverRef = useRef(null);

  const patch = (id, data) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...data } : it)));

  async function addFiles(fileList) {
    const all = Array.from(fileList);
    const files = all.filter(isAudioFile);
    // Any image dropped alongside the audio becomes artwork for the tracks
    // that didn't carry their own embedded cover.
    const droppedImage = all.find(
      (f) => f.type.startsWith("image/") || IMAGE_EXT_RE.test(f.name || "")
    );
    if (droppedImage) pendingCoverRef.current = droppedImage;
    if (!files.length) return;

    const newItems = files.map((file) => ({
      id: nextId(),
      file,
      title: deriveDefaultTitle(file),
      artist: "",
      genre: "",
      duration: 0,
      explicit: false,
      aiLyrics: false,
      coverFile: null,
      coverPreviewUrl: "",
      status: "analyzing",
      detecting: true,
      error: "",
    }));
    setItems((prev) => [...prev, ...newItems]);

    // Refresh the platform track list for each new batch so tracks that were
    // deleted since the last upload don't linger in the cache and cause false
    // duplicate hits.
    allTracksRef.current = await base44.entities.Track
      .list("-created_date", 5000)
      .catch(() => []);

    // analyze each file in parallel
    newItems.forEach(async (item) => {
      const [duration, tagTitle, tagArtist, embedded] = await Promise.all([
        getAudioDuration(item.file),
        extractEmbeddedTitle(item.file),
        extractEmbeddedArtist(item.file),
        extractEmbeddedCover(item.file),
      ]);
      let title = tagTitle || item.title;
      let artist = tagArtist || "";
      // The file's own embedded artwork wins; otherwise fall back to an image
      // the user dropped in alongside it. Upscale small (tag-embedded) covers
      // to a high resolution before upload so they don't look blocky on 4K /
      // retina displays.
      const rawCover = embedded || pendingCoverRef.current || null;
      const cover = rawCover ? await ensureHighResCover(rawCover) : null;
      patch(item.id, {
        duration,
        title,
        artist,
        coverFile: cover,
        coverPreviewUrl: cover ? URL.createObjectURL(cover) : "",
        status: "ready",
      });

      // AI: explicit + name cleanup (non-blocking)
      const meta = await detectMeta(title, artist);
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== item.id || it.status !== "ready") return it;
          return {
            ...it,
            detecting: false,
            explicit: !!meta?.explicit,
            title: meta?.title?.trim() || it.title,
            artist: it.artist || meta?.artist?.trim() || "",
            genre:
              it.genre ||
              (GENRES.includes(meta?.genre?.trim()) ? meta.genre.trim() : ""),
          };
        })
      );

      // Duplicate check runs on the AI-cleaned metadata (raw tags/filenames are
      // too noisy to match reliably) against every track already on the app.
      const finalTitle = meta?.title?.trim() || title;
      const finalArtist = artist || meta?.artist?.trim() || "";
      const hits = findDuplicateTracks(allTracksRef.current || [], {
        title: finalTitle,
        artist: finalArtist,
        duration,
        file_name: item.file.name,
      });
      if (hits.length) {
        const hit = hits[0];
        setDupes((prev) => {
          const cur = prev || [];
          if (cur.some((d) => d.id === item.id)) return cur;
          return [
            ...cur,
            {
              id: item.id,
              title: finalTitle,
              artist: finalArtist,
              duration,
              coverPreviewUrl: cover ? URL.createObjectURL(cover) : "",
              existingBy: hit.uploader_name || hit.artist || "",
              existingIsMine: hit.uploader_id === user.id,
            },
          ];
        });
      }
    });
  }

  const remove = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  async function uploadOne(item) {
    patch(item.id, { status: "uploading", error: "" });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
      let cover_art_url = "";
      if (item.coverFile) {
        const r = await base44.integrations.Core.UploadFile({ file: item.coverFile }).catch(() => null);
        cover_art_url = r?.file_url || "";
      }
      const meetsRules = !!(item.artist.trim() && item.genre && cover_art_url);
      const track = await base44.entities.Track.create({
        title: item.title.trim() || "Untitled",
        audio_url: file_url,
        cover_art_url,
        uploader_id: user.id,
        uploader_name: user.display_name || user.full_name || "",
        uploader_avatar_url: user.avatar_url || "",
        artist: item.artist.trim(),
        genre: item.genre || "Other",
        duration_seconds: item.duration,
        explicit: item.explicit,
        rights_confirmed: true,
        approval_status: meetsRules ? (isAdmin ? "approved" : "pending") : "private",
        is_published: isAdmin && meetsRules,
      });

      if (item.aiLyrics) {
        patch(item.id, { status: "enhancing" });
        const res = await base44.functions
          .invoke("generateLyrics", { track_id: track.id })
          .catch(() => null);
        const lyrics = res?.data?.lyrics;
        if (lyrics) await base44.entities.Track.update(track.id, { lyrics_text: lyrics }).catch(() => {});
      }
      patch(item.id, { status: "done" });
      setUploadedCount((n) => n + 1);
      // Clear finished uploads out of the queue automatically.
      setTimeout(() => remove(item.id), 1200);
    } catch (e) {
      patch(item.id, {
        status: "ready",
        error: e?.response?.data?.error || e?.message || "Upload failed — try again.",
      });
    }
  }

  // Uploads the whole queue with limited concurrency so big batches stay fast
  // without hammering the network.
  async function uploadAll() {
    const pending = items.filter((it) => it.status === "ready");
    if (!pending.length) return;
    const CONCURRENCY = 3;
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const next = pending[cursor++];
        await uploadOne(next);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker)
    );
  }

  return {
    items,
    addFiles,
    remove,
    uploadOne,
    uploadAll,
    patch,
    dupes,
    setDupes,
    uploadedCount,
  };
}