import { useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useUploadsEnabled } from "@/hooks/useUploadsEnabled";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import FileDropZone from "@/components/upload/FileDropZone";
import UploadItem from "@/components/upload/UploadItem";
import DuplicateModal from "@/components/upload/DuplicateModal";
import BackHeader from "@/components/BackHeader";
import { Loader2, UploadCloud, Lock, CheckCircle2, Trash2 } from "lucide-react";

export default function Upload() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const { loading: settingsLoading, enabled } = useUploadsEnabled();
  const inputRef = useRef(null);

  const {
    items,
    addFiles,
    remove,
    uploadOne,
    uploadAll,
    patch,
    dupes,
    setDupes,
    clearCompleted,
  } = useUploadQueue({ user, isAdmin });

  if (settingsLoading || !isAuthenticated) {
    return (
      <div className="fixed inset-0 grid place-items-center">
        <Loader2 className="animate-spin text-foreground/30" size={28} />
      </div>
    );
  }

  const uploadsOff = !enabled && !isAdmin;
  const pending = items.filter((it) => it.status === "ready");
  const completed = items.filter((it) => it.status === "done");
  const busy = items.some((it) => it.status === "uploading" || it.status === "enhancing");

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 pb-32">
      <BackHeader title="Upload" />

      {/* Hero */}
      <div className="mt-2 mb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          Share your sound
        </h1>
        <p className="text-sm text-foreground/55 mt-1">
          Drop any audio file — artwork, artist, title and genre are pulled
          automatically. Every upload gets its own page on PUBLIC.
        </p>
      </div>

      {uploadsOff ? (
        <div className="rounded-3xl ring-1 ring-inset ring-border bg-foreground/[0.03] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-foreground/[0.06] grid place-items-center mx-auto mb-4">
            <Lock size={22} className="text-foreground/40" />
          </div>
          <h2 className="font-extrabold text-lg">Uploads are paused</h2>
          <p className="text-sm text-foreground/55 mt-1 max-w-sm mx-auto">
            New uploads are turned off right now. Come back soon — your library
            and everything already on PUBLIC stays available.
          </p>
        </div>
      ) : (
        <>
          <FileDropZone onFiles={addFiles} inputRef={inputRef} />
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.aac,.opus,.aiff"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {completed.length > 0 && (
            <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-500/[0.08] ring-1 ring-inset ring-emerald-500/25 px-4 py-3">
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {completed.length} {completed.length === 1 ? "track" : "tracks"} added — each has its
                own page. Tap “View track” to open it.
              </p>
            </div>
          )}

          {items.length > 0 && (
            <div className="sticky top-2 z-10 mt-5 rounded-2xl bg-card/90 backdrop-blur ring-1 ring-inset ring-border shadow-sm p-2.5 flex items-center gap-2">
              <span className="px-2 text-xs font-semibold text-foreground/60">
                {pending.length} ready
              </span>
              <div className="flex-1" />
              {completed.length > 0 && (
                <button
                  onClick={clearCompleted}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-foreground/55 hover:text-foreground hover:bg-foreground/[0.05] transition"
                >
                  <Trash2 size={14} /> Clear done
                </button>
              )}
              {pending.length > 1 && (
                <button
                  onClick={uploadAll}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-xs font-bold active:scale-95 transition disabled:opacity-50"
                >
                  <UploadCloud size={14} />
                  {busy ? "Uploading…" : `Upload all ${pending.length}`}
                </button>
              )}
            </div>
          )}

          <div className="mt-3 space-y-3">
            {items.map((item) => (
              <UploadItem
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                disabled={busy}
                onChange={(d) => patch(item.id, d)}
                onRemove={() => remove(item.id)}
                onUpload={() => uploadOne(item)}
              />
            ))}

            {items.length === 0 && (
              <div className="text-center text-sm text-foreground/45 pt-10">
                No tracks queued yet. Drag files above or{" "}
                <button
                  onClick={openPicker}
                  className="underline underline-offset-2 font-semibold text-foreground/70"
                >
                  browse
                </button>{" "}
                to begin.
              </div>
            )}
          </div>
        </>
      )}

      {dupes?.length > 0 && (
        <DuplicateModal
          tracks={dupes}
          onClose={() => setDupes(null)}
          onRemove={remove}
        />
      )}
    </div>
  );
}