import { useState } from "react";
import { UploadCloud } from "lucide-react";

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
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition p-10 md:p-14 text-center ${
        drag
          ? "border-foreground bg-foreground/[0.04]"
          : "border-border hover:bg-foreground/[0.02]"
      }`}
    >
      <div className="w-14 h-14 rounded-full bg-foreground/[0.05] grid place-items-center mx-auto mb-4">
        <UploadCloud size={26} className="text-foreground/50" />
      </div>
      <div className="font-bold text-base mb-1">Drop audio files to upload</div>
      <div className="text-sm text-foreground/50">
        Any audio format, any size — your file is uploaded and streamed from the network.
      </div>
      <div className="text-xs text-foreground/40 mt-3 hidden sm:block">
        MP3, WAV, M4A, FLAC, OGG, AAC, OPUS, AIFF…
      </div>
    </div>
  );
}