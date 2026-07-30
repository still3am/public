import { useRef } from "react";
import { UploadCloud, Loader2, CheckCheck } from "lucide-react";
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
  const doneCount = q.items.filter((it) => it.status === "done").length;
  const busy = q.items.some((it) => ["uploading", "enhancing"].includes(it.status));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 main-content">
      <BackHeader title="Upload" />

      <div className="pt-3 pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Upload music</h1>
        <p className="text-sm text-foreground/50 mt-1.5">
          Share your sound with PUBLIC. Drop a whole folder of tracks at once.
        </p>
      </div>

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
        }} />
      

      {q.items.length > 0 &&
      <>
          <div className="sticky top-14 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mt-6 bg-background/85 backdrop-blur-md border-y border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold tracking-tight">
                {q.items.length} {q.items.length === 1 ? "track" : "tracks"} queued
              </div>
              {doneCount > 0 &&
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCheck size={11} /> {doneCount} uploaded
                </div>
            }
            </div>
            {readyCount > 1 &&
          <button
            onClick={q.uploadAll}
            disabled={busy}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-50 active:scale-95 transition">
            
                {busy ?
            <Loader2 size={14} className="animate-spin" /> :

            <UploadCloud size={14} />
            }
                Upload all ({readyCount})
              </button>
          }
          </div>

          <div className="space-y-3 mt-4">
            {q.items.map((item) =>
          <div key={item.id} className="relative">
                {(item.status === "analyzing" || item.detecting) && item.status !== "done" &&
            <div className="absolute -top-2 left-4 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-bold shadow-lg hidden">
                    <Loader2 size={10} className="animate-spin" />
                    {item.status === "analyzing" ? "Reading file…" : "Auto-detecting details…"}
                  </div>
            }
                <UploadItem
              item={item}
              isAdmin={isAdmin}
              onChange={(data) => q.patch(item.id, data)}
              onRemove={() => q.remove(item.id)}
              onUpload={() => q.uploadOne(item)}
              disabled={item.status === "analyzing"} />
            
              </div>
          )}
          </div>
        </>
      }

      {q.dupes?.length > 0 &&
      <DuplicateModal
        tracks={q.dupes}
        onClose={() => q.setDupes(null)}
        onRemove={(id) => q.remove(id)} />

      }
    </div>);

}