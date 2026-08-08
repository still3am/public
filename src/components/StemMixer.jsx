import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { X, RotateCcw, Mic2, SlidersHorizontal } from "lucide-react";

function MixerSlider({ label, value, min, max, onChange, disabled }) {
  const pct = ((value - min) / (max - min)) * 100;
  const isNeutral = value === 0;
  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
        <span
          className={`text-xs font-mono tabular-nums ${
            isNeutral ? "opacity-50" : "text-white font-bold"
          }`}
        >
          {value > 0 ? "+" : ""}
          {value} dB
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-white/15 rounded-full" />
        {/* center marker */}
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[1px] h-2.5 bg-white/25" />
        {/* fill from center */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-white rounded-full pointer-events-none"
          style={{
            left: value >= 0 ? "50%" : `${pct}%`,
            right: value >= 0 ? `${100 - pct}%` : "50%",
          }}
        />
        {/* knob */}
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-md pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }}
        />
        {/* invisible native input on top */}
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: "none" }}
          aria-label={label}
        />
      </div>
    </div>
  );
}

export default function StemMixer({ onClose }) {
  const p = usePlayer();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    p.enableMixer?.();
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { mixer } = p;
  const isModified =
    mixer.bass !== 0 || mixer.vocals !== 0 || mixer.treble !== 0 || mixer.vocalCut;

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />
      {/* panel */}
      <div
        className={`relative w-full md:max-w-md bg-[#1a1a1c] border border-white/10 rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
          visible ? "translate-y-0" : "translate-y-full md:translate-y-8"
        }`}
      >
        {/* grab handle (mobile) */}
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="opacity-80" />
            <h3 className="text-base font-bold">Mix</h3>
          </div>
          <div className="flex items-center gap-1">
            {isModified && (
              <button
                onClick={() => p.resetMixer()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium opacity-70 hover:opacity-100 hover:bg-white/10 transition"
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 transition"
              aria-label="Close mixer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* sliders */}
        <div className="space-y-5">
          <MixerSlider
            label="Bass"
            value={mixer.bass}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("bass", v)}
          />
          <MixerSlider
            label="Vocals"
            value={mixer.vocals}
            min={-24}
            max={12}
            onChange={(v) => p.setMixerValue("vocals", v)}
            disabled={mixer.vocalCut}
          />
          <MixerSlider
            label="Treble"
            value={mixer.treble}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("treble", v)}
          />
        </div>

        {/* vocal cut toggle */}
        <button
          onClick={() => p.setMixerValue("vocalCut", !mixer.vocalCut)}
          className={`mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition ${
            mixer.vocalCut
              ? "bg-white text-black"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          <Mic2 size={16} />
          {mixer.vocalCut ? "Vocals Removed" : "Remove Vocals (Karaoke)"}
        </button>

        <p className="text-[10px] text-center opacity-40 mt-4">
          Adjust how you hear the music — mixes in real time.
        </p>
      </div>
    </div>
  );
}