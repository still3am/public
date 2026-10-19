import assert from 'node:assert/strict';
import {groupAlbums,albumKey,albumUrl} from '../src/lib/albumModel.js';
import {extractAlbumMetadata} from '../src/lib/albumMetadata.js';
const song=(id,extra={})=>({id,title:id,artist:'Drake',album_name:'Views',is_published:true,approval_status:'approved',duration_seconds:60,...extra});
const groups=groupAlbums([
 song('ten',{track_number:10}),song('two',{track_number:2,artist:'Drake feat. Future'}),
 song('disc2',{disc_number:2,track_number:1}),song('unknown'),
 song('other',{artist:'Other Artist'}),song('deluxe',{album_name:'Views (Deluxe)'}),
 song('private',{is_published:false}),song('pending',{approval_status:'pending'}),
 song('untagged',{album_name:''}),song('two',{track_number:2}),
 song('legacy',{album_name:'',album_id:'old',track_number:1})
],[{id:'old',title:'Views',artisan:'Drake',cover_art_url:'https://example.com/cover.jpg'}]);
assert.equal(groups.length,3);
const compilation=groupAlbums([song('lead',{track_number:1,album_artist:'Drake'}),song('guest',{artist:'Guest',album_artist:'Drake',track_number:2})]);assert.equal(compilation.length,1);assert.deepEqual(compilation[0].tracks.map(t=>t.id),['lead','guest']);
const views=groups.find(g=>g.key===albumKey('DRAKE',' views '));
assert.deepEqual(views.tracks.map(t=>t.id),['legacy','two','ten','unknown','disc2']);
assert.equal(views.duration,300);assert.equal(views.cover_art_url,'https://example.com/cover.jpg');
assert.equal(decodeURIComponent(albumUrl(views).slice(7)),views.key);
assert.notEqual(albumKey('Drake','Views'),albumKey('Other Artist','Views'));
assert.notEqual(albumKey('Drake','Views'),albumKey('Drake','Views (Deluxe)'));
console.log('PASS album grouping separates artists and editions, resolves legacy IDs, excludes private/pending/untagged tracks and orders discs numerically');
const frames=[['TALB','Views'],['TPE2','Drake'],['TRCK','10/20'],['TPOS','2/2'],['TDRC','2016']].map(([id,value])=>{
 const data=Buffer.concat([Buffer.from([3]),Buffer.from(value)]),header=Buffer.alloc(10);header.write(id);header.writeUInt32BE(data.length,4);return Buffer.concat([header,data]);
});
const tag=Buffer.concat(frames),header=Buffer.from([73,68,51,3,0,0,(tag.length>>>21)&127,(tag.length>>>14)&127,(tag.length>>>7)&127,tag.length&127]);
const audio=Buffer.alloc(417*3);for(let n=0;n<3;n++)Buffer.from([255,251,144,100]).copy(audio,n*417);
const metadata=await extractAlbumMetadata(new Blob([header,tag,audio],{type:'audio/mpeg'}));
assert.equal(metadata.album_name,'Views');assert.equal(metadata.album_artist,'Drake');assert.equal(metadata.track_number,10);assert.equal(metadata.disc_number,2);assert.equal(metadata.release_year,2016);
assert.equal((await extractAlbumMetadata(new Blob(['invalid'],{type:'audio/mpeg'}))).album_name,'');
console.log('PASS embedded MP3 album, album artist, track/disc fractions and release year survive the actual local metadata parser; invalid audio degrades safely');
