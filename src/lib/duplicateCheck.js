// Match metadata conservatively. File hashes identify identical bytes, not re-encodes.
const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\.(mp3|wav|flac|m4a|aac|ogg|aiff)$/i,'').replace(/\b(official\s+(audio|video)|lyrics?\s+video|music\s+video)\b/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const version=s=>{
 const text=normalize(s),tags=['live','remix','acoustic','instrumental','karaoke','cover','demo','sped up','slowed','radio edit','extended','remaster','clean','explicit'];
 return tags.filter(t=>new RegExp('(?:^| )'+t+'(?: |$)').test(text)).join('|');
};
function similarity(a,b){
 if(a===b)return 1;if(!a||!b)return 0;
 const wordsA=new Set(a.split(' ')),wordsB=new Set(b.split(' '));
 const common=[...wordsA].filter(w=>wordsB.has(w)).length;
 return 2*common/(wordsA.size+wordsB.size);
}
export const normalizeKey=(title='',artist='')=>normalize(title)+'::'+normalize(artist)+'::'+version(title);
export async function hashAudioFile(file){
 if(!globalThis.crypto?.subtle)throw new Error('File verification requires a secure connection. Reload PUBLIC over HTTPS.');
 const bytes=await file.arrayBuffer();
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
}
export function findDuplicateTracks(existingTracks=[],candidate={}){
 const title=normalize(candidate.title),artist=normalize(candidate.artist);
 const runtime=Number(candidate.duration??candidate.duration_seconds)||0,variant=version(candidate.title);
 return existingTracks.flatMap(t=>{
  if(!t||t.id===candidate.id)return [];
  const exactFile=!!candidate.audio_sha256&&candidate.audio_sha256===t.audio_sha256;
  const exactUrl=!!candidate.audio_url&&candidate.audio_url===t.audio_url;
  let score=0,reason='',kind='possible';
  if(exactFile||exactUrl){score=1;reason=exactFile?'Identical audio file':'Same audio source';kind='exact';}
  else{
   const otherTitle=normalize(t.title),otherArtist=normalize(t.artist),otherRuntime=Number(t.duration_seconds??t.duration)||0;
   if(!title||!otherTitle||variant!==version(t.title))return [];
   const sameArtist=!!artist&&!!otherArtist&&artist===otherArtist;
   const known=runtime>0&&otherRuntime>0,delta=known?Math.abs(runtime-otherRuntime):Infinity;
   // Different known artists are different recordings, even with the same title.
   if(artist&&otherArtist&&!sameArtist)return [];
   if(sameArtist&&title===otherTitle&&(!known||delta<=4)){score=known?0.96:0.85;reason=known?'Same artist, title and similar duration':'Same artist and title; duration unverified';}
   else if(sameArtist&&similarity(title,otherTitle)>=0.85&&known&&delta<=2){score=0.8;reason='Similar title, same artist and duration';}
   else if((!artist||!otherArtist)&&title===otherTitle&&known&&delta<=2){score=0.65;reason='Same title and duration; artist needs review';}
  }
  return score?[{...t,_match_score:score,_match_reason:reason,_match_kind:kind}]:[];
 }).sort((a,b)=>b._match_score-a._match_score);
}
