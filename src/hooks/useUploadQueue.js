import {canUploadMusic} from '@/lib/creatorAccess';
import {findSongInfo} from '@/lib/songInfo';
import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import {extractAlbumMetadata} from "@/lib/albumMetadata";
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

// Catalog lookup never guesses explicit status or overwrites user edits.
async function detectMeta(title,artist,duration,albumTags){
 try{
 const info=await findSongInfo({title,artist,duration_seconds:duration,...albumTags});
 if(!info)return null;
 const normalize=value=>String(value).toLowerCase().replace(/[^a-z0-9]/g,'');
 const genre=GENRES.find(g=>(info.genres||[]).some(name=>normalize(name)===normalize(g)))||'';
 return {title:info.title,genre,artist:info.artists,album_name:info.album,album_artist:info.albumArtist,release_year:Number(info.releaseDate?.slice(0,4))||0};
 }catch{return null;}
}

export function useUploadQueue({ user, isAdmin }) {
 const [items,setItems]=useState([]),[dupes,setDupes]=useState(null),[uploadedCount,setUploadedCount]=useState(0);
 const [catalogError,setCatalogError]=useState('');
 const itemsRef=useRef(items);itemsRef.current=items;
 const catalog=useRef([]),assets=useRef(new Map()),busy=useRef(new Set()),claimedHashes=useRef(new Map()),generation=useRef(0),batchBusy=useRef(false);
 useEffect(()=>{generation.current++;setItems([]);setDupes(null);setUploadedCount(0);setCatalogError('');catalog.current=[];assets.current.clear();claimedHashes.current.clear();busy.current.clear();batchBusy.current=false;return()=>{generation.current++;itemsRef.current.forEach(item=>{if(item.coverPreviewUrl)URL.revokeObjectURL(item.coverPreviewUrl);});};},[user?.id]);
 const metadataEdits=useRef(new Map());
 const updateItem=(id,data)=>setItems(prev=>prev.map(it=>it.id===id?{...it,...data}:it));
 const patch=(id,data)=>{
  const edited=metadataEdits.current.get(id)||{};
  for(const key of ['title','artist','genre','explicit','album_name','album_artist','track_number','disc_number','release_year'])if(Object.hasOwn(data,key))edited[key]=true;
  metadataEdits.current.set(id,edited);updateItem(id,data);
 };
 async function refreshDuplicates(){
  const epoch=generation.current;
  try{const next=await readAllPages(opts=>base44.entities.Track.filter({},{sort:'-created_date',fields:['id','title','artist','duration_seconds','uploader_id','uploader_name','audio_url'],...opts}));if(epoch===generation.current){catalog.current=next;setCatalogError('');}}
  catch{if(epoch===generation.current)setCatalogError('Metadata comparison is unavailable. Exact-file verification still runs before upload. Retry the comparison.');}
 }
 const warn=(item,hits)=>{
  if(!hits.length)return;
  const hit=hits[0];
  setDupes(prev=>[...(prev||[]).filter(d=>d.id!==item.id),{...item,existingId:hit.id,existingBy:hit.uploader_name||hit.artist||'',existingIsMine:hit.uploader_id===user?.id,reason:hit._match_reason,kind:hit._match_kind}]);
 };
 async function addFiles(fileList){
  if(!canUploadMusic(user))return;const epoch=generation.current;
  const all=Array.from(fileList),files=all.filter(isAudioFile),coverFallback=all.find(f=>f.type.startsWith('image/')||IMAGE_EXT_RE.test(f.name||''));
  if(!files.length)return;
  const batch=files.map(file=>({id:nextId(),file,title:deriveDefaultTitle(file),artist:'',album_name:'',album_artist:'',track_number:0,disc_number:0,release_year:0,genre:'',duration:0,explicit:false,rightsConfirmed:false,allowDownloads:false,videoFile:null,coverFile:null,coverPreviewUrl:'',status:'analyzing',detecting:true,error:'',duplicateAcknowledged:false}));
  setItems(prev=>[...prev,...batch]);await refreshDuplicates();if(epoch!==generation.current)return;
  let cursor=0;
  const worker=async()=>{while(cursor<batch.length){const item=batch[cursor++];try{
   const [duration,tagTitle,tagArtist,embedded,sha,albumTags]=await Promise.all([getAudioDuration(item.file),extractEmbeddedTitle(item.file),extractEmbeddedArtist(item.file),extractEmbeddedCover(item.file),hashAudioFile(item.file),extractAlbumMetadata(item.file)]);
   if(epoch!==generation.current)return;if(!itemsRef.current.some(row=>row.id===item.id))continue;
   const title=tagTitle||item.title,artist=tagArtist||'',rawCover=embedded||coverFallback||null,cover=rawCover?await ensureHighResCover(rawCover):null;
   if(epoch!==generation.current)return;if(!itemsRef.current.some(row=>row.id===item.id))continue;
   const coverPreviewUrl=cover?URL.createObjectURL(cover):'';
   const analyzed={...item,title,artist,duration,audio_sha256:sha,coverFile:cover,coverPreviewUrl,status:'ready'};
   assets.current.set(item.id,{sha});
   setItems(prev=>prev.map(it=>{
    if(it.id!==item.id)return it;
    const edited=metadataEdits.current.get(item.id)||{};
    return {...it,...Object.fromEntries(Object.entries(albumTags).filter(([key])=>!edited[key])),duration,audio_sha256:sha,
     title:edited.title?it.title:title,artist:edited.artist?it.artist:artist,
     coverFile:it.coverFile||cover,coverPreviewUrl:it.coverPreviewUrl||coverPreviewUrl,
     status:'ready',detecting:true};
   }));
   // Include this batch in duplicate comparisons, not only persisted songs.
   const local=catalog.current.concat(batch.filter(t=>t.id!==item.id&&assets.current.get(t.id)?.sha).map(t=>({...t,audio_sha256:assets.current.get(t.id).sha})));
   const hits=findDuplicateTracks(local,analyzed);warn(analyzed,hits);
   const meta=await detectMeta(title,artist,duration,albumTags);
   if(epoch!==generation.current)return;
   setItems(prev=>prev.map(it=>{
    if(it.id!==item.id)return it;
    if(it.status!=='ready')return {...it,detecting:false};
    const edited=metadataEdits.current.get(item.id)||{};
    const text=key=>typeof meta?.[key]==='string'?meta[key].trim():'';
    const missingAlbum=!it.album_name||/^(unknown(?: album)?|untitled|n\/a)$/i.test(it.album_name.trim());
    return {...it,detecting:false,
     album_name:!edited.album_name&&missingAlbum?(text('album_name')||it.album_name):it.album_name,
     album_artist:!edited.album_artist&&!it.album_artist?(text('album_artist')||it.album_artist):it.album_artist,
     release_year:!edited.release_year&&!it.release_year?(meta?.release_year||0):it.release_year,
     explicit:edited.explicit?it.explicit:it.explicit||meta?.explicit===true,
     title:!edited.title&&it.title===title?(text('title')||it.title):it.title,
     artist:edited.artist?it.artist:it.artist||text('artist'),
     genre:edited.genre?it.genre:it.genre||(GENRES.includes(text('genre'))?text('genre'):'')};
   }));
  }catch(e){if(epoch===generation.current)updateItem(item.id,{status:'error',detecting:false,error:e.message||'File analysis failed. Remove this file and try again.'});}}};
  await Promise.all(Array.from({length:Math.min(2,batch.length)},worker));
 }
 function remove(id){
  const item=itemsRef.current.find(it=>it.id===id);if(item?.coverPreviewUrl)URL.revokeObjectURL(item.coverPreviewUrl);
  assets.current.delete(id);metadataEdits.current.delete(id);setItems(prev=>prev.filter(it=>it.id!==id));setDupes(prev=>prev?.filter(it=>it.id!==id));
 }
 async function uploadOne(given){
  const item=itemsRef.current.find(it=>it.id===given.id)||given;
  if(!canUploadMusic(user)||busy.current.has(item.id)||['done','analyzing','error'].includes(item.status))return;
  busy.current.add(item.id);const epoch=generation.current;updateItem(item.id,{status:'uploading',error:''});
  try{
   if(!item.rightsConfirmed)throw Error('Confirm your rights to this audio, artwork, lyrics and any attached video.');
   if(!item.title.trim())throw Error('Enter a song title.');
   const memo=assets.current.get(item.id)||{};
   memo.sha ||= item.audio_sha256||await hashAudioFile(item.file);if(epoch!==generation.current)throw Error('Account changed. Start this upload again.');assets.current.set(item.id,memo);
   const hashOwner=claimedHashes.current.get(memo.sha);
   if(hashOwner&&hashOwner!==item.id)throw Error('The same file is already uploading or was uploaded in this batch.');
   // Reserve before the first server request: two manual upload clicks must
   // not both pass the same local-file check while awaiting verification.
   claimedHashes.current.set(memo.sha,item.id);
   const current=await base44.auth.me();if(current?.id!==user?.id)throw Error('Your account changed. Start this upload again.');if(!canUploadMusic(current))throw Error('Upload access requires administrator approval.');
   const candidate={...item,audio_sha256:memo.sha};
   const check=(await base44.functions.invoke('securityGateway',{entity:'Track',action:'checkDuplicate',args:[{audio_sha256:memo.sha,upload_request_id:item.id}]})).data;
   if(epoch!==generation.current)throw Error('Account changed. Start this upload again.');
   if(check?.result?.duplicate)throw Error('This identical file already exists. Use the existing song.');
   if(!check?.result)throw Error('File verification is unavailable. Retry before uploading.');
   // A server-confirmed retry resumes the original upload rather than being
   // mistaken for a new recording with matching metadata.
   if(!check.result.resumable){
    const hits=findDuplicateTracks(catalog.current,candidate);
    if(hits.some(h=>h._match_kind==='exact')){warn(candidate,hits);throw Error('This identical file already exists. Use the existing song.');}
    if(hits.length&&!item.duplicateAcknowledged){warn(candidate,hits);throw Error('Review the possible match below, then confirm this is a different recording to continue.');}
   }
   if(!memo.file_uri){memo.file_uri=(await base44.integrations.Core.UploadPrivateFile({file:item.file})).file_uri;if(!memo.file_uri)throw Error('Audio upload did not return a file.');}
   if(item.coverFile&&memo.coverFile!==item.coverFile){memo.cover_art_url=(await base44.integrations.Core.UploadFile({file:item.coverFile})).file_url;memo.coverFile=item.coverFile;if(!memo.cover_art_url)throw Error('Artwork could not upload. Retry without re-uploading your audio.');}
   if(epoch!==generation.current)throw Error('Account changed. Start this upload again.');
   if(item.videoFile){
    if(!/\.(mp4|webm)$/i.test(item.videoFile.name)||item.videoFile.size>100*1024*1024)throw Error('Choose an MP4 or WebM video under 100 MB.');
    if(memo.videoFile!==item.videoFile){memo.video_uri=(await base44.integrations.Core.UploadPrivateFile({file:item.videoFile})).file_uri;if(!memo.video_uri)throw Error('Video upload did not finish. Retry to resume.');memo.videoFile=item.videoFile;}
   }
   if(epoch!==generation.current)throw Error('Account changed. Start this upload again.');
   const ready=!!(item.artist.trim()&&item.genre&&memo.cover_art_url);
   const track=await base44.entities.Track.create({title:item.title.trim(),audio_url:'',audio_file_uri:memo.file_uri,...(item.videoFile?{music_video_file_uri:memo.video_uri,video_rights_confirmed:true}:{}),audio_sha256:memo.sha,upload_request_id:item.id,cover_art_url:memo.cover_art_url||'',artist:item.artist.trim(),album_name:(item.album_name||'').trim(),album_artist:(item.album_artist||'').trim(),track_number:Number(item.track_number)||0,disc_number:Number(item.disc_number)||0,release_year:Number(item.release_year)||0,genre:item.genre||'Other',duration_seconds:item.duration,explicit:item.explicit,rights_confirmed:true,is_downloadable:item.allowDownloads===true,approval_status:ready?(isAdmin?'approved':'pending'):'private',is_published:isAdmin&&ready});
   memo.track=track;catalog.current.push({...track,audio_sha256:memo.sha});
   let warning='';
   if(epoch!==generation.current)return;
   updateItem(item.id,{status:'done',detecting:false,error:warning,releaseStatus:track.approval_status});setUploadedCount(n=>n+1);
  }catch(e){
   if(!assets.current.get(item.id)?.track&&claimedHashes.current.get(assets.current.get(item.id)?.sha)===item.id)claimedHashes.current.delete(assets.current.get(item.id)?.sha);
   if(epoch===generation.current)updateItem(item.id,{status:'ready',error:Number(e?.response?.status||e?.status)===402?'Upload paused: the app needs available integration credits. Your file is still queued.':e?.response?.data?.error||e.message||'Upload did not finish. Retry to resume.'});
  }finally{busy.current.delete(item.id);}
 }
 async function uploadAll(){
  if(batchBusy.current)return;batchBusy.current=true;const epoch=generation.current;
  try{for(const item of itemsRef.current.filter(it=>it.status==='ready')){if(epoch!==generation.current)break;await uploadOne(item);}}
  finally{if(epoch===generation.current)batchBusy.current=false;}
 }
 const clearFinished=()=>{itemsRef.current.filter(it=>it.status==='done').forEach(it=>remove(it.id));};
 return {items,addFiles,remove,uploadOne,uploadAll,patch,dupes,setDupes,uploadedCount,catalogError,refreshDuplicates,clearFinished};
}
