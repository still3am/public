import { Check, Music, Play, Layers, SlidersHorizontal } from "lucide-react";
import { useLiquidGlass } from "@/context/LiquidGlassContext";
import MotionGradient from "@/components/MotionGradient";
const modes = [
{ id: "clear", label: "Clear", description: "Light, translucent surfaces with a soft reflection." },
{ id: "tinted", label: "Tinted", description: "A deeper finish that keeps controls easy to read." },
{ id: "off", label: "Off", description: "Keep Public’s solid surfaces." }];

export default function LiquidGlassControls() {
  const { mode, setMode, persisted } = useLiquidGlass();
  return <div className="liquid-glass-settings">
  <div className={"liquid-glass-demo glass-demo-" + mode} aria-label={"Preview of " + mode + " appearance"} role="img">
   <MotionGradient colors={["#485cce","#c679b5","#67c3bf"]} speed={.65} className="glass-demo-gradient" /><span className="glass-demo-brand hidden">PUBLIC.</span><span className="glass-demo-live hidden">LIVE PREVIEW</span><div className="glass-demo-heading"><small>Made for your music.</small><strong>Your colors. In a new light.</strong></div>
   <div className="glass-demo-surface"><span className="glass-demo-cover"><Music size={22} /></span><span><strong>Your world.</strong><small>Through a different lens.</small></span><Play size={19} fill="currentColor" /></div>
   <div className="glass-demo-tools"><Layers size={18} /><SlidersHorizontal size={18} /><Music size={18} /></div>
  </div>
  <div className="glass-appearance-heading"><div><h3>Choose your finish</h3><p className="glass-settings-intro">Soft reflections. Clear controls. Your colors underneath.</p></div></div>
  <div role="radiogroup" aria-label="Liquid Glass appearance" className="glass-mode-options" onKeyDown={(event) => {if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;event.preventDefault();const current = modes.findIndex((option) => option.id === mode),step = ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1,index = event.key === "Home" ? 0 : event.key === "End" ? modes.length - 1 : (current + step + modes.length) % modes.length;setMode(modes[index].id);const button = event.currentTarget.querySelectorAll("button[role=radio]")[index];if (button instanceof HTMLElement) button.focus();}}>{modes.map((option) => <button key={option.id} type="button" role="radio" tabIndex={mode === option.id ? 0 : -1} aria-checked={mode === option.id} onClick={() => setMode(option.id)}>
   <span className={"glass-mode-swatch swatch-" + option.id} aria-hidden="true"><span /></span><span><strong>{option.label}</strong></span><span className="glass-option-check">{mode === option.id && <Check size={19} />}</span>
  </button>)}</div>
  <p className="glass-mode-description hidden" aria-live="polite">{modes.find((option) => option.id === mode)?.description}</p><div className="glass-applies hidden"><span>Cards</span><span>Player</span><span>Menus</span><span>Comments</span></div>
  <p className="glass-settings-note hidden" role="status">{persisted ? "Applies instantly. Saved for your account on this device." : "Applied for this session. Your browser couldn’t save this preference."}</p>
 </div>;
}