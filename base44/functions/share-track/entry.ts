import {createClientFromRequest} from 'npm:@base44/sdk';
const ORIGIN='https://publicmusic.base44.app';
const escape=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function imageURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||/^(localhost|127\.|10\.|192\.168\.|\[)/i.test(u.hostname)||u.pathname.includes('/private/')||[...u.searchParams.keys()].some(k=>/token|signature|credential/i.test(k)))return '';return u.href;}catch{return '';}}
export default async function handler(req){
 const url=new URL(req.url);
 if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 if(url.searchParams.get('health')==='1')return Response.json({service:'public-track-share',version:1},{headers:{'Cache-Control':'no-store'}});
 const id=url.searchParams.get('id')||'';
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return new Response('Song unavailable',{status:404});
 try{
  const sdk=createClientFromRequest(req).asServiceRole;
  const page=await sdk.entities.Track.filter({id,is_published:true,approval_status:'approved'},'-created_date',1,0,['id','title','artist','cover_art_url','uploader_id','explicit']);
  const rows=Array.isArray(page)?page:page?.items;
  if(!Array.isArray(rows))throw Error('Invalid catalog response');
  const track=rows[0];
  if(!track||track.explicit===true)return new Response('Open PUBLIC to view this song.',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  const owners=await sdk.entities.User.filter({id:track.uploader_id},'-created_date',1,0,['id','is_blocked','disabled']);
  const owner=(Array.isArray(owners)?owners:owners?.items||[])[0];
  if(!owner||owner.is_blocked||owner.disabled)return new Response('Song unavailable',{status:404,headers:{'Cache-Control':'no-store'}});
  const title=String(track.title||'Song').slice(0,300),artist=String(track.artist||'').slice(0,300),image=imageURL(track.cover_art_url);
  const target=ORIGIN+'/track/'+encodeURIComponent(id),share=ORIGIN+'/functions/share-track?id='+encodeURIComponent(id);
  const description=(artist?artist+' · ':'')+'Listen on PUBLIC.';
  const nonce=crypto.randomUUID();
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}${artist?' — '+escape(artist):''} | PUBLIC.</title><meta name="description" content="${escape(description)}"><meta property="og:type" content="music.song"><meta property="og:site_name" content="PUBLIC."><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(share)}">${image?`<meta property="og:image" content="${escape(image)}"><meta property="og:image:alt" content="${escape(title)} artwork"><meta name="twitter:image" content="${escape(image)}">`:''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><link rel="canonical" href="${escape(target)}"><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#101010;color:white;font-family:system-ui,sans-serif}main{width:min(90vw,420px);padding:32px 0}img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px}h1{font-size:28px;line-height:1.15;margin:24px 0 8px}p{color:#b0b0b6;margin:0 0 24px}a{display:block;border-radius:999px;background:white;color:#111;text-decoration:none;text-align:center;padding:16px;font-weight:650}.brand{font-size:13px;letter-spacing:.12em;margin-top:24px;color:#aaa}</style></head><body><main>${image?`<img src="${escape(image)}" alt="${escape(title)} artwork">`:''}<h1>${escape(title)}</h1><p>${escape(artist)}</p><a href="${escape(target)}">Play on PUBLIC.</a><div class="brand">PUBLIC.</div></main><script nonce="${nonce}">location.replace(${JSON.stringify(target)});</script></body></html>`;
  return new Response(req.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; img-src https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`}});
 }catch{return new Response('Song preview is temporarily unavailable. Please open PUBLIC.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
