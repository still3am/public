import {base44} from "@/api/base44Client";
const rows=p=>Array.isArray(p)?p:p?.items||[];
export async function collaborationInfo(id){
 const page=await base44.entities.PlaylistCollaboration.filter({playlist_id:id},"-created_date",1);
 return rows(page)[0]||null;
}
export function attachCollaboration(playlist,info){return info?{...playlist,collaboration_enabled:true,collaborator_ids:info.member_ids||[],track_contributors:info.track_contributors||{}}:playlist;}
export async function getPlaylist(id){
 try{const playlist=await base44.entities.Playlist.get(id);const info=await collaborationInfo(id);return attachCollaboration(playlist,info);}
 catch(error){if(![403,404].includes(error.status??error.response?.status))throw error;const r=await base44.functions.invoke("securityGateway",{entity:"Playlist",action:"collaborationDetail",args:[id]});return r.data.result;}
}
