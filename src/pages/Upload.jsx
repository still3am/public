import { useRef } from "react";
import { UploadCloud, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import BackHeader from "@/components/BackHeader";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import DuplicateModal from "@/components/upload/DuplicateModal";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { AUDIO_ACCEPT } from "@/lib/audio-utils";

export default function Upload() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const inputRef = useRef(null);
  const q = useUploadQueue({ user: user || {}, isAdmin });

  const readyCount = q.items.filter((it) => it.status === "ready").length;
  const busy = q.items.some((it) => ["uploading", "enhancing"].includes(it.status));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pb-24">
      <BackHeader title="Upload" />

      <div className="mt-4 space-y-4">
        <FileDropZone onFiles={q.addFiles} inputRef={inputRef} />
        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) q.addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {q.items.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/50 flex items-center gap-1.5">
              <Sparkles size={12} />
              Title, artist, cover art &amp; explicit flag are auto-detected — review before uploading.
            </p>
            {readyCount > 1 && (
              <button
                onClick={q.uploadAll}
                disabled={busy}
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold disabled:opacity-50 active:scale-95 transition"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                Upload all ({readyCount})
              </button>
            )}
          </div>
        )}

        <div className="space-y-3">
          {q.items.map((item) => (
            <div key={item.id} className="relative">
              {(item.status === "analyzing" || item.detecting) && item.status !== "done" && (
                <div className="absolute -top-2 left-4 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-bold shadow">
                  <Loader2 size={10} className="animate-spin" />
                  {item.status === "analyzing" ? "Reading file…" : "Auto-detecting details…"}
                </div>
              )}
              <UploadItem
                item={item}
                isAdmin={isAdmin}
                onChange={(data) => q.patch(item.id, data)}
                onRemove={() => q.remove(item.id)}
                onUpload={() => q.uploadOne(item)}
                disabled={item.status === "analyzing"}
              />
            </div>
          ))}
        </div>
      </div>

      {q.dupes?.length > 0 && (
        <DuplicateModal
          tracks={q.dupes}
          onClose={() => q.setDupes(null)}
          onRemove={(id) => q.remove(id)}
        />
      )}
    </div>
  );
}