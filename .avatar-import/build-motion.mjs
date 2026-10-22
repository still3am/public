import fs from "node:fs";
import {PFP_ANIMATIONS} from "../src/lib/pfpAnimations.js";
const movements={
eclipse:["translate(-4px,0) scale(.7)","translate(0,0) scale(1)","translate(5px,-2px) scale(.8)"],
butterfly:["translate(-9px,9px) rotate(-25deg) scaleX(.4)","translate(1px,-5px) rotate(12deg) scaleX(1)","translate(13px,-12px) rotate(25deg) scaleX(.45)"],
sun:["translate(0,6px) rotate(-20deg) scale(.7)","translate(0,-2px) rotate(12deg) scale(1)","translate(0,-6px) rotate(30deg) scale(.85)"],
waves:["translate(-12px,0) scaleX(.8)","translate(0,-3px) scaleX(1.1)","translate(12px,1px) scaleX(.9)"],
bubbles:["translate(0,12px) scale(.6)","translate(3,-3px) scale(.9)","translate(-2px,-22px) scale(1.1)"],
rain:["translate(-3px,-14px)","translate(0,0)","translate(4px,19px)"],
glint:["scale(.2) rotate(0deg)","scale(1.05) rotate(35deg)","scale(.1) rotate(80deg)"],
cloud:["translate(-20px,0)","translate(0,-2px)","translate(23px,0)"],
orbit:["rotate(-40deg) scaleX(.6)","rotate(100deg) scaleX(1)","rotate(250deg) scaleX(.65)"],
film:["translate(-3px,1px) scaleY(.6)","translate(2px,-2px) scaleY(1)","translate(-1px,2px) scaleY(.9)"],
energy:["scale(.5) rotate(-5deg)","scale(1.1) rotate(5deg)","scale(.7) rotate(-2deg)"],
tear:["translate(0,-2px) scale(.5)","translate(0,8px) scale(.85)","translate(2px,20px) scale(.7)"],
sprout:["scaleY(.1) rotate(-8deg)","scaleY(.85) rotate(3deg)","scaleY(1) rotate(-2deg)"],
portal:["scale(.2) rotate(0deg)","scale(1.2) rotate(90deg)","scale(1.7) rotate(180deg)"],
smoke:["translate(0,7px) scaleX(.8)","translate(-4px,-7px) scaleX(1.2)","translate(4px,-24px) scaleX(1.5)"],
petals:["translate(0,-8px) rotate(-35deg) scale(.6)","translate(-4px,1px) rotate(20deg) scale(.8)","translate(8px,17px) rotate(80deg) scale(.7)"],
spotlight:["rotate(-14deg) scaleY(.7)","rotate(9deg) scaleY(1.1)","rotate(-4deg) scaleY(.9)"],
rose:["rotate(-10deg) scale(.5)","rotate(5deg) scale(.9)","rotate(0deg) scale(1)"],
mist:["translate(-13px,4px) scaleX(1.1)","translate(0,0) scaleX(1.4)","translate(14px,-4px) scaleX(1.6)"],
heal:["rotate(-15deg) scale(.7)","rotate(0deg) scale(1.05)","rotate(5deg) scale(.9)"],
leaf:["translate(0,-9px) rotate(-30deg)","translate(-8px,2px) rotate(5deg)","translate(4px,15px) rotate(35deg)"],
palm:["rotate(-9deg) skewX(-5deg)","rotate(8deg) skewX(5deg)","rotate(-4deg) skewX(-2deg)"],
halo:["translate(0,5px) scaleX(.8)","translate(0,-3px) scaleX(1)","translate(0,-7px) scaleX(.85)"],
weave:["translate(-5px,-5px) scale(.8)","translate(1px,1px) scale(1)","translate(6px,6px) scale(.9)"],
heartbeat:["scaleX(.2)","scaleX(1.05)","scaleX(.95)"],
bloom:["scale(.25) rotate(-15deg)","scale(.85) rotate(6deg)","scale(1) rotate(0deg)"],
haze:["translate(0,5px) rotate(-8deg) scale(.8)","translate(5px,-8px) rotate(5deg) scale(1.2)","translate(-3px,-20px) rotate(-4deg) scale(1.4)"],
slash:["translate(-10px,10px) scale(.1)","translate(0,0) scale(1)","translate(9px,-9px) scale(1.1)"],
wings:["rotate(-6deg) scaleX(.15)","rotate(5deg) scaleX(1)","rotate(-3deg) scaleX(.2)"],
stamp:["scale(1.4) rotate(-10deg)","scale(.9) rotate(0deg)","scale(1) rotate(0deg)"],
comet:["translate(-17px,15px) scale(.5)","translate(0,0) scale(1)","translate(23px,-20px) scale(.6)"],
horns:["scaleY(.6) rotate(-3deg)","scaleY(1.08) rotate(2deg)","scaleY(.9) rotate(0deg)"],
drip:["translate(0,-8px) scaleY(.5)","translate(0,5px) scaleY(1.2)","translate(0,23px) scaleY(.9)"],
coin:["scaleX(.15) rotate(-8deg)","scaleX(1) rotate(0deg)","scaleX(.1) rotate(8deg)"],
disco:["rotate(0deg) scale(.5)","rotate(85deg) scale(1)","rotate(175deg) scale(.65)"],
radar:["rotate(-90deg)","rotate(90deg)","rotate(270deg)"],
headlights:["translate(-14px,0) scaleX(.5)","translate(0,0) scaleX(1.1)","translate(16px,0) scaleX(.8)"],
ribbon:["rotate(-12deg) scale(.85)","rotate(9deg) scale(1)","rotate(-5deg) scale(.9)"],
hearts:["translate(0,8px) scale(.4)","translate(3,-2px) scale(.9)","translate(-4px,-17px) scale(.65)"],
camo:["scale(.6) rotate(-15deg)","scale(1.1) rotate(10deg)","scale(.8) rotate(-5deg)"],
grass:["skewX(-12deg) rotate(-4deg)","skewX(9deg) rotate(3deg)","skewX(-6deg) rotate(-2deg)"],
float:["translate(-5px,4px)","translate(1px,-5px)","translate(6px,2px)"],
code:["translate(0,-15px) scaleY(.7)","translate(0,0) scaleY(1)","translate(0,17px) scaleY(.8)"],
silver:["scale(.1) rotate(-20deg)","scale(.85) rotate(20deg)","scale(.2) rotate(60deg)"],
midnight:["translate(1px,5px) rotate(-15deg)","translate(-2px,-3px) rotate(5deg)","translate(2px,-7px) rotate(15deg)"],
love:["scale(.65)","scale(1.08)","scale(.9)"],
doodle:["translate(-5px,0) scaleX(.1)","translate(0,0) scaleX(1)","translate(4px,-1px) scaleX(.9)"],
milk:["scale(.15,.5)","scale(1,.8)","scale(1.7,1.1)"],
buckle:["translate(-5px,0) scaleX(.7)","translate(0,0) scaleX(1)","translate(1px,0) scaleX(.95)"],
ember:["translate(0,5px) scale(.7)","translate(-3px,-7px) scale(1)","translate(5px,-20px) scale(1.3)"],
logo:["scaleX(.7) scaleY(1.1)","scaleX(1.05) scaleY(.9)","scale(1)"],
peel:["rotate(-10deg) skewY(-10deg) scale(.8)","rotate(5deg) skewY(5deg) scale(1.05)","rotate(0deg) skewY(0deg) scale(1)"]
};
let css="";
for(const [index,d] of Object.values(PFP_ANIMATIONS).entries()){
 const m=movements[d.motif];if(!m)throw Error(d.id);
 const turn=((index%5)-2)*.45,dy=((index%3)+1)*.35;
 const selector='.pfp-character[data-character="'+d.id+'"]';
 css+=selector+' .pfp-character-mark{animation-name:pfp-accent-'+d.id+'}'+selector+' .pfp-character-art{animation-name:pfp-art-'+d.id+'}\n';
 css+='@keyframes pfp-accent-'+d.id+'{0%,12%,88%,100%{opacity:0;transform:'+m[0]+'}24%{opacity:.35;transform:'+m[0]+'}48%{opacity:.7;transform:'+m[1]+'}76%{opacity:0;transform:'+m[2]+'}}\n';
 css+='@keyframes pfp-art-'+d.id+'{0%,15%,85%,100%{transform:scale(1.015)}42%{transform:translateY(-'+dy+'%) rotate('+turn+'deg) scale(1.025)}64%{transform:translateY('+dy/2+'%) rotate('+-turn/2+'deg) scale(1.015)}}\n';
}
fs.appendFileSync("src/components/pfp-characters.css",css);
console.log("Created "+Object.keys(PFP_ANIMATIONS).length+" signature choreographies");
