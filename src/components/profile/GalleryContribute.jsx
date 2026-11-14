import {useState} from "react";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";

export default function GalleryContribute({kind,onBusy}){
 const {user}=useAuth();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 if(!user?.gallery_uploader)return null;
 async function submit(event){
  event.preventDefault();
  if(busy)return;
  const form=event.currentTarget,data=new FormData(form),file=data.get("design");
  if(!(file instanceof File)||!file.size||file.size>10*1024*1024){setMessage("Choose an image or GIF up to 10 MB.");return;}
  setBusy(true);onBusy?.(true);setMessage("");
  try{
   const {file_url}=await base44.integrations.Core.UploadFile({file});
   const result=await base44.functions.invoke("usersByIds",{action:"submit_gallery_design",kind,name:data.get("name"),rightsConfirmed:data.get("rights")==="on",url:file_url});
   if(!result?.data?.id)throw Error("Submission could not be confirmed.");
   form.reset();setMessage("Submitted for admin review.");
  }catch{setMessage("Couldn’t submit this design. Try again.");}
  finally{setBusy(false);onBusy?.(false);}
 }
 return <details className="rounded-xl border p-3">
  <summary>Submit and earn</summary>
  <form className="grid gap-2 pt-3" onSubmit={submit}>
   <p className="text-sm">Earn $0.10 when PUBLIC publishes an approved design.</p>
   <label>Design name<input className="block w-full rounded border p-2" name="name" maxLength={80} required disabled={busy}/></label>
   <label>Image or GIF<input className="block w-full" type="file" name="design" accept="image/png,image/jpeg,image/webp,image/gif" required disabled={busy}/></label>
   <label><input type="checkbox" name="rights" required disabled={busy}/> I have permission to share this design in the public gallery.</label>
   <button type="submit" className="playlist-action" disabled={busy}>{busy?"Submitting…":"Submit "+kind}</button>
   {message&&<p role="status">{message}</p>}
  </form>
 </details>;
}
