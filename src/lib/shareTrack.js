import {shareLink} from '@/lib/shareLink';
export function shareTrack(track) {
  return shareLink({title:(track.title||'Song')+' on PUBLIC.',url:window.location.origin+'/track/'+encodeURIComponent(track.id)});
}
