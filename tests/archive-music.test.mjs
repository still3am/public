import assert from 'node:assert/strict';
import {archiveTracks,searchArchiveMusic,getArchiveSong,downloadArchiveSong} from '../src/lib/archiveMusic.js';
const metadata={metadata:{mediatype:'audio',title:'A Full Album',creator:'Independent Artist',date:'2024-01-01',licenseurl:'https://creativecommons.org/licenses/by/4.0/'},files:[
 {name:'01-FullSong.mp3',title:'Full Song',source:'original',format:'192Kbps MP3',length:'03:00',size:'2048',track:'1'},
 {name:'01-FullSong_vbr.mp3',title:'Full Song',source:'derivative',format:'VBR MP3',length:'03:00',size:'2048'},
 {name:'sample.mp3',title:'Sample',format:'MP3',length:'00:20',size:'2048'},
 {name:'../private.mp3',format:'MP3',size:'2048'},{name:'huge.mp3',format:'MP3',size:String(90*1024*1024)},
 {name:'locked.mp3',format:'MP3',size:'2048',private:true}]};
const tracks=archiveTracks('album-test',metadata);assert.equal(tracks.length,1);assert.equal(tracks[0].duration,180);assert.equal(tracks[0].audio_available,true);assert.equal(tracks[0].content_rating,'unrated');assert.equal(tracks[0].track_number,1);
assert.equal(archiveTracks('../invalid',metadata).length,0);assert.equal(archiveTracks('album-test',{...metadata,is_dark:true}).length,0);
assert.equal(archiveTracks('album-test',{...metadata,metadata:{...metadata.metadata,nodownload:true}}).length,0);
const originalFetch=globalThis.fetch;let urls=[],mode='normal',downloaded=0;
globalThis.fetch=async(url,options)=>{
 const u=new URL(url);urls.push(u.href);assert.equal(u.hostname,'archive.org');assert.equal(options.credentials,'omit');
 if(u.pathname==='/advancedsearch.php')return Response.json({response:{docs:[{identifier:'album-test'}]}});
 if(u.pathname.startsWith('/metadata/'))return Response.json(metadata);
 assert.ok(u.pathname.startsWith('/download/album-test/'));
 if(options.signal?.aborted)throw new DOMException('Cancelled','AbortError');
 if(mode==='partial')return new Response(new Uint8Array(2048),{status:206,headers:{'content-type':'audio/mpeg'}});
 if(mode==='oversize')return new Response(new Uint8Array(2048),{headers:{'content-type':'audio/mpeg','content-length':String(81*1024*1024)}});
 const length=mode==='truncated'?1800:2048,bytes=new Uint8Array(length);bytes.set(mode==='invalid'?[60,104,116]:[73,68,51]);
 if(mode==='html')return new Response('<html>error</html>',{headers:{'content-type':'text/html'}});
 downloaded++;return new Response(bytes,{headers:{'content-type':'audio/mpeg','content-length':String(length)}});
};
try{
 const songs=await searchArchiveMusic('Full Song');assert.equal(songs.length,1);assert.match(new URL(urls[0]).searchParams.get('q'),/collection:netlabels/);
 const song=await getArchiveSong(songs[0].id);assert.equal(song.title,'Full Song');
 let bytes=0;const result=await downloadArchiveSong({...song,download_url:'http://127.0.0.1/private'},{onProgress:n=>bytes=n});
 assert.equal(result.file.size,2048);assert.equal(result.file.type,'audio/mpeg');assert.equal(bytes,2048);assert.equal(result.song.source_license_url,'https://creativecommons.org/licenses/by/4.0/');
 for(const [failure,message] of [['truncated',/incomplete/],['html',/MP3/],['invalid',/valid MP3/],['partial',/complete audio/],['oversize',/too large/]]){
  mode=failure;await assert.rejects(()=>downloadArchiveSong(song),message);
 }
 mode='normal';const controller=new AbortController();controller.abort();await assert.rejects(()=>downloadArchiveSong(song,{signal:controller.signal}),/Cancelled/);
 await assert.rejects(()=>getArchiveSong('archive:album-test:..%2Fprivate.mp3'),/filename/);
 console.log('PASS full-track discovery, original-file preference, restricted/preview exclusion, fixed download URLs, complete-byte verification, MP3 validation, size limits, provenance and cancellation');
}finally{globalThis.fetch=originalFetch;}
