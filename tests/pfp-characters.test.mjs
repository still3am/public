import assert from "node:assert/strict";
import fs from "node:fs";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
import {PFP_ANIMATIONS,pfpAnimationForUrl} from "../src/lib/pfpAnimations.js";
const css=fs.readFileSync("src/components/pfp-characters.css","utf8");
assert.equal(Object.keys(PFP_ANIMATIONS).length,AVATAR_PRESETS.length);
const signatures=new Set();
for(const avatar of AVATAR_PRESETS){
 const design=pfpAnimationForUrl(avatar.url);assert.equal(design?.id,avatar.id);
 assert.equal(pfpAnimationForUrl("https://publicmusic.base44.app"+avatar.url+"?v=2"),design);
 assert.ok(design.duration>=5&&design.duration<=15);
 signatures.add(JSON.stringify([design.path,design.motif,design.duration]));
 assert.ok(css.includes("@keyframes pfp-accent-"+avatar.id+"{"),avatar.id+" accent");
 assert.ok(css.includes("@keyframes pfp-art-"+avatar.id+"{"),avatar.id+" artwork");
}
assert.equal(signatures.size,AVATAR_PRESETS.length,"every design has a distinct signature");
assert.equal(pfpAnimationForUrl("https://example.com/upload.jpg"),null);
assert.ok(css.includes("prefers-reduced-motion:reduce"));
assert.ok(css.includes("animation-play-state:paused"));
const component=fs.readFileSync("src/components/PfpCharacter.jsx","utf8");
assert.ok(component.includes("IntersectionObserver"));assert.ok(component.includes("document.hidden"));assert.ok(component.includes("saveData"));
console.log("PASS all 52 characters have distinct complete animations, URL matching, static upload isolation and motion safeguards");
