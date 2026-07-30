import { useRef, useState } from "react";
import { UploadCloud, Music2 } from "lucide-react";

export default function FileDropZone({ onFiles, disabled }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  function handle(list) {
    const files = Array.from(list || []);
    if (files.length) onFiles(files);
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      className={`w-full rounded-3xl border-2 border-dashed p-8 sm:p-12 flex flex-col items-center gap-3 text-center transition ${
        over
          ? "border-foreground bg-foreground/[0.06]"
          : "border-border hover:border-foreground/40 hover:bg-foreground/[0.02]"
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-foreground text-background grid place-items-center">
        <UploadCloud size={26} />
      </div>
      <div>
        <p className="font-bold">Tap to choose your music</p>
        <p className="text-xs text-muted-foreground mt-1">
          or drag & drop — multiple files, any size, any format
        </p>
      </div>
      <span className="chip">
        <Music2 size={11} /> MP3 · WAV · FLAC · M4A · OGG & more
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.wma,.aiff,.alac"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}