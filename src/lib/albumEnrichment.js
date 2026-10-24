const recovered=new Map();
export const unknownAlbum=value=>!String(value||'').trim()||/^(unknown(?: album)?|untitled|n\/a)$/i.test(String(value).trim());
export function applyAlbumInfo(track){
 const data=recovered.get(track.id);
 return data&&unknownAlbum(track.album_name||track.album_title||track.album)?{...track,...data}:track;
}
export function rememberAlbumInfo(track,info){
 if(!track.id||!info?.album||unknownAlbum(info.album)||!unknownAlbum(track.album_name||track.album_title||track.album))return false;
 recovered.set(track.id,{album_name:info.album,album_title:info.album,album:info.album,album_artist:info.albumArtist||track.album_artist||track.artist,release_year:track.release_year||Number(info.releaseDate?.slice(0,4))||0});
 return true;
}
