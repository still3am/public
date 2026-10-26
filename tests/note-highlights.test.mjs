import assert from 'node:assert/strict';
import {measureNoteAudio,suggestedNoteMoments,readNoteAudioBytes} from '../src/lib/noteHighlights.js';
const rate=4000,duration=100,data=new Float32Array(rate*duration);
for(let i=0;i<data.length;i++){const time=i/rate,amplitude=(time>=20&&time<38)||(time>=62&&time<80)?.8:.025;data[i]=Math.sin(i*.31)*amplitude;}
const profile=measureNoteAudio({duration,sampleRate:rate,numberOfChannels:1,getChannelData:()=>data});
assert.equal(profile.waveform.length,96);assert.equal(profile.energy.length,400);assert.ok(profile.waveform.every(value=>value>=0&&value<=1));
const moments=suggestedNoteMoments(profile,15);
assert.ok(moments.some(time=>time>=19&&time<=24),'first energetic passage is suggested');
assert.ok(moments.some(time=>time>=61&&time<=66),'second energetic passage is suggested');
assert.ok(moments.every(time=>time>=0&&time+15<=duration));assert.ok(moments.length<=3);
assert.deepEqual(suggestedNoteMoments({...profile,energy:profile.energy.map(()=>0)},15),[],'silence has no invented best moments');
assert.deepEqual(suggestedNoteMoments(profile,100),[]);
assert.throws(()=>measureNoteAudio({duration:700,sampleRate:rate}),/too long/);
let cancelled=0,reads=0;
const response={ok:true,headers:{get:()=>null},body:{getReader:()=>({read:async()=>reads++?{done:true}:{done:false,value:new Uint8Array([1,2,3])},cancel:async()=>cancelled++})}};
assert.deepEqual(new Uint8Array(await readNoteAudioBytes(response)),new Uint8Array([1,2,3]));assert.equal(cancelled,1);
await assert.rejects(readNoteAudioBytes({ok:true,headers:{get:()=>100}},undefined,10),/too large/);
const abort=new AbortController();abort.abort();reads=0;await assert.rejects(readNoteAudioBytes(response,abort.signal),/Cancelled/);assert.equal(cancelled,2);
console.log('PASS measured waveform, real energy-based highlights, no silent-track suggestions, valid clip windows, bounded download and cancellation');
