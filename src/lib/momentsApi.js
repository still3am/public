import {base44} from '@/api/base44Client';
export async function momentsApi(action,data={}){const response=await base44.functions.invoke('moments',{action,...data});if(!response?.data||response.data.error)throw Error(response?.data?.error||'Moments could not finish this request.');return response.data;}
export const momentError=e=>e?.response?.data?.error||e?.message||'Please try again.';
