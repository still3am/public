export function normalizeProfileDraft(form,baseline){
 const changed=key=>!baseline||JSON.stringify(form[key])!==JSON.stringify(baseline[key]);
 const next={...form};
 for(const key of ['display_name','bio','location','pronouns','website','instagram','twitter','soundcloud','status_message','top_tracks_label'])if(changed(key))next[key]=String(next[key]||'').trim();
 const limits={display_name:60,bio:1000,location:100,pronouns:60,status_message:140,top_tracks_label:40,instagram:100,twitter:100,website:2048,soundcloud:2048};
 if(changed('display_name')&&next.display_name.length<2)throw Error('Use a display name between 2 and 60 characters.');
 for(const [key,max]of Object.entries(limits))if(changed(key)&&next[key].length>max)throw Error(key.replaceAll('_',' ')+' is too long.');
 for(const key of ['website','soundcloud'])if(changed(key)&&next[key]){let url;try{url=new URL(/^[a-z][a-z0-9+.-]*:/i.test(next[key])?next[key]:'https://'+next[key]);}catch{throw Error('Enter a valid '+key+' link.');}if(!['https:','http:'].includes(url.protocol))throw Error('Use an http or https link.');next[key]=url.href;}
 for(const key of ['instagram','twitter']){if(!changed(key))continue;next[key]=next[key].replace(/^@/,'');if(next[key]&&!/^[a-z0-9_.]{1,100}$/i.test(next[key]))throw Error('Enter your '+key+' username, without the full link.');}
 if(changed('top_track_ids')&&(!Array.isArray(next.top_track_ids)||next.top_track_ids.length>8||new Set(next.top_track_ids).size!==next.top_track_ids.length))throw Error('Choose up to eight different songs.');
 return next;
}
export function reorderTopTracks(ids,from,to){if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=ids.length||to>=ids.length)return [...ids];const result=[...ids],item=result.splice(from,1)[0];result.splice(to,0,item);return result;}
