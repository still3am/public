const PUBLIC_ORIGIN='https://publicmusic.base44.app';
let available=false,expires=0,inflight=null;
export function prepareTrackShare(){
 if(Date.now()<expires)return Promise.resolve(available);
 if(inflight)return inflight;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 inflight=fetch(PUBLIC_ORIGIN+'/functions/share-track?health=1',{credentials:'omit',cache:'no-store',signal:controller.signal}).then(async response=>{
  if(!response.ok)return false;
  const body=await response.json();return body?.service==='public-track-share'&&body.version===1;
 }).catch(()=>false).then(ready=>{available=ready;expires=Date.now()+(ready?300000:60000);return ready;}).finally(()=>{clearTimeout(timer);inflight=null;});
 return inflight;
}
export function getTrackShareUrl(track){
 if(!track?.id)throw Error('Song unavailable');
 const id=encodeURIComponent(track.id);
 if(available&&track.is_published===true)return PUBLIC_ORIGIN+'/functions/share-track?id='+id;
 return PUBLIC_ORIGIN+'/track/'+id;
}
