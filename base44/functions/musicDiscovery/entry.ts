import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// A fixed upstream prevents callers from turning discovery into a URL proxy.
// No audio URLs, encrypted media fields, cookies, or provider credentials leave this function.
const cache = new Map();
const TTL = 300000;
const text = value => String(value || '').replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (_, n) => {
 const cp = n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);
 return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):'';
}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').slice(0,300);
function safeUrl(raw, hosts) {
 try { const u = new URL(raw); return u.protocol==='https:'&&!u.username&&!u.password&&hosts.includes(u.hostname)&&(!u.port||u.port==='443')?u.href:''; } catch { return ''; }
}
export function normalizeSong(song) {
 const info=song?.more_info||{};
 const id=String(song?.id||'');
 if(!/^[\w-]{1,64}$/.test(id)||!song?.title)return null;
 const artists=info.artistMap?.primary_artists;
 return {id,provider:'jiosaavn',title:text(song.title),
  artist:Array.isArray(artists)?artists.map(a=>text(a.name)).filter(Boolean).join(', '):text(song.subtitle),
  album_name:text(info.album),release_year:Number(song.year)||0,
  duration:Number(info.duration)||0,explicit:song.explicit_content==='1'||song.explicit_content===true,
  cover_art_url:safeUrl(song.image,['c.saavncdn.com']).replace(/150x150(?=\.)/,'500x500'),
  source_url:safeUrl(song.perma_url,['www.jiosaavn.com','jiosaavn.com']),
  audio_available:false};
}
async function upstream(params) {
 const url=new URL('https://www.jiosaavn.com/api.php');
 for(const [key,value] of Object.entries({...params,_format:'json',_marker:'0',api_version:'4'}))url.searchParams.set(key,String(value));
 const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('External discovery is temporarily unavailable. Try again.');
 const raw=await response.text();
 if(raw.length>2000000)throw Error('Unexpected discovery response');
 return JSON.parse(raw);
}
export default async function handleRequest(req) {
 try {
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:'Sign in to discover music'},{status:401});
  if(user.is_blocked||user.disabled)return Response.json({error:'Account suspended'},{status:403});
  const body=await req.json(),id=typeof body.id==='string'?body.id:'';
  const query=typeof body.q==='string'?body.q.trim().slice(0,100):'';
  if(id&&!/^[\w-]{1,64}$/.test(id))return Response.json({error:'Invalid song selection'},{status:400});
  if(!id&&query.length<2)return Response.json({results:[]});
  const key=id?'id:'+id:'q:'+query.toLowerCase();
  let entry=cache.get(key);
  if(!entry||Date.now()-entry.at>TTL){
   const raw=await upstream(id?{__call:'song.getDetails',pids:id}:{__call:'search.getResults',q:query,p:1,n:20});
   const songs=id?Object.values(raw||{}).filter(v=>v&&typeof v==='object'&&v.id===id):raw?.results;
   if(!Array.isArray(songs))throw Error('External discovery returned an unexpected response. Try again.');
   entry={at:Date.now(),songs:songs.map(normalizeSong).filter(Boolean)};
   if(cache.size>=100)cache.delete(cache.keys().next().value);
   cache.set(key,entry);
  }
  const results=entry.songs.filter(song=>!song.explicit||(user.show_explicit===true&&user.adult_confirmed===true));
  if(id&&!results.length)return Response.json({error:'This song is unavailable or hidden by your content settings.'},{status:404});
  // Caller-scoped reads honor Track RLS. Even admins only receive published
  // matches or their own pending submissions; never another uploader's draft.
  let matches=[],match_check_failed=false;
  try {
   const escape=value=>value.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
   const query={$or:results.map(song=>({title:{$regex:'^'+escape(song.title)+'$',$options:'i'}}))};
   if(results.length){
    const page=await base44.entities.Track.filter(query,'-created_date',100,0,['id','title','artist','duration_seconds','approval_status','is_published','uploader_id','explicit']);
    matches=(Array.isArray(page)?page:page?.items||[]).filter(track=>
     ((track.is_published===true&&track.approval_status==='approved')||(track.uploader_id===user.id&&track.approval_status==='pending'))&&
     (!track.explicit||(user.show_explicit===true&&user.adult_confirmed===true)));
   }
  }catch{match_check_failed=true;}
  const norm=value=>text(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const enriched=results.map(song=>{
   const match=matches.find(track=>norm(track.title)===norm(song.title)&&norm(track.artist)===norm(song.artist)&&(!track.duration_seconds||!song.duration||Math.abs(track.duration_seconds-song.duration)<=4));
   return {...song,existing:match?{id:match.id,status:match.approval_status==='pending'?'pending':'published'}:null};
  });
  return Response.json({results:enriched,provider:'JioSaavn',audio_import_available:false,match_check_failed});
 } catch {
  return Response.json({error:'External discovery is temporarily unavailable. Your Public search and file uploads still work.'},{status:502});
 }
}
if(typeof Deno!=='undefined')Deno.serve(handleRequest);
