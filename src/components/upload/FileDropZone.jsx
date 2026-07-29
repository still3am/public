import { useState, useRef } from "react";
import { UploadCloud } from "lucide-react";

const FORMATS = ["MP3", "WAV", "M4A", "FLAC", "OGG", "AAC", "OPUS", "AIFF"];

// Cross-browser robust file extraction from a drop event. Some browsers
// (notably Safari) expose dropped files only through dataTransfer.items
// while leaving dataTransfer.files empty, which silently broke drops.
function filesFromEvent(e) {
  const dt = e.dataTransfer;
  if (!dt) return [];
  if (dt.files && dt.files.length) return Array.from(dt.files);
  if (dt.items && dt.items.length) {
    const out = [];
    for (const it of dt.items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
    if (out.length) return out;
  }
  return [];
}

export default function FileDropZone({ onFiles, inputRef }) {
  const [drag, setDrag] = useState(false);
  const dragDepth = useRef(0);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current += 1;
        setDrag(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDrag(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        dragDepth.current = 0;
        setDrag(false);
        const files = filesFromEvent(e);
        if (files.length) onFiles(files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition overflow-hidden ${
        drag
          ? "border-foreground bg-foreground/[0.06] scale-[1.005]"
          : "border-border hover:border-foreground/40 hover:bg-foreground/[0.02]"
      }`}
    >
      <div className="px-6 py-10 md:py-14 text-center">
        <div
          className={`w-16 h-16 rounded-2xl grid place-items-center mx-auto mb-4 transition ${
            drag
              ? "bg-foreground text-background"
              : "bg-foreground/[0.05] text-foreground/60"
          }`}
        >
          <UploadCloud size={28} />
        </div>
        <div className="font-bold text-base md:text-lg mb-1">
          {drag ? "Drop to upload" : "Drop audio files to upload"}
        </div>
        <div className="text-sm text-foreground/50 max-w-sm mx-auto">
          Metadata and cover art are detected automatically. Any format, any
          size — streamed from the network.
        </div>
        <div className="flex flex-wrap justify-center gap-1.5 mt-4">
          {FORMATS.map((f) => (
            <span key={f} className="chip">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}