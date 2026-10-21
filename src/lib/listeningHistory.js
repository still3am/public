import {entityRows} from "@/lib/entityRows";
import {base44} from "@/api/base44Client";
const prefix="public:listening:";
let current=null,busy=false;
function read(uid){try{return JSON.parse(localStorage.getItem(prefix+uid)||"[]");}catch{return [];}}
function save(uid,rows){try{localStorage.setItem(prefix+uid,JSON.stringify(rows));}catch{}}
export async function syncListeningHistory(uid){
 if(!uid||busy||!navigator.onLine)return;
 busy=true;
 try{
  if((await base44.auth.me())?.id!==uid)return;
  for(const row of read(uid)){
   const page=await base44.entities.ListeningSession.filter({session_key:row.session_key},"-created_date",1);
   const found=(Array.isArray(page)?page:entityRows(page)||[])[0];
   if((await base44.auth.me())?.id!==uid)return;
   if(found)await base44.entities.ListeningSession.update(found.id,{listened_seconds:Math.max(found.listened_seconds||0,row.listened_seconds)});
   else await base44.entities.ListeningSession.create(row);
   save(uid,read(uid).filter(item=>item.session_key!==row.session_key||item.listened_seconds>row.listened_seconds));
  }
  window.dispatchEvent(new Event("listening:changed"));
 }catch{/* Account-scoped outbox retries during playback or the next recap load. */}
 finally{busy=false;}
}
export function sampleListening(uid,track,position,playing){
 const now=Date.now();
 if(!uid||!track?.id){current=null;return;}
 if(!current||current.uid!==uid||current.track!==track.id||position+2<current.position){
  current={uid,track:track.id,position,now,seconds:0,lastSave:now,key:crypto.randomUUID(),start:new Date().toISOString()};return;
 }
 const delta=position-current.position,elapsed=(now-current.now)/1000;
 if(playing&&delta>0&&delta<=8&&elapsed<=8)current.seconds+=Math.min(delta,elapsed);
 current.position=position;current.now=now;
 if(current.seconds<5||now-current.lastSave<10000&&playing)return;
 current.lastSave=now;
 const row={session_key:current.key,track_id:track.id,started_at:current.start,listened_seconds:Math.round(current.seconds)};
 const rows=read(uid).filter(item=>item.session_key!==row.session_key);rows.push(row);save(uid,rows);
 syncListeningHistory(uid);
}
export function pendingListening(uid){return read(uid);}
window.addEventListener("account:cleared",()=>{current=null;});
