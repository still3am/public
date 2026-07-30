import { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  getAudioDuration,
  deriveDefaultTitle,
  extractEmbeddedCover,
  extractEmbeddedTitle,
  extractEmbeddedArtist,
  GENRES,
} from "@/lib/audio-utils";
import { findDuplicateTracks } from "@/lib/duplicateCheck";
import { makeGradientCover } from "@/lib/gradientCover";

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
  const myTracksRef = useRef(null);

  const patch = (id, data) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...data } : it)));

  async function addFiles(fileList) {
    const files = Array.from(fileList).filter(
      (f) => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|ogg|flac|aac|opus|aiff|webm)$/i.test(f.name)
    );
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
      // Use the file's embedded artwork; fall back to a generated gradient cover.
      const cover = embedded || (await makeGradientCover(`${title}${artist}`).catch(() => null));
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

      // duplicate check against user's existing uploads
      if (!myTracksRef.current) {
        myTracksRef.current = await base44.entities.Track
          .filter({ uploader_id: user.id }, "-created_date", 200)
          .catch(() => []);
      }
      const hits = findDuplicateTracks(myTracksRef.current, {
        title,
        artist,
        duration,
        file_name: item.file.name,
      });
      if (hits.length) {
        setDupes((prev) => {
          const cur = prev || [];
          if (cur.some((d) => d.id === item.id)) return cur;
          return [...cur, { id: item.id, title, artist, duration, coverPreviewUrl: "" }];
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
      const meetsRules = !!(item.artist.trim() && item.genre);
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
    } catch (e) {
      patch(item.id, {
        status: "ready",
        error: e?.response?.data?.error || e?.message || "Upload failed — try again.",
      });
    }
  }

  async function uploadAll() {
    const pending = items.filter((it) => it.status === "ready");
    for (const it of pending) await uploadOne(it);
  }

  return { items, addFiles, remove, uploadOne, uploadAll, patch, dupes, setDupes };
}