export const FLOW_MOTIONS=["flow","orbit","tide","still"];
export const FLOW_DIRECTIONS=["evolve","right","left","up","down","diagonal"];
export const normalizeFlowMotion=value=>FLOW_MOTIONS.includes(value)?value:"flow";
export const normalizeFlowDirection=value=>FLOW_DIRECTIONS.includes(value)?value:"evolve";
// A deterministic choreography, driven by continuous time rather than random jumps.
export function flowState(time,motion="flow",direction="evolve"){
 const t=Number.isFinite(time)?time:0;
 const orbit=.16+.14*Math.sin(t*.13),tide=.12+.10*Math.sin(t*.09+1.8);
 const weights=motion==="orbit"?[0,1,0]:motion==="tide"?[0,0,1]:[1-orbit-tide,orbit,tide];
 const headings={right:0,left:Math.PI,up:Math.PI/2,down:-Math.PI/2,diagonal:Math.PI/4};
 const angle=direction in headings?headings[direction]:t*.10+.42*Math.sin(t*.17);
 return {weights,angle};
}
export const approachAngle=(from,to,blend)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*blend;
