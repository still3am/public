import assert from 'node:assert/strict';
import {createNotePreview} from '../src/lib/notePreview.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
 const queue=['original','next'],original={position:73,playing:true},audios=[],states=[];let lease,acquisitions=0,restores=0,disposed=0;
 const controller=createNotePreview({
  acquire(cancel){acquisitions++;const wasPlaying=original.playing;original.playing=false;lease={cancel,valid:true,wasPlaying};const current=lease;return {isCurrent:()=>current.valid,resolve:async track=>({url:track.id,dispose:()=>disposed++}),release(){if(current.valid){current.valid=false;original.playing=wasPlaying;restores++;}}};},
  createAudio(){const audio={paused:true,play:async function(){this.paused=false;},pause(){this.paused=true;},removeAttribute(){this.src='';},load(){}};audios.push(audio);return audio;},
  onChange:value=>states.push(value)
 });
 return {controller,queue,original,audios,states,get lease(){return lease;},get acquisitions(){return acquisitions;},get restores(){return restores;},get disposed(){return disposed;}};
}
{
 const f=fixture();await f.controller.play({id:'note'});
 assert.equal(f.original.playing,false);assert.equal(f.audios[0].paused,false);
 f.controller.stop();assert.equal(f.original.playing,true);assert.equal(f.original.position,73);assert.deepEqual(f.queue,['original','next']);assert.equal(f.disposed,1);
}
{
 const f=fixture();f.original.playing=false;await f.controller.play({id:'note'});f.controller.stop();assert.equal(f.original.playing,false);
}
{
 const f=fixture();await f.controller.play({id:'one'});await f.controller.play({id:'two'});assert.equal(f.acquisitions,1);assert.equal(f.restores,0);assert.equal(f.audios[0].paused,true);f.controller.stop();assert.equal(f.restores,1);
}
{
 const f=fixture(),pending=deferred();const play=f.controller.play({id:'note'});f.audios[0].play=()=>pending.promise;
 await Promise.resolve();f.controller.stop();pending.resolve();await play;assert.equal(f.audios[0].paused,true);assert.equal(f.original.playing,true);
}
{
 const f=fixture();await f.controller.play({id:'note'});f.lease.valid=false;f.lease.cancel();f.controller.stop();assert.equal(f.restores,0);assert.equal(f.audios[0].paused,true);
}
{
 const f=fixture();await f.controller.play({id:'note'});await f.controller.play({id:'note'});assert.equal(f.audios[0].paused,true);await f.controller.play({id:'note'});assert.equal(f.audios[0].paused,false);f.controller.stop();
}
console.log('PASS isolated note audio, queue preservation, paused-session restoration, switching previews, late startup cancellation and main-player takeover');
{
 let restored=0,audio;
 const controller=createNotePreview({resumeOnEnd:true,acquire:()=>({isCurrent:()=>true,resolve:async()=>({url:'note',dispose(){}}),release(){restored++;}}),createAudio:()=>audio={paused:true,play:async function(){this.paused=false;},pause(){this.paused=true;},removeAttribute(){},load(){}}});
 await controller.play({id:'song'});audio.onended();assert.equal(restored,1);controller.stop();assert.equal(restored,1,'ending and closing cannot resume twice');
 console.log('PASS featured-song previews restore the original session automatically at the end');
}
