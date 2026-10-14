import { useRef } from "react";
import { UploadCloud, Loader2, CheckCheck, Ban } from "lucide-react";
import { useUploadsEnabled } from "@/hooks/useUploadsEnabled";
import { useAuth } from "@/lib/AuthContext";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import DuplicateModal from "@/components/upload/DuplicateModal";
import { useUpload } from "@/context/UploadContext";
import { AUDIO_ACCEPT, IMAGE_ACCEPT } from "@/lib/audio-utils";

export default function Upload() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const inputRef = useRef(null);
  const q = useUpload();
  const { loading: loadingSwitch, enabled: uploadsEnabled } = useUploadsEnabled();

  if (!loadingSwitch && !uploadsEnabled && !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mt-20 text-center">
          <Ban size={32} className="mx-auto mb-3 text-foreground/30" />
          <h1 className="text-xl font-extrabold tracking-tight">Uploads are paused</h1>
          <p className="text-sm text-foreground/50 mt-1.5">
            New uploads are temporarily closed. Check back soon.
          </p>
        </div>
      </div>);

  }

  const readyCount = q.items.filter((it) => it.status === "ready").length;
  const doneCount = q.uploadedCount;
  const busy = q.items.some((it) => ["uploading", "enhancing"].includes(it.status));

  return (
    <div className="upload-page max-w-3xl mx-auto">
      <header className="page-intro"><h1>Upload music</h1><p>Add your audio, review its details, and publish to PUBLIC.</p></header>
      




      

      {q.catalogError && <div role="alert" className="border rounded-xl p-3 mb-4 text-sm">{q.catalogError}<button className="underline ml-2" onClick={q.refreshDuplicates}>Retry check</button></div>}
      {doneCount > 0 && <button className="underline text-sm mb-3" onClick={q.clearFinished}>Clear completed uploads</button>}
      <FileDropZone onFiles={q.addFiles} inputRef={inputRef} />
      <input
        ref={inputRef}
        type="file"
        accept={`${AUDIO_ACCEPT},${IMAGE_ACCEPT}`}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) q.addFiles(e.target.files);
          e.target.value = "";
        }} />
      

      {q.items.length > 0 &&
      <>
          <div className="upload-queue-toolbar sticky top-[env(safe-area-inset-top)] md:top-0 z-20 px-3 py-2 mt-5 bg-background border border-border rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold tracking-tight">
                {q.items.length} {q.items.length === 1 ? "track" : "tracks"} queued
              </div>
              {doneCount > 0 &&
            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCheck size={11} /> {doneCount} uploaded
                </div>
            }
            </div>
            {readyCount > 0 &&
          <button
            onClick={q.uploadAll}
            disabled={busy}
            className="upload-batch-action shrink-0 inline-flex items-center justify-center gap-1.5 px-3 rounded-full bg-foreground text-background text-xs font-semibold disabled:opacity-50 active:scale-95 transition">
            
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
            <div className="absolute -top-2 left-4 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-bold shadow-lg">
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