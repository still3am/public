import assert from "node:assert/strict";
import {inspectAudioHeader,inspectAudioSource,qualityDescription,AUDIO_HEADER_LIMIT} from "../src/lib/audioQuality.js";
function flac(rate=96000,bits=24,channels=2){
 const b=new Uint8Array(42);b.set(new TextEncoder().encode("fLaC"));b[4]=128;b[7]=34;
 const v=new DataView(b.buffer);v.setUint32(18,(rate<<12)|((channels-1)<<9)|((bits-1)<<4));return b;
}
function wav(code=1,bits=16,rate=44100){
 const b=new Uint8Array(44),v=new DataView(b.buffer),s=(at,text)=>b.set(new TextEncoder().encode(text),at);
 s(0,"RIFF");v.setUint32(4,36,true);s(8,"WAVE");s(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,code,true);v.setUint16(22,2,true);v.setUint32(24,rate,true);v.setUint16(34,bits,true);s(36,"data");return b;
}
const f=inspectAudioHeader(flac());assert.deepEqual(f,{kind:"lossless",codec:"FLAC",sampleRate:96000,bitDepth:24,channels:2});assert.equal(qualityDescription(f),"FLAC · 24-bit · 96 kHz · Stereo");
assert.equal(inspectAudioHeader(flac(44100,16,1)).channels,1);
assert.equal(inspectAudioHeader(flac().slice(0,30)).kind,"unknown");
const malformed=flac();malformed[7]=33;assert.equal(inspectAudioHeader(malformed).kind,"unknown");
assert.equal(inspectAudioHeader(new TextEncoder().encode("this is an MP3 renamed to flac")).kind,"unknown");
console.log("PASS lossless classification requires a complete FLAC STREAMINFO header and derives exact source depth/rate");
const pcm=inspectAudioHeader(wav());assert.equal(pcm.kind,"lossless");assert.equal(pcm.codec,"PCM");assert.equal(pcm.bitDepth,16);
assert.equal(inspectAudioHeader(wav(3,32,48000)).codec,"PCM float");
assert.equal(inspectAudioHeader(wav(3,16)).kind,"unknown");
assert.equal(inspectAudioHeader(wav(17)).kind,"lossy");
assert.equal(inspectAudioHeader(new Uint8Array([255,251,144,0])).kind,"lossy");
assert.equal(inspectAudioHeader(new Uint8Array([255,241,0,0])).codec,"AAC");
console.log("PASS PCM/float WAV are identified, compressed WAV and MP3/AAC are never labeled lossless");
let cancelled=0,reads=0,options;
const body={getReader:()=>({read:async()=>{reads++;const bytes=new Uint8Array(AUDIO_HEADER_LIMIT+1024);bytes.set(flac());return {done:false,value:bytes};},cancel:async()=>{cancelled++;}})};
const result=await inspectAudioSource("https://test/audio",{fetcher:async(url,o)=>{options=o;return {ok:true,status:200,body};}});
assert.equal(result.kind,"lossless");assert.equal(reads,1);assert.equal(cancelled,1);assert.equal(options.headers.Range,"bytes=0-65535");
assert.equal(options.signal.aborted,true);
const c=new AbortController();c.abort();await assert.rejects(inspectAudioSource("https://test/audio",{signal:c.signal}),{name:"AbortError"});
await assert.rejects(inspectAudioSource("https://test/audio",{fetcher:async()=>({ok:true,status:206,headers:new Headers({"Content-Range":"bytes 300-900/999"}),body})}),/range/);
assert.equal((await inspectAudioSource("private-file://fake")).kind,"unknown");
console.log("PASS inspection is bounded when Range is ignored, cancels the stream, rejects bad offsets, and honors cancellation");
