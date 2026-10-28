import {withReadTimeout} from './readTimeout.js';
// Private saves use the entity API's established array endpoint. Keep every
// request under the caller's own permissions; no service role or integration.
export async function readLibraryRows(handler,query,{one=false}={}){
 const limit=one?1:500,out=[],seen=new Set();
 for(let page=0;page<200;page++){
  const result=await withReadTimeout(handler.filter(query,'id',limit,page*limit,['id','track_id']),15000,'Saved songs took too long to load. Please retry.');
  const rows=Array.isArray(result)?result:result?.items;
  if(!Array.isArray(rows))throw Error("Saved songs could not be read");
  let added=0;
  for(const row of rows)if(row?.id&&!seen.has(row.id)){seen.add(row.id);out.push(row);added++;}
  if(one||rows.length<limit)return out;
  if(!added)throw Error('Your library pagination stalled. Please retry.');
 }
 throw Error("Your library could not finish loading. Please try again.");
}
