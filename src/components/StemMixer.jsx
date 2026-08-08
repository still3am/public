import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { X } from "lucide-react";
import MixerVisualizer from "@/components/MixerVisualizer";

const PRESETS = [
  { label: "Beat+", values: { bass: 2, beat: 8, vocals: 0, treble: 0 } },
  { label: "Vocal-", values: { bass: 0, beat: 0, vocals: -48, treble: 0 } },
  { label: "Vocal+", values: { bass: -2, beat: 0, vocals: 8, treble: 2 } },
  { label: "Bright", values: { bass: -2, beat: 0, vocals: 0, treble: 6 } },
  { label: "Warm", values: { bass: 4, beat: 0, vocals: 2, treble: -4 } },
];

function MixerSlider({ label, range, value, min, max, onChange }) {
  const pct = (value - min) / (max - min) * 100;
  const isNeutral = value === 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
          <span className="text-[9px] opacity-40">{range}</span>
        </div>
        <span
          className={`text-xs font-mono tabular-nums ${
            isNeutral ? "opacity-50" : "text-white font-bold"}`}
        >
          {value > 0 ? "+" : ""}
          {value} dB
        </span>
      </div>
      <div className="relative h-7 flex items-center">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-white/10 rounded-full" />
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-white/25" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[4px] bg-white rounded-full pointer-events-none"
          style={{
            left: value >= 0 ? "50%" : `${pct}%`,
            right: value >= 0 ? `${100 - pct}%` : "50%",
          }}
        />
        <div
          className={`absolute w-5 h-5 rounded-full shadow-lg pointer-events-none -translate-x-1/2 border-2 ${
            isNeutral ? "bg-white/80 border-white/30" : "bg-white border-white"}`}
          style={{ left: `${pct}%` }}
        />
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

function BoostSlider({ value, onChange }) {
  const pct = ((value - 1) / 2) * 100; // 1x → 0%, 3x → 100%
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Volume Boost</span>
          <span className="text-[9px] opacity-40">up to 3×</span>
        </div>
        <span className={`text-xs font-mono tabular-nums ${value !== 1 ? "text-white font-bold" : "opacity-50"}`}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="relative h-7 flex items-center">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-white/10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-gradient-to-r from-white/60 to-white rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute w-5 h-5 rounded-full shadow-lg pointer-events-none -translate-x-1/2 border-2 ${
            value !== 1 ? "bg-white border-white" : "bg-white/80 border-white/30"}`}
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: "none" }}
          aria-label="Volume boost"
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
    mixer.bass !== 0 || mixer.beat !== 0 || mixer.vocals !== 0 || mixer.treble !== 0 || mixer.boost !== 1;

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  function applyPreset(values) {
    p.setMixerValue("bass", values.bass);
    p.setMixerValue("beat", values.beat);
    p.setMixerValue("vocals", values.vocals);
    p.setMixerValue("treble", values.treble);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
          visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full md:max-w-md bg-[#1a1a1c] border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
          isModified ? "border-white/20" : "border-white/10"} ${
          visible ? "translate-y-0" : "translate-y-full md:translate-y-8"}`}
      >
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Mixer</span>
          <div className="flex items-center gap-1">
            {isModified && (
              <button
                onClick={() => p.resetMixer()}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 hover:bg-white/20 ring-1 ring-white/10 transition"
              >
                Reset
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

        {/* visualizer */}
        <div className="mb-5 rounded-2xl bg-white/[0.03] p-3">
          <MixerVisualizer />
        </div>

        {/* presets */}
        <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar justify-center">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.values)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 ring-1 ring-white/10 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* sliders */}
        <div className="space-y-4">
          <MixerSlider
            label="Bass"
            range="20–250Hz"
            value={mixer.bass}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("bass", v)}
          />
          <MixerSlider
            label="Beat"
            range="80Hz–3kHz"
            value={mixer.beat}
            min={-48}
            max={12}
            onChange={(v) => p.setMixerValue("beat", v)}
          />
          <MixerSlider
            label="Vocals"
            range="1k–4kHz"
            value={mixer.vocals}
            min={-48}
            max={12}
            onChange={(v) => p.setMixerValue("vocals", v)}
          />
          <MixerSlider
            label="Treble"
            range="4k–20kHz"
            value={mixer.treble}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("treble", v)}
          />
          <BoostSlider
            value={mixer.boost}
            onChange={(v) => p.setMixerValue("boost", v)}
          />
        </div>

        <p className="text-[10px] text-center opacity-40 mt-4">
          Adjust how you hear the music — mixes in real time.
        </p>
      </div>
    </div>
  );
}