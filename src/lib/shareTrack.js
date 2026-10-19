import {shareLink} from '@/lib/shareLink';
import {getTrackShareUrl} from '@/lib/trackShareUrl';
export function shareTrack(track) {
  const title=track.title||'Song',artist=track.artist||track.uploader_name||'';
  return shareLink({title:title+(artist?' — '+artist:'')+' | PUBLIC.',text:title+(artist?' — '+artist:'')+' · Listen on PUBLIC.',url:getTrackShareUrl(track)});
}
