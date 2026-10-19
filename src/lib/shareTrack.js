import {shareLink} from '@/lib/shareLink';
import {getTrackShareUrl,getDirectTrackUrl} from '@/lib/trackShareUrl';
export function sharePublicSongLink(track){
  if(track?.is_published!==true||track?.approval_status!=='approved')throw Error('Publish this song before sharing a public link.');
  return shareTrack(track,{direct:true});
}
export function shareTrack(track,{direct=false}={}) {
  const title=track.title||'Song',artist=track.artist||track.uploader_name||'';
  return shareLink({title:title+(artist?' — '+artist:'')+' | PUBLIC.',text:title+(artist?' — '+artist:'')+' · Listen on PUBLIC.',url:direct?getDirectTrackUrl(track):getTrackShareUrl(track)});
}
