import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
const { appId, token, functionsVersion, appBaseUrl } = appParams;
const raw = createClient({appId,token,functionsVersion,serverUrl:'',requiresAuth:false,appBaseUrl});
const guarded = new Set(['Track','Lyrics','LoungeSession','LoungeMember','LoungeQueueItem','ProfileComment','TrackAnnotation','Suggestion','Notification','Message','Conversation','Follow']);
const lounge = new Set(['LoungeSession','LoungeMember','LoungeQueueItem']);
const gateway = async(entity,action,args) => (await raw.functions.invoke('securityGateway',{entity,action,args})).data.result;
const handlers = new Map();
const entities = new Proxy(raw.entities,{get(target,name) {
  if(typeof name!=='string'||!guarded.has(name)) return target[name];
  if(!handlers.has(name)) handlers.set(name,new Proxy(target[name],{get(h,method) {
    if(['create','update','delete','deleteMany','bulkUpdate'].includes(method)) return (...args)=>gateway(name,method,args);
    if((lounge.has(name)&&['get','list','filter'].includes(method))||(name==='Track'&&['get','list','filter','count','aggregate'].includes(method))) return (...args)=>gateway(name,'read',[method,...args]);
    return h[method];
  }}));
  return handlers.get(name);
}});
export const base44 = new Proxy(raw,{get(target,name) {
  if(name==='entities') return entities;
  if(name==='auth') return {...target.auth,updateMe:async data=>{
    const user=await target.auth.me();
    return gateway('User','update',[user.id,data]);
  }};
  return target[name];
}});
