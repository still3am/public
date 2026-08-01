import { useState } from "react";
import { useMixer } from "@/hooks/useMixer";
import Deck from "@/components/mixer/Deck";
import Crossfader from "@/components/mixer/Crossfader";
import MixerTrackPicker from "@/components/mixer/MixerTrackPicker";
import { Headphones } from "lucide-react";

export default function Mixer() {
  const m = useMixer();
  const [pickerFor, setPickerFor] = useState(null); // "A" | "B" | null

  const canSync = !!(m.decks.A.track && m.decks.B.track);

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-white" onClick={() => { if (!m.ready) m.ensureCtx(); }}>
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-10">
        {/* header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-white/10 grid place-items-center">
            <Headphones size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-none">MIXER</h1>
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 mt-1">
              Touch a deck to start the audio engine
            </p>
          </div>
        </div>

        {/* decks */}
        <div className="flex flex-col lg:flex-row gap-4">
          <Deck
            label="A"
            accent="#ffffff"
            deck={m.decks.A}
            onLoad={() => setPickerFor("A")}
            onPlay={() => m.play("A")}
            onPause={() => m.pause("A")}
            onSeek={(s) => m.seek("A", s)}
            onVolume={(v) => m.setVolume("A", v)}
            onPitch={(p) => m.setPitch("A", p)}
            onEq={(band, db) => m.setEq("A", band, db)}
          />
          <Deck
            label="B"
            accent="#e5e5e5"
            deck={m.decks.B}
            onLoad={() => setPickerFor("B")}
            onPlay={() => m.play("B")}
            onPause={() => m.pause("B")}
            onSeek={(s) => m.seek("B", s)}
            onVolume={(v) => m.setVolume("B", v)}
            onPitch={(p) => m.setPitch("B", p)}
            onEq={(band, db) => m.setEq("B", band, db)}
          />
        </div>

        {/* crossfader */}
        <div className="mt-4">
          <Crossfader
            crossfade={m.crossfade}
            onCrossfade={m.setCrossfade}
            master={m.master}
            onMaster={m.setMaster}
            onSync={m.sync}
            canSync={canSync}
          />
        </div>

        <p className="text-[11px] text-white/30 text-center mt-6 px-6">
          Load a track to each deck, adjust EQ, pitch and trim, then blend them with the crossfader. Sync aligns Deck B to Deck A.
        </p>
      </div>

      <MixerTrackPicker
        open={!!pickerFor}
        onClose={() => setPickerFor(null)}
        onLoad={(key, track) => m.loadTrack(key, track)}
      />
    </div>
  );
}