import { useState } from "react";
import { UploadCloud } from "lucide-react";

const FORMATS = ["MP3", "WAV", "M4A", "FLAC", "OGG", "AAC", "OPUS", "AIFF"];

export default function FileDropZone({ onFiles, inputRef }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
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