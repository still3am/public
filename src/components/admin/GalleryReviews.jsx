import {useState} from "react";
import {base44} from "@/api/base44Client";

export default function GalleryReviews(){
 const [rows,setRows]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function refresh(item,status){
  setBusy(true);setError("");
  try{
   if(item)await base44.entities.GallerySubmission.update(item.id,{status});
   const result=await base44.entities.GallerySubmission.filter({status:"pending"},"created_date",100);
   setRows(Array.isArray(result)?result:result.items);
  }catch{setError("Couldn’t complete gallery review. Refresh to retry.");}
  finally{setBusy(false);}
 }
 return <section className="rounded-xl border p-4 mb-4">
  <h2 className="font-semibold">Marketplace review</h2>
  <button type="button" disabled={busy} className="playlist-action" onClick={()=>refresh()}>Load pending designs</button>
  {error&&<p role="alert">{error}</p>}
  {rows?.length===0&&<p>No pending designs.</p>}
  {rows?.map(item=><article key={item.id} className="border-t py-3">
   <img src={item.url} alt="" className="h-20 w-32 object-contain" loading="lazy"/>
   <p>{item.name} · {item.kind}</p>
   <button type="button" className="playlist-action" disabled={busy} onClick={()=>refresh(item,"approved")}>Approve and publish</button>
   <button type="button" className="playlist-action" disabled={busy} onClick={()=>refresh(item,"rejected")}>Reject</button>
  </article>)}
 </section>;
}
