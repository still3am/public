// Restores tags recovered from legacy public audio files. Explicit user edits win.
export function withRecoveredAlbumMetadata(track,index){
 if(!track?.id||track.is_published!==true||track.approval_status!=='approved'||Object.hasOwn(track,'album_name'))return track;
 const tags=index[track.id];if(!tags?.album_name)return track;
 const result={...track};
 for(const key of ['album_name','album_artist','track_number','disc_number','release_year'])if(!result[key]&&tags[key])result[key]=tags[key];
 return result;
}
export function recoveredAlbumResult(result,index){
 if(Array.isArray(result))return result.map(t=>withRecoveredAlbumMetadata(t,index));
 if(Array.isArray(result?.items))return {...result,items:result.items.map(t=>withRecoveredAlbumMetadata(t,index))};
 return withRecoveredAlbumMetadata(result,index);
}
