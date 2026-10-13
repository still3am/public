export const DEFAULT_MIXER = { bass: 0, beat: 0, vocals: 0, treble: 0, boost: 1, enabled: true };
export const EQ_PRESETS = [
 {label:"Flat",values:{bass:0,beat:0,vocals:0,treble:0}},
 {label:"Bass boost",values:{bass:5,beat:1,vocals:0,treble:0}},
 {label:"Clear",values:{bass:-2,beat:-1,vocals:3,treble:2}},
 {label:"Warm",values:{bass:3,beat:1,vocals:0,treble:-2}},
 {label:"Bright",values:{bass:-1,beat:0,vocals:1,treble:4}},
 {label:"Balanced",values:{bass:2,beat:-1,vocals:1,treble:2}},
];
export function normalizeMixer(value) {
 const m={...DEFAULT_MIXER};
 for(const key of ["bass","beat","vocals","treble"]) {
  const n=value?.[key];m[key]=typeof n==="number"&&Number.isFinite(n)?Math.max(-12,Math.min(12,n)):0;
 }
 m.boost=typeof value?.boost==="number"&&Number.isFinite(value.boost)?Math.max(.5,Math.min(1.5,value.boost)):1;
 m.enabled=value?.enabled!==false;
 return m;
}
export function mixerHeadroom(m) {
 if(!m.enabled)return 1;
 // Sum positive boosts conservatively; overlapping filter skirts can add.
 const boostDb=["bass","beat","vocals","treble"].reduce((sum,key)=>sum+Math.max(0,m[key]),0);
 return Math.pow(10,-boostDb/20)*m.boost;
}
export function smoothAudioParam(param,value,time) {
 param.cancelScheduledValues(time);
 param.setTargetAtTime(value,time,.025);
}
