import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  getAudioDuration,
  deriveDefaultTitle,
  extractEmbeddedCover,
  extractEmbeddedTitle,
  extractEmbeddedArtist,
  isAudioFile,
  GENRES,
} from "@/lib/audio-utils";

const IMAGE_EXT_RE =
  /\.(jpe?g|jfif|png|gif|webp|avif|heic|heif|bmp|tiff?|svg|ico|apng)$/i;
import { findDuplicateTracks, hashAudioFile } from "@/lib/duplicateCheck";
import { readAllPages } from "@/lib/readPages";
import { ensureHighResCover } from "@/lib/coverImage";

let uid = 0;
const nextId = () => `u${Date.now()}_${uid++}`;

// Auto-detects explicit flag + cleans up title/artist using AI (internet context).
/** @returns {Promise<any>} */
async function detectMeta(title, artist) {
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt:
        `A user is uploading a song. Filename-derived / tag metadata:\n` +
        `Title: "${title}"\nArtist: "${artist || "unknown"}"\n\n` +
        `Using knowledge of this song (search the web if needed):\n` +
        `1. Is this song explicit (contains profanity / adult content)? If you can't identify the song, assume false.\n` +
        `2. Give the properly formatted song title (no file junk like "official audio", track numbers, underscores).\n` +
        `3. Give the artist name if identifiable, else keep the provided artist or empty string.\n` +
        `4. Choose the single most accurate genre from this exact list (use "Other" if unsure):\n${GENRES.join(", ")}`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          explicit: { type: "boolean" },
          title: { type: "string" },
          artist: { type: "string" },
          genre: { type: "string" },
        },
        required: ["explicit"],
      },
    });
    return typeof res==="string" ? JSON.parse(res) : res || null;
  } catch {
    return null;
  }
}

