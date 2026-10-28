import assert from 'node:assert/strict';
import {COMMUNITY_PREVIEWS,buildCommunityPreviews} from '../src/lib/communityPreview.js';
import {AVATAR_PRESETS} from '../src/lib/avatarPresets.js';
import {BANNER_PRESETS} from '../src/lib/bannerPresets.js';
assert.equal(COMMUNITY_PREVIEWS.length,5);
for(const key of ['id','name','handle','avatar','banner'])assert.equal(new Set(COMMUNITY_PREVIEWS.map(p=>p[key])).size,5);
for(const p of COMMUNITY_PREVIEWS){assert.ok(AVATAR_PRESETS.some(a=>a.id===p.avatar));assert.ok(BANNER_PRESETS.some(b=>b.id===p.banner));assert.equal(p.colors.length,3);assert.ok(p.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c)));}
const catalog=Array.from({length:60},(_,i)=>({id:'song-'+i,artist:'Artist '+i,genre:COMMUNITY_PREVIEWS[i%5].genres[0],is_published:true,approval_status:'approved',audio_url:'song.mp3',uploader_id:'creator-'+i,explicit:i===2}));
catalog.push({id:'hidden',genre:'R&B',is_published:false,approval_status:'approved',audio_url:'private.mp3'});
const original=JSON.stringify(catalog);const result=buildCommunityPreviews(catalog,{blocked:new Set(['creator-0']),showExplicit:false});
assert.equal(JSON.stringify(catalog),original,'preview selection does not mutate catalog');
assert.ok(result.every(p=>p.songs.length===8&&p.featured===p.songs[0]));
assert.equal(new Set(result.flatMap(p=>p.songs.map(t=>t.id))).size,40,'five distinct Top 8 selections');
assert.ok(result.every(p=>p.songs.every(t=>t.id!=='hidden'&&t.id!=='song-0'&&t.id!=='song-2')));
assert.ok(buildCommunityPreviews([]).every(p=>p.songs.length===0&&p.featured===null));
console.log('PASS five unique preview profiles, valid gallery media, diverse Top 8s, safety filters and immutable catalog');
