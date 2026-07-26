import { UploadButton, UrlAddRow } from "@/components/upload/parts";
import { Music, Disc, Sparkles, ShieldCheck } from "lucide-react";

export default function ChooseMode({ onPickSingle, onPickAlbum, onAddUrl }) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-foreground/[0.05] to-transparent p-5 md:p-8 mb-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/45 mb-2">
          <Sparkles size={14} /> Share your sound
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Upload to PUBLIC.</h2>
        <p className="text-sm text-foreground/55 mt-1 max-w-md leading-relaxed">
          Drop a single or group tracks into an album. We auto-fill title, artist, and cover art from your file.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <UploadButton onClick={onPickSingle} icon={Music} title="Tracks" sub="One or more audio files with title, cover art, and lyrics." hint="MP3 · WAV · M4A · FLAC" />
        <UploadButton onClick={onPickAlbum} icon={Disc} title="Album" sub="Tracks grouped as one album with shared cover and track list." hint="Grouped collection" />
      </div>

      <UrlAddRow onAdded={onAddUrl} />

      <div className="flex items-center gap-2 mt-5 text-xs text-foreground/40">
        <ShieldCheck size={14} /> You'll confirm you own the rights before publishing.
      </div>
    </div>
  );
}