export function useUploadQueue({ user, isAdmin }) {
 const [items,setItems]=useState([]),[dupes,setDupes]=useState(null),[uploadedCount,setUploadedCount]=useState(0);
 const [catalogError,setCatalogError]=useState('');
 const itemsRef=useRef(items);itemsRef.current=items;
 const catalog=useRef([]),assets=useRef(new Map()),busy=useRef(new Set()),claimedHashes=useRef(new Map()),generation=useRef(0);
 useEffect(()=>{generation.current++;setItems([]);setDupes(null);catalog.current=[];assets.current.clear();claimedHashes.current.clear();},[user?.id]);
 const patch=(id,data)=>setItems(prev=>prev.map(it=>it.id===id?{...it,...data}:it));
 async function refreshDuplicates(){
  try{catalog.current=await readAllPages(opts=>base44.entities.Track.filter({},{sort:'-created_date',fields:['id','title','artist','duration_seconds','uploader_id','uploader_name','audio_url'],...opts}));setCatalogError('');}
  catch{setCatalogError('Metadata comparison is unavailable. Exact-file verification still runs before upload. Retry the comparison.');}
 }
 const warn=(item,hits)=>{
  if(!hits.length)return;
  const hit=hits[0];
  setDupes(prev=>[...(prev||[]).filter(d=>d.id!==item.id),{...item,existingId:hit.id,existingBy:hit.uploader_name||hit.artist||'',existingIsMine:hit.uploader_id===user?.id,reason:hit._match_reason,kind:hit._match_kind}]);
 };
 async function addFiles(fileList){
  const all=Array.from(fileList),files=all.filter(isAudioFile),coverFallback=all.find(f=>f.type.startsWith('image/')||IMAGE_EXT_RE.test(f.name||''));
  if(!files.length)return;
  const batch=files.map(file=>({id:nextId(),file,title:deriveDefaultTitle(file),artist:'',genre:'',duration:0,explicit:false,aiLyrics:false,rightsConfirmed:false,allowDownloads:false,coverFile:null,coverPreviewUrl:'',status:'analyzing',detecting:true,error:'',duplicateAcknowledged:false}));
  setItems(prev=>[...prev,...batch]);await refreshDuplicates();const epoch=generation.current;
  let cursor=0;
  const worker=async()=>{while(cursor<batch.length){const item=batch[cursor++];try{
   const [duration,tagTitle,tagArtist,embedded,sha]=await Promise.all([getAudioDuration(item.file),extractEmbeddedTitle(item.file),extractEmbeddedArtist(item.file),extractEmbeddedCover(item.file),hashAudioFile(item.file)]);
   if(epoch!==generation.current)return;
   const title=tagTitle||item.title,artist=tagArtist||'',rawCover=embedded||coverFallback||null,cover=rawCover?await ensureHighResCover(rawCover):null;
   const coverPreviewUrl=cover?URL.createObjectURL(cover):'';
   const analyzed={...item,title,artist,duration,audio_sha256:sha,coverFile:cover,coverPreviewUrl,status:'ready'};
   assets.current.set(item.id,{sha});patch(item.id,{...analyzed,detecting:true});
   // Include this batch in duplicate comparisons, not only persisted songs.
   const local=catalog.current.concat(batch.filter(t=>t.id!==item.id&&assets.current.get(t.id)?.sha).map(t=>({...t,audio_sha256:assets.current.get(t.id).sha})));
   const hits=findDuplicateTracks(local,analyzed);warn(analyzed,hits);
   const meta=await detectMeta(title,artist);
   if(epoch!==generation.current)return;
   setItems(prev=>prev.map(it=>it.id!==item.id||it.status!=='ready'?it:{...it,detecting:false,explicit:it.explicit||!!meta?.explicit,title:it.title===title?(meta?.title?.trim()||it.title):it.title,artist:it.artist||meta?.artist?.trim()||'',genre:it.genre||(GENRES.includes(meta?.genre?.trim())?meta.genre.trim():'')}));
  }catch(e){if(epoch===generation.current)patch(item.id,{status:'error',detecting:false,error:e.message||'File analysis failed. Remove this file and try again.'});}}};
  await Promise.all(Array.from({length:Math.min(2,batch.length)},worker));
 }
 function remove(id){
  const item=itemsRef.current.find(it=>it.id===id);if(item?.coverPreviewUrl)URL.revokeObjectURL(item.coverPreviewUrl);
  assets.current.delete(id);setItems(prev=>prev.filter(it=>it.id!==id));setDupes(prev=>prev?.filter(it=>it.id!==id));
 }
 async function uploadOne(given){
  const item=itemsRef.current.find(it=>it.id===given.id)||given;
  if(busy.current.has(item.id)||['done','analyzing','error'].includes(item.status))return;
  busy.current.add(item.id);const epoch=generation.current;patch(item.id,{status:'uploading',error:''});
  try{
   if(!item.rightsConfirmed)throw Error('Confirm your rights to this audio, artwork and lyrics.');
   if(!item.title.trim())throw Error('Enter a song title.');
   const memo=assets.current.get(item.id)||{};
   memo.sha ||= item.audio_sha256||await hashAudioFile(item.file);assets.current.set(item.id,memo);
   const hashOwner=claimedHashes.current.get(memo.sha);
   if(hashOwner&&hashOwner!==item.id)throw Error('The same file is already uploading or was uploaded in this batch.');
   const candidate={...item,audio_sha256:memo.sha};
   const hits=findDuplicateTracks(catalog.current,candidate);
   if(hits.some(h=>h._match_kind==='exact')){warn(candidate,hits);throw Error('This identical file already exists. Use the existing song.');}
   if(hits.length&&!item.duplicateAcknowledged){warn(candidate,hits);throw Error('Review the possible match below, then confirm this is a different recording to continue.');}
   const check=(await base44.functions.invoke('securityGateway',{entity:'Track',action:'checkDuplicate',args:[{audio_sha256:memo.sha,upload_request_id:item.id}]})).data;
   if(check?.result?.duplicate)throw Error('This identical file already exists. Use the existing song.');
   if(!check?.result)throw Error('File verification is unavailable. Retry before uploading.');
   claimedHashes.current.set(memo.sha,item.id);
   if(!memo.file_uri){memo.file_uri=(await base44.integrations.Core.UploadPrivateFile({file:item.file})).file_uri;if(!memo.file_uri)throw Error('Audio upload did not return a file.');}
   if(item.coverFile&&memo.coverFile!==item.coverFile){memo.cover_art_url=(await base44.integrations.Core.UploadFile({file:item.coverFile})).file_url;memo.coverFile=item.coverFile;if(!memo.cover_art_url)throw Error('Artwork could not upload. Retry without re-uploading your audio.');}
   if(epoch!==generation.current)throw Error('Account changed. Start this upload again.');
   const ready=!!(item.artist.trim()&&item.genre&&memo.cover_art_url);
   const track=await base44.entities.Track.create({title:item.title.trim(),audio_url:'',audio_file_uri:memo.file_uri,audio_sha256:memo.sha,upload_request_id:item.id,cover_art_url:memo.cover_art_url||'',artist:item.artist.trim(),genre:item.genre||'Other',duration_seconds:item.duration,explicit:item.explicit,rights_confirmed:true,is_downloadable:item.allowDownloads===true,approval_status:ready?(isAdmin?'approved':'pending'):'private',is_published:isAdmin&&ready});
   memo.track=track;catalog.current.push({...track,audio_sha256:memo.sha});
   let warning='';
   if(item.aiLyrics){patch(item.id,{status:'enhancing'});try{const lyrics=(await base44.functions.invoke('generateLyrics',{track_id:track.id})).data?.lyrics;if(!lyrics)throw Error();await base44.entities.Track.update(track.id,{lyrics_text:lyrics});}catch{warning='Audio saved. Lyrics could not generate; retry from the song page.';}}
   if(epoch!==generation.current)return;
   patch(item.id,{status:'done',detecting:false,error:warning,releaseStatus:track.approval_status});setUploadedCount(n=>n+1);
  }catch(e){
   if(!assets.current.get(item.id)?.track&&claimedHashes.current.get(assets.current.get(item.id)?.sha)===item.id)claimedHashes.current.delete(assets.current.get(item.id)?.sha);
   if(epoch===generation.current)patch(item.id,{status:'ready',error:e?.response?.data?.error||e.message||'Upload failed. Retry to resume.'});
  }finally{busy.current.delete(item.id);}
 }
 async function uploadAll(){
  // Serial creation prevents identical files in one batch racing each other.
  for(const item of itemsRef.current.filter(it=>it.status==='ready'))await uploadOne(item);
 }
 const clearFinished=()=>{itemsRef.current.filter(it=>it.status==='done').forEach(it=>remove(it.id));};
 return {items,addFiles,remove,uploadOne,uploadAll,patch,dupes,setDupes,uploadedCount,catalogError,refreshDuplicates,clearFinished};
}
