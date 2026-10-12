import {base44} from '@/api/base44Client';
export async function getCloudList(userId){if(!userId)return [];return (await base44.functions.invoke('safety',{action:'offline',operation:'read'})).data.tracks||[];}
export async function setCloudList(userId,tracks){if(!userId)return;if(!tracks?.length)await base44.functions.invoke('safety',{action:'offline',operation:'clear'});else for(const track of tracks)await addCloudTrack(userId,track);}
export async function addCloudTrack(userId,track){if(userId&&track?.id)await base44.functions.invoke('safety',{action:'offline',operation:'add',track_id:track.id});}
export async function removeCloudTrack(userId,id){if(userId&&id)await base44.functions.invoke('safety',{action:'offline',operation:'remove',track_id:id});}
