import PureControls from "@/components/PureControls";
import {EQ_PRESETS as PRESETS} from "@/lib/equalizer";
import { useEffect, useState, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { X } from "lucide-react";
import MixerVisualizer from "@/components/MixerVisualizer";

/** @param {any} props */
function MixerSlider({ label, range, value, min, max, onChange }) {
  const pct = (value - min) / (max - min) * 100;
  const zero=(0-min)/(max-min)*100;
  const isNeutral = value === 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</span>
          <span className="text-[10px] opacity-60">{range}</span>
        </div>
        <span
          className={`text-xs font-mono tabular-nums ${
            isNeutral ? "opacity-50" : "text-overlay-foreground font-bold"}`}
        >
          {value > 0 ? "+" : ""}
          {value} dB
        </span>
      </div>
      <div className="relative h-11 flex items-center">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-white/10 rounded-full" />
        <div className="absolute -translate-x-1/2 top-1/2 -translate-y-1/2 w-[1px] h-3 bg-white/25" style={{left:`${zero}%`}} />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[4px] bg-overlay-foreground rounded-full pointer-events-none"
          style={{
            left: value >= 0 ? `${zero}%` : `${pct}%`,
            right: value >= 0 ? `${100 - pct}%` : `${zero}%`,
          }}
        />
        <div
          className={`absolute w-5 h-5 rounded-full shadow-lg pointer-events-none -translate-x-1/2 border-2 ${
            isNeutral ? "bg-overlay-foreground/80 border-overlay-foreground/30" : "bg-overlay-foreground border-overlay-foreground"}`}
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
          aria-label={label} aria-valuetext={`${value>0?"+":""}${value} decibels`}
        />
      </div>
    </div>
  );
}

/** @param {any} props */
function BoostSlider({ value, onChange }) {
  const pct = (value - .5) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-70">Output level</span>
          <span className="text-[10px] opacity-60">50–150%</span>
        </div>
        <span className={`text-xs font-mono tabular-nums ${value !== 1 ? "text-overlay-foreground font-bold" : "opacity-50"}`}>
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="relative h-11 flex items-center">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-white/10 rounded-full" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-gradient-to-r from-white/60 to-white rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className={`absolute w-5 h-5 rounded-full shadow-lg pointer-events-none -translate-x-1/2 border-2 ${
            value !== 1 ? "bg-overlay-foreground border-overlay-foreground" : "bg-overlay-foreground/80 border-overlay-foreground/30"}`}
          style={{ left: `${pct}%` }}
        />
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.05}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          style={{ touchAction: "none" }}
          aria-label="Equalizer output level" aria-valuetext={`${Math.round(value*100)} percent`}
        />
      </div>
    </div>
  );
}

/** @param {any} props */
export default function StemMixer({ onClose }) {
  const p = usePlayer();
  const [visible, setVisible] = useState(false);
  const [ready,setReady]=useState(true);
  const closeTimer=useRef(null),closing=useRef(false);

  useEffect(() => {
    setReady(p.enableMixer?.()!==false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {cancelAnimationFrame(raf);if(closeTimer.current)clearTimeout(closeTimer.current);};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { mixer } = p;
  const isModified =
    mixer.bass !== 0 || mixer.beat !== 0 || mixer.vocals !== 0 || mixer.treble !== 0 || mixer.boost !== 1;

  function handleClose() {
    if(closing.current)return;closing.current=true;setVisible(false);
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){onClose?.();return;}
    closeTimer.current=setTimeout(()=>onClose?.(),250);
  }

  function applyPreset(values) {
    p.setMixerValues({...values,boost:1,enabled:true});
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Equalizer" data-public-dialog tabIndex={-1} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();handleClose();}}} className="mixer-panel fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
          visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full md:max-w-md bg-overlay text-overlay-foreground max-h-[90dvh] overflow-y-auto border rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out ${
          isModified ? "border-white/20" : "border-white/10"} ${
          visible ? "translate-y-0" : "translate-y-full md:translate-y-8"}`}
      >
        <div className="md:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider opacity-60">Equalizer</span>
          <div className="flex items-center gap-1">
            <button aria-pressed={mixer.enabled} onClick={()=>p.setMixerValue("enabled",!mixer.enabled)} className="min-h-11 px-3 rounded-full bg-white/10 text-xs">{mixer.enabled?"On":"Bypassed"}</button>
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
              aria-label="Close equalizer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <PureControls compact/>
        {/* visualizer */}
        <div className="mb-5 rounded-2xl bg-white/[0.03] p-3">
          <MixerVisualizer />
        </div>

        {/* presets */}
        <div role="group" aria-label="Equalizer presets" className="flex gap-2 mb-5 overflow-x-auto no-scrollbar ">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              aria-pressed={mixer.enabled&&mixer.boost===1&&Object.entries(preset.values).every(([key,value])=>mixer[key]===value)} onClick={() => applyPreset(preset.values)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ring-1 ring-white/10 transition ${mixer.enabled&&mixer.boost===1&&Object.entries(preset.values).every(([key,value])=>mixer[key]===value)?"bg-overlay-foreground text-overlay":"bg-white/10 hover:bg-white/20"}`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {!ready&&<p role="alert" className="text-sm mb-4">Audio processing could not start. <button className="underline" onClick={()=>setReady(p.enableMixer?.()!==false)}>Retry</button></p>}
        {/* sliders */}
        <div className="space-y-4">
          <MixerSlider
            label="Bass"
            range="120 Hz"
            value={mixer.bass}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("bass", v)}
          />
          <MixerSlider
            label="Low mids"
            range="400 Hz"
            value={mixer.beat}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("beat", v)}
          />
          <MixerSlider
            label="Presence"
            range="2 kHz"
            value={mixer.vocals}
            min={-12}
            max={12}
            onChange={(v) => p.setMixerValue("vocals", v)}
          />
          <MixerSlider
            label="Treble"
            range="8 kHz"
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

        <p className="text-xs text-center opacity-60 mt-4">
          Shape the full mix in real time. Headroom compensation reduces clipping when bands are boosted.
        </p>
      </div>
    </div>
  );
}