import {base44} from '@/api/base44Client';
export async function momentsApi(action,data={}){
 const response=await base44.functions.invoke('moments',{action,...data});
 if(!response?.data||response.data.error)throw Error(response?.data?.error||'Moments could not finish this request.');
 const result=response.data,post=value=>value&&typeof value.id==='string'&&typeof value.user_id==='string';
 const valid=action==='feed'?Array.isArray(result.items)&&result.items.every(post):
  action==='get'||action==='publish'?post(result.post):
  action==='comments'?Array.isArray(result.items)&&result.items.every(row=>row&&typeof row.id==='string'&&typeof row.author?.user_id==='string'):true;
 if(!valid)throw Error('Moments returned an incomplete response. Please retry.');
 return result;
}
export const momentError=e=>(e?.status??e?.response?.status)===402?'Moments is temporarily unavailable. Please try again later.':e?.response?.data?.error||e?.message||'Please try again.';
