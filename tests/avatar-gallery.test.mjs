import assert from "node:assert/strict";
import fs from "node:fs";
import {AVATAR_PRESETS} from "../src/lib/avatarPresets.js";
import {loadAvatarGallery,removeGalleryAvatar} from "../src/lib/avatarGallery.js";
let role="user",removed=[],writes=0,lost=false,fail=false;
const client={auth:{me:async()=>({role})},entities:{AvatarRemoval:{list:async()=>removed,filter:async q=>removed.filter(row=>row.avatar_id===q.avatar_id),create:async row=>{writes++;if(fail)throw Error("offline");removed.push(row);if(lost)throw Error("lost response");}}}};
const id=AVATAR_PRESETS[0].id;
await assert.rejects(removeGalleryAvatar(client,id),/Only admins/);assert.equal(writes,0);
role="admin";await assert.rejects(removeGalleryAvatar(client,"unknown"),/Unknown/);
await removeGalleryAvatar(client,id);assert.equal((await loadAvatarGallery(client)).some(row=>row.id===id),false);
assert.equal(AVATAR_PRESETS.some(row=>row.id===id),true,"saved profile compatibility remains");
lost=true;await removeGalleryAvatar(client,AVATAR_PRESETS[1].id);
fail=true;await assert.rejects(removeGalleryAvatar(client,AVATAR_PRESETS[2].id),/offline/);
const schema=JSON.parse(fs.readFileSync("base44/entities/AvatarRemoval.jsonc","utf8"));
for(const action of ["create","update","delete"])assert.equal(schema.rls[action].user_condition.role,"admin");
assert.equal(schema.rls.read,null);
console.log("PASS gallery removal: admin authorization, persisted filtering, saved-avatar compatibility, lost response and failed writes");

const clips=AVATAR_PRESETS.filter(row=>row.videoUrl);
assert.equal(clips.length,7,"all seven requested clips are included");
const {profileViewerMedia}=await import("../src/lib/profileViewerMedia.js");
for(const clip of clips){
 assert.match(clip.videoUrl,/^https:\/\/media\.base44\.com\/videos\/public\//);
 assert.equal(profileViewerMedia({avatar_preset:clip.url}).source,clip.videoUrl,"saved gallery clip resolves to the actual video");
 assert.equal(profileViewerMedia({avatar_preset:clip.url}).type,"video");
}
console.log("PASS seven hosted gallery clips and saved-avatar video playback resolution");
