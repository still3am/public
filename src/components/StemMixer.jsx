import { useEffect, useState, useMemo } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { X, RotateCcw, Mic2, SlidersHorizontal } from "lucide-react";

const PRESETS = [
{ label: "Flat", values: { bass: 0, vocals: 0, treble: 0, vocalCut: false } },
{ label: "Bass+", values: { bass: 8, vocals: 0, treble: 0, vocalCut: false } },
{ label: "Vocal+", values: { bass: 0, vocals: 6, treble: 0, vocalCut: false } },
{ label: "Bright", values: { bass: 0, vocals: 0, treble: 8, vocalCut: false } },
{ label: "Karaoke", values: { bass: 4, vocals: 0, treble: 0, vocalCut: true } }];


function smoothstep(x, a, b) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Approximate the combined frequency response of the mixer's biquad filters
// as a smooth curve for visualization (log-frequency x-axis, dB y-axis).
function buildEqCurve(mixer) {
  const samples = 80;
  const points = [];
  for (let i = 0; i < samples; i++) {
    const x = i / (samples - 1);
    // Bass: lowshelf ~200Hz (flat boost below, transitions to 0 above)
    const bassResp = mixer.bass * (1 - smoothstep(x, 0.30, 0.42));
    // Vocals: peaking ~2500Hz
    const vocalGain = mixer.vocalCut ? 0 : mixer.vocals;
    const vocalResp = vocalGain * Math.exp(-Math.pow((x - 0.70) / 0.10, 2));
    // Treble: highshelf ~4kHz (0 below, flat boost above)
    const trebleResp = mixer.treble * smoothstep(x, 0.68, 0.82);
    // Vocal cut: deep peaking notch ~2000Hz
    const vocalCutResp = mixer.vocalCut ?
    -36 * Math.exp(-Math.pow((x - 0.67) / 0.08, 2)) :
    0;
    points.push({ x, gain: bassResp + vocalResp + trebleResp + vocalCutResp });
  }
  return points;
}

function EqCurve({ mixer }) {
  const points = useMemo(() => buildEqCurve(mixer), [mixer]);
  const W = 300;
  const H = 72;
  const maxG = 12;
  const minG = -36;
  const toY = (g) =>
  (maxG - Math.max(minG, Math.min(maxG, g))) / (maxG - minG) * H;
  const toX = (x) => x * W;

  const pathD = points.
  map(
    (p, i) =>
    `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.gain).toFixed(1)}`
  ).
  join(" ");
  const fillD = `${pathD} L${W},${H} L0,${H} Z`;
  const zeroY = toY(0);

  const freqLabels = [
  { x: "16%", label: "60" },
  { x: "37%", label: "250" },
  { x: "57%", label: "1k" },
  { x: "77%", label: "4k" },
  { x: "93%", label: "12k" }];


  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[72px]"
        preserveAspectRatio="none">
        
        <defs>
          <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={zeroY}
          x2={W}
          y2={zeroY}
          stroke="white"
          strokeOpacity="0.12"
          strokeDasharray="3 3" />
        
        <path d={fillD} fill="url(#eqFill)" />
        <path
          d={pathD}
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round" />
        
      </svg>
      <div className="flex justify-between mt-1">
        {freqLabels.map((f) =>
        <span
          key={f.label}
          className="text-[9px] opacity-30 font-mono"
          style={{ marginLeft: f.x, transform: "translateX(-50%)" }}>
          
            {f.label}
          </span>
        )}
      </div>
    </div>);

}

function MixerSlider({ label, value, min, max, onChange, disabled }) {
  const pct = (value - min) / (max - min) * 100;
  const isNeutral = value === 0;
  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span
          className={`text-xs font-mono tabular-nums ${
          isNeutral ? "opacity-50" : "text-white font-bold"}`
          }>
          
          {value > 0 ? "+" : ""}
          {value} dB
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-white/15 rounded-full" />
        <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[1px] h-2.5 bg-white/25" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-white rounded-full pointer-events-none"
          style={{
            left: value >= 0 ? "50%" : `${pct}%`,
            right: value >= 0 ? `${100 - pct}%` : "50%"
          }} />
        
        <div
          className="absolute w-4 h-4 bg-white rounded-full shadow-md pointer-events-none -translate-x-1/2"
          style={{ left: `${pct}%` }} />
        
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: "none" }}
          aria-label={label} />
        
      </div>
    </div>);

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
  mixer.bass !== 0 ||
  mixer.vocals !== 0 ||
  mixer.treble !== 0 ||
  mixer.vocalCut;

  function matchesPreset(preset) {
    const v = preset.values;
    return (
      mixer.bass === v.bass &&
      mixer.vocals === v.vocals &&
      mixer.treble === v.treble &&
      mixer.vocalCut === v.vocalCut);

  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
        visible ? "opacity-100" : "opacity-0"}`
        }
        onClick={handleClose} />
      
      <div
        className={`relative w-full md:max-w-md bg-[#1a1a1c] border border-white/10 rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full md:translate-y-8"}`
        }>
        
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="opacity-80" />
            <h3 className="text-base font-bold">Mix</h3>
          </div>
          <div className="flex items-center gap-1">
            {isModified &&
            <button
              onClick={() => p.resetMixer()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium opacity-70 hover:opacity-100 hover:bg-white/10 transition">
              
                <RotateCcw size={13} /> Reset
              </button>
            }
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 transition"
              aria-label="Close mixer">
              
              <X size={18} />
            </button>
          </div>
        </div>

        {/* EQ curve */}
        <div className="mb-4">
          <EqCurve mixer={mixer} />
        </div>

        {/* presets */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5 hidden">
          {PRESETS.map((preset) =>
          <button
            key={preset.label}
            onClick={() => p.setMixer(preset.values)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
            matchesPreset(preset) ?
            "bg-white text-black" :
            "bg-white/10 text-white hover:bg-white/15"}`
            }>
            
              {preset.label}
            </button>
          )}
        </div>

        {/* sliders */}
        <div className="space-y-5">
          <MixerSlider
            label="Bass"
            value={mixer.bass}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("bass", v)} />
          
          <MixerSlider
            label="Vocals"
            value={mixer.vocals}
            min={-24}
            max={12}
            onChange={(v) => p.setMixerValue("vocals", v)}
            disabled={mixer.vocalCut} />
          
          <MixerSlider
            label="Treble"
            value={mixer.treble}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("treble", v)} />
          
        </div>

        {/* vocal cut toggle */}
        <button
          onClick={() => p.setMixerValue("vocalCut", !mixer.vocalCut)}
          className={`mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition ${
          mixer.vocalCut ?
          "bg-white text-black" :
          "bg-white/10 text-white hover:bg-white/15"}`
          }>
          
          <Mic2 size={16} className="hidden" />
          {mixer.vocalCut ? "Vocals Removed" : "Remove Vocals (Karaoke)"}
        </button>

        <p className="text-[10px] text-center opacity-40 mt-4">
          Adjust how you hear the music — mixes in real time.
        </p>
      </div>
    </div>);

}