import {base44} from "@/api/base44Client";
// Export a file only when the artist has enabled file downloads.
export async function downloadTrackFile(track){
 const authorized=await base44.entities.Track.get(track.id);
 if(authorized.is_downloadable!==true||!authorized.audio_url)return false;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{
  const response=await fetch(authorized.audio_url,{signal:controller.signal});
  if(!response.ok)throw new Error("File unavailable");
  const blob=await response.blob();
  if(!blob.size||blob.type.includes("text/html")||blob.type.includes("application/json"))throw new Error("Invalid audio file");
  const mime=blob.type.toLowerCase(),extension=mime.includes("wav")?"wav":mime.includes("ogg")?"ogg":mime.includes("mp4")||mime.includes("aac")?"m4a":mime.includes("flac")?"flac":"mp3";
  const title=(authorized.title||"song").replace(/[\/:*?"<>|]/g,"_").slice(0,120);
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=title+"."+extension;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return true;
 }finally{clearTimeout(timer);}
}
