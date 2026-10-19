// Shared song-transition preferences (AutoMix / Crossfade).
// Stored in localStorage so the player can read them synchronously
// without reactive plumbing, and settings pages write through here.

const KEY = "public:transitions";

export const TRANSITION_MODES = {
  OFF: "off",
  AUTOMIX: "automix",
  CROSSFADE: "crossfade",
  GAPLESS: "gapless",
};

export const CROSSFADE_MIN = 1;
export const CROSSFADE_MAX = 12;

const DEFAULTS = {
  mode: TRANSITION_MODES.OFF,
  crossfadeSeconds: 4,
  preserveAlbums: true,
};

let memory={...DEFAULTS},volatile=false;
if(typeof window!=="undefined")window.addEventListener("account:cleared",()=>{memory={...DEFAULTS};volatile=false;});
const normalize=v=>({
 preserveAlbums:v?.preserveAlbums!==false,
 mode:Object.values(TRANSITION_MODES).includes(v?.mode)?v.mode:DEFAULTS.mode,
 crossfadeSeconds:Number.isFinite(Number(v?.crossfadeSeconds))?Math.min(CROSSFADE_MAX,Math.max(CROSSFADE_MIN,Number(v.crossfadeSeconds))):DEFAULTS.crossfadeSeconds
});
export function getTransitionSettings(){
 if(volatile)return {...memory};
 try{const raw=localStorage.getItem(KEY);if(raw){memory=normalize(JSON.parse(raw));}else memory={...DEFAULTS};}catch{}
 return {...memory};
}
export function setTransitionSettings(next){
 const merged=normalize({...getTransitionSettings(),...next});memory=merged;
 try{localStorage.setItem(KEY,JSON.stringify(merged));volatile=false;}catch{volatile=true;}
 window.dispatchEvent(new CustomEvent('transitions:change',{detail:{...merged}}));
 return {...merged};
}
export function resetTransitionSettings(){return setTransitionSettings(DEFAULTS);}

// True when a BLENDING mode is active (so the player should fade in/out).
// Gapless is deliberately excluded — it's a hard butt-join, not a fade.
export function isTransitionActive(settings = getTransitionSettings()) {
  return (
    settings.mode === TRANSITION_MODES.CROSSFADE ||
    settings.mode === TRANSITION_MODES.AUTOMIX
  );
}

// Gapless: no fade at all, the next track starts the instant this one ends.
export function isGapless(settings = getTransitionSettings()) {
  return settings.mode === TRANSITION_MODES.GAPLESS;
}
export function shouldUseGapless(settings,current,next){
 if(settings.mode===TRANSITION_MODES.GAPLESS)return true;
 return settings.preserveAlbums!==false&&isTransitionActive(settings)&&!!current?.album_id&&current.album_id===next?.album_id&&Number(next.track_number)===Number(current.track_number)+1&&Number(current.track_number)>0;
}
