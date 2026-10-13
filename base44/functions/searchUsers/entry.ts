import { createClientFromRequest } from 'npm:@base44/sdk';
async function searchPublicUsers(svc,raw) {
  const q=String(raw||'').trim().replace(/^@/,'').slice(0,100);
  if(q.length<2)return [];
  const pattern=q.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
  const page=await svc.entities.User.filter({
    $or:[{display_name:{$regex:pattern,$options:'i'}},{full_name:{$regex:pattern,$options:'i'}}],
    is_blocked:{$ne:true},disabled:{$ne:true}
  },'-created_date',30,0,['id','display_name','full_name','avatar_url']);
  const users=Array.isArray(page)?page:page?.items||[];
  return users.map(u=>({id:u.id,display_name:u.display_name||u.full_name||'',avatar_url:u.avatar_url||''}));
}

export default async function handleRequest(req) {
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:'Sign in to search people'},{status:401});
  if(user.is_blocked||user.disabled)return Response.json({error:'Account suspended'},{status:403});
  const body=await req.json();
  return Response.json({results:await searchPublicUsers(base44.asServiceRole,body?.q)});
 }catch(error){return Response.json({error:error?.message||'People search is unavailable'},{status:500});}
}

// Register the HTTP handler in Base44’s Deno runtime.
if (typeof Deno !== "undefined") Deno.serve(handleRequest);
