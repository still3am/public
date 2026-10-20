import {base44} from "@/api/base44Client";
const rows=p=>Array.isArray(p)?p:p?.items||[];
export async function collaborationInfo(id){
 try{const page=await base44.entities.PlaylistCollaboration.filter({playlist_id:id},"-created_date",100);const records=rows(page);return records.length?{...records[0],member_ids:[...new Set(records.flatMap(row=>row.member_ids||[]))],track_contributors:Object.assign({},...records.map(row=>row.track_contributors||{}))}:null;}
 catch(error){if([401,403].includes(error.status??error.response?.status))return null;throw error;}
}
export function attachCollaboration(playlist,info){return info||Array.isArray(playlist.collaborator_ids)?{...playlist,collaboration_enabled:true,collaborator_ids:Array.isArray(playlist.collaborator_ids)?playlist.collaborator_ids:info?.member_ids||[],track_contributors:info?.track_contributors||{}}:playlist;}
export async function getPlaylist(id){
 try{
  const playlist=await base44.entities.Playlist.get(id),info=await collaborationInfo(id);
  // A removed member can still read an old collaboration record. When the
  // canonical field is hidden by FLS, never use that stale record as edit access.
  if(info&&!Array.isArray(playlist.collaborator_ids)){
   const viewer=await base44.auth.me();
   if(viewer?.id!==playlist.creator_id&&viewer?.role!=='admin'){
    try{const response=await base44.functions.invoke("securityGateway",{entity:"Playlist",action:"collaborationDetail",args:[id]});if(!response.data?.result)throw Error('Playlist access could not be confirmed.');return response.data.result;}
    catch(error){if([401,403,404].includes(error.status??error.response?.status))return playlist;throw error;}
   }
  }
  return attachCollaboration(playlist,info);
 }
 catch(error){if(![403,404].includes(error.status??error.response?.status))throw error;const r=await base44.functions.invoke("securityGateway",{entity:"Playlist",action:"collaborationDetail",args:[id]});return r.data.result;}
}
