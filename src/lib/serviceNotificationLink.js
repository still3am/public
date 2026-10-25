export function serviceNotificationLink(note){
 if(note.type==='music_request_new')return {to:/^\/music-requests\?request=[0-9a-f]{64}$/.test(note.target_path||'')?note.target_path:'/music-requests',label:'View music request'};
 if(note.type==='music_request_available'&&/^\/music-requests(?:\?view=following)?#request-[a-zA-Z0-9_-]{1,100}$/.test(note.target_path||''))return {to:note.target_path.replace('/music-requests#','/music-requests?view=following#'),label:'View playlist songs'};
 if(note.type==='music_request_available')return typeof note.track_id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(note.track_id)?{to:'/track/'+encodeURIComponent(note.track_id),label:'Listen on PUBLIC'}:{to:'/music-requests',label:'View music requests'};
 if(note.type==='support_reply')return {to:/^\/support\?ticket=/.test(note.target_path||'')?note.target_path:'/support',label:'Read reply'};
 if(note.type==='suggestion_shipped')return {to:/^\/suggestions\?idea=/.test(note.target_path||'')?note.target_path:'/suggestions',label:'View completed idea'};
 return null;
}
