export const DEFAULT_PURE={enabled:false,clarity:50,bass:40,balance:40};
export const PURE_PRESETS=[
 {name:"Balanced",description:"Everyday listening",clarity:50,bass:40,balance:40},
 {name:"Voice",description:"Vocals up front",clarity:80,bass:15,balance:50},
 {name:"Warm",description:"Fuller, softer tone",clarity:30,bass:75,balance:25}
];
export function normalizePure(value){
 const result={...DEFAULT_PURE,enabled:value?.enabled===true};
 for(const key of ["clarity","bass","balance"]){
  const n=value?.[key];result[key]=typeof n==="number"&&Number.isFinite(n)?Math.round(Math.max(0,Math.min(100,n))):DEFAULT_PURE[key];
 }
 return result;
}
export function readPure(){
 try{return normalizePure(JSON.parse(localStorage.getItem("public:player_pure")));}catch{return {...DEFAULT_PURE};}
}
export function pureParameters(value){
 const p=normalizePure(value),amount=p.enabled?1:0,c=p.clarity/100*amount,b=p.bass/100*amount,d=p.balance/100*amount;
 const bass=2.4*b,presence=2*c,air=.8*c,mud=c?-1.8*c:0;
 return {bass,presence,air,mud,headroom:10**(-(bass+presence+air)/20),threshold:d?-18*d:0,knee:12*d,ratio:1+1.5*d,attack:.015,release:.25};
}
function target(param,value,time,instant){
 if(instant){param.value=value;return;}
 param.cancelScheduledValues(time);param.setTargetAtTime(value,time,.04);
}
// One serial path avoids comb filtering from mixing a compressor's delayed
// output with undelayed dry audio. Bypass is neutral EQ and unity ratio/gain.
export function createPureGraph(ctx){
 const bass=ctx.createBiquadFilter();bass.type="lowshelf";bass.frequency.value=90;
 const mud=ctx.createBiquadFilter();mud.type="peaking";mud.frequency.value=350;mud.Q.value=.7;
 const presence=ctx.createBiquadFilter();presence.type="peaking";presence.frequency.value=2600;presence.Q.value=.7;
 const air=ctx.createBiquadFilter();air.type="highshelf";air.frequency.value=9000;
 const headroom=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
 bass.connect(mud);mud.connect(presence);presence.connect(air);air.connect(headroom);headroom.connect(compressor);
 const apply=(settings,instant=false)=>{
  const p=pureParameters(settings),t=ctx.currentTime;
  for(const [node,key] of [[bass,"bass"],[mud,"mud"],[presence,"presence"],[air,"air"]])target(node.gain,p[key],t,instant);
  target(headroom.gain,p.headroom,t,instant);
  for(const key of ["threshold","knee","ratio","attack","release"])target(compressor[key],p[key],t,instant);
 };
 apply(DEFAULT_PURE,true);
 return {input:bass,output:compressor,apply};
}
