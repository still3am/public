export const AUDIO_HEADER_LIMIT=65536;
const unknown=()=>({kind:"unknown",codec:"",sampleRate:null,bitDepth:null,channels:null});
const text=(bytes,start,length)=>String.fromCharCode(...bytes.subarray(start,start+length));
function details(codec,sampleRate,bitDepth,channels){
 if(!Number.isInteger(sampleRate)||sampleRate<1000||sampleRate>768000||!Number.isInteger(bitDepth)||bitDepth<4||bitDepth>64||channels<1||channels>32)return unknown();
 return {kind:"lossless",codec,sampleRate,bitDepth,channels};
}
// Inspect container headers, never filenames, MIME claims or decoded AudioBuffers.
// A lossless container cannot establish whether the studio master was once lossy.
export function inspectAudioHeader(input){
 const b=input instanceof Uint8Array?input:new Uint8Array(input),v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 let start=0;
 if(text(b,0,3)==="ID3"&&b.length>=10){
  if([...b.subarray(6,10)].some(value=>value&128))return unknown();
  start=10+((b[6]<<21)|(b[7]<<14)|(b[8]<<7)|b[9])+((b[5]&16)?10:0);
 }
 if(text(b,start,4)==="fLaC"){
  const block=start+4;
  if(b.length<block+38||(b[block]&127)!==0||((b[block+1]<<16)|(b[block+2]<<8)|b[block+3])!==34)return unknown();
  const info=block+4;
  return details("FLAC",v.getUint32(info+10)>>>12,(((b[info+12]&1)<<4)|(b[info+13]>>>4))+1,((b[info+12]>>>1)&7)+1);
 }
 if(text(b,0,4)==="RIFF"&&text(b,8,4)==="WAVE"){
  let offset=12;
  while(offset+8<=b.length){
   const tag=text(b,offset,4),length=v.getUint32(offset+4,true),data=offset+8;
   if(tag==="fmt "){
    if(length<16||data+16>b.length)return unknown();
    let code=v.getUint16(data,true);
    if(code===65534){
     const guid=[0,0,16,0,128,0,0,170,0,56,155,113];
     if(length<40||data+40>b.length||v.getUint16(data+16,true)<22||v.getUint16(data+26,true)!==0||!guid.every((n,i)=>b[data+28+i]===n))return unknown();
     code=v.getUint16(data+24,true);
    }
    if(code!==1&&code!==3)return {kind:"lossy",codec:"Compressed WAV",sampleRate:null,bitDepth:null,channels:null};
    const bits=v.getUint16(data+14,true);
    if(code===3&&bits!==32&&bits!==64)return unknown();
    return details(code===3?"PCM float":"PCM",v.getUint32(data+4,true),bits,v.getUint16(data+2,true));
   }
   if(!length||data+length>b.length)break;
   offset=data+length+(length%2);
  }
  return unknown();
 }
 if(start>0&&start<b.length&&b[start]===255&&(b[start+1]&224)===224)return {kind:"lossy",codec:"MP3",sampleRate:null,bitDepth:null,channels:null};
 if(b[0]===255&&(b[1]&224)===224){
  return {kind:"lossy",codec:(b[1]&246)===240?"AAC":"MP3",sampleRate:null,bitDepth:null,channels:null};
 }
 if(text(b,0,4)==="OggS"){
  const header=text(b,0,Math.min(b.length,512));
  if(header.includes("OpusHead"))return {kind:"lossy",codec:"Opus",sampleRate:null,bitDepth:null,channels:null};
  if(header.includes("vorbis"))return {kind:"lossy",codec:"Vorbis",sampleRate:null,bitDepth:null,channels:null};
 }
 return unknown();
}
export function qualityDescription(info){
 if(info?.kind!=="lossless")return info?.codec||"Source format unavailable";
 return [info.codec,info.bitDepth+"-bit",Number((info.sampleRate/1000).toFixed(3))+" kHz",info.channels===1?"Mono":info.channels===2?"Stereo":info.channels+" channels"].join(" · ");
}
export async function inspectAudioSource(url,{signal,fetcher=fetch}={}){
 if(!url||!/^https?:|^blob:/.test(url))return unknown();
 const controller=new AbortController(),abort=()=>controller.abort();
 if(signal?.aborted)throw new DOMException("Aborted","AbortError");
 signal?.addEventListener("abort",abort,{once:true});
 let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;abort();},12000);
 let reader;
 try{
  const response=await fetcher(url,{headers:{Range:"bytes=0-"+(AUDIO_HEADER_LIMIT-1)},signal:controller.signal});
  if(!response.ok||!response.body?.getReader)throw Error("Source details unavailable");
  if(response.status===206){
   const range=response.headers.get("Content-Range");
   if(range&&!/^bytes 0-/.test(range))throw Error("Unexpected audio range");
  }
  reader=response.body.getReader();const chunks=[];let size=0;
  while(size<AUDIO_HEADER_LIMIT){
   const {done,value}=await reader.read();if(done)break;
   const part=value.subarray(0,AUDIO_HEADER_LIMIT-size);chunks.push(part);size+=part.length;
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return inspectAudioHeader(bytes);
 }catch(error){if(timedOut&&!signal?.aborted)throw Error("Source inspection timed out");throw error;}
 finally{
  clearTimeout(timer);signal?.removeEventListener("abort",abort);
  try{await reader?.cancel();}catch{}controller.abort();
 }
}
