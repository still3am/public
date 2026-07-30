import { useState } from "react";
import { UploadCloud, Sparkles } from "lucide-react";

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
      className={`group relative cursor-pointer rounded-3xl overflow-hidden transition-all duration-200 ${
        drag
          ? "bg-foreground text-background shadow-2xl scale-[1.01]"
          : "bg-foreground/[0.035] hover:bg-foreground/[0.06] ring-1 ring-inset ring-border"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-3 rounded-2xl border-2 border-dashed transition ${
          drag ? "border-background/40" : "border-border group-hover:border-foreground/25"
        }`}
      />
      <div className="relative px-6 py-12 md:py-16 text-center">
        <div
          className={`w-20 h-20 rounded-full grid place-items-center mx-auto mb-5 transition-transform duration-200 ${
            drag
              ? "bg-background text-foreground scale-110"
              : "bg-foreground text-background group-hover:scale-105"
          }`}
        >
          <UploadCloud size={30} />
        </div>
        <div className="font-extrabold tracking-tight text-xl md:text-2xl mb-1.5">
          {drag ? "Drop it" : "Drop your tracks here"}
        </div>
        <div
          className={`text-sm max-w-xs mx-auto ${
            drag ? "text-background/70" : "text-foreground/50"
          }`}
        >
          or <span className="underline underline-offset-2 font-semibold">browse files</span> — upload as many as you like, any size.
        </div>

        <div
          className={`mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold ${
            drag ? "bg-background/15 text-background" : "bg-foreground/[0.06] text-foreground/60"
          }`}
        >
          <Sparkles size={12} /> Title, artist, genre &amp; artwork auto-detected
        </div>

        <div className="flex flex-wrap justify-center gap-1.5 mt-6">
          {FORMATS.map((f) => (
            <span
              key={f}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide ${
                drag
                  ? "bg-background/15 text-background/80"
                  : "bg-foreground/[0.05] text-foreground/45"
              }`}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}