import {Check,Music,Play,Layers,SlidersHorizontal} from "lucide-react";
import {useLiquidGlass} from "@/context/LiquidGlassContext";
const modes=[
 {id:"clear",label:"Clear",description:"More transparent. Let your colors come through."},
 {id:"tinted",label:"Tinted",description:"A richer tint with stronger contrast."},
 {id:"off",label:"Off",description:"Keep Public’s solid surfaces."}
];
export default function LiquidGlassControls(){
 const {mode,setMode,persisted}=useLiquidGlass();
 return <div className="liquid-glass-settings">
  <div className={"liquid-glass-demo glass-demo-"+mode} aria-label={"Preview of "+mode+" appearance"} role="img">
   <div className="glass-demo-orb"/><span className="glass-demo-brand">PUBLIC.</span>
   <div className="glass-demo-surface"><span className="glass-demo-cover"><Music size={22}/></span><span><strong>Your world.</strong><small>Through a different lens.</small></span><Play size={19} fill="currentColor"/></div>
   <div className="glass-demo-tools"><Layers size={18}/><SlidersHorizontal size={18}/><Music size={18}/></div>
  </div>
  <p className="glass-settings-intro">A softer, translucent look for cards, the player and menus—including Discover People.</p>
  <div role="radiogroup" aria-label="Liquid Glass appearance" className="glass-mode-options">{modes.map(option=><button key={option.id} type="button" role="radio" aria-checked={mode===option.id} onClick={()=>setMode(option.id)}>
   <span><strong>{option.label}</strong><small>{option.description}</small></span><span className="glass-option-check">{mode===option.id&&<Check size={19}/>}</span>
  </button>)}</div>
  <p className="glass-settings-note" role="status">{persisted?"Applies instantly. Saved for your account on this device.":"Applied for this session. Your browser couldn’t save this preference."}</p>
 </div>;
}
