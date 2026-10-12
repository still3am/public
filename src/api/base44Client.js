import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
const { appId, token, functionsVersion, appBaseUrl } = appParams;
const raw = createClient({appId,token,functionsVersion,serverUrl:'',requiresAuth:false,appBaseUrl});
const guarded = new Set(['Track','Lyrics','LoungeSession','LoungeMember','LoungeQueueItem','ProfileComment','TrackAnnotation','Suggestion','Notification','Message','Conversation','Follow','Playlist']);
const lounge = new Set(['LoungeSession','LoungeMember','LoungeQueueItem']);
const gateway = async(entity,action,args) => {const response=await raw.functions.invoke('securityGateway',{entity,action,args});if(!response?.data || !Object.prototype.hasOwnProperty.call(response.data,'result'))throw new Error(response?.data?.error||'Invalid security gateway response');const result=response.data.result;if(entity==='Track'&&action!=='read')window.dispatchEvent(new Event('catalog:invalidate'));return result;};
const handlers = new Map();
const entities = new Proxy(raw.entities,{get(target,name) {
  if(typeof name!=='string')return Reflect.get(target,name);
  if(!guarded.has(name))return target[name];
  if(!handlers.has(name)) handlers.set(name,new Proxy(target[name],{get(h,method) {
    if(typeof method!=="string")return Reflect.get(h,method);
    if(['create','update','delete','deleteMany','bulkUpdate'].includes(method)) return async (...args)=>{if(method==='bulkUpdate'&&Array.isArray(args[0])&&args[0].length>100){const results=[];for(let i=0;i<args[0].length;i+=100)results.push(...await gateway(name,method,[args[0].slice(i,i+100)]));return results;}return gateway(name,method,args);};
    if(name==='Track'&&['get','list','filter','count','aggregate'].includes(method)) return async (...args)=>{
      try { return await gateway(name,'read',[method,...args]); }
      catch(error) {
        // Function availability must not blank an otherwise accessible catalog.
        // The entity API independently enforces Track RLS and private-file FLS.
        const status=error?.response?.status ?? error?.status;
        if(status===403 || status===422 || (method==='get'&&status===404))throw error;
        const current=await raw.auth.me().catch(e=>{if((e.status??e.response?.status)===401)return null;throw e;});
        const blocks=current&&current.role!=='admin'?await raw.entities.Block.filter({$or:[{user_id:current.id},{blocked_user_id:current.id}]},'-created_date',1000):[];
        const hidden=blocks.map(r=>r.user_id===current.id?r.blocked_user_id:r.user_id);
        const rule=hidden.length?{uploader_id:{$nin:hidden}}:{};
        let result;
        if(method==='get'){
          result=await h.get(...args);
          if(hidden.includes(result?.uploader_id))throw Object.assign(new Error('Track unavailable'),{status:403});
        }else if(method==='filter'||method==='count')result=await h[method]({$and:[args[0]||{},rule]},...args.slice(1));
        else if(method==='list')result=await h.filter(rule,...args);
        else result=await h.aggregate({...args[0],query:{$and:[args[0]?.query||{},rule]}});

        const mark=t=>t&&!t.audio_url?{...t,_private_audio:true}:t;
        if(method==='get'){
          const track=mark(result);
          // Private audio still requires the gateway to authorize and sign it.
          if(track?._private_audio)throw error;
          return track;
        }
        if(Array.isArray(result))return result.map(mark);
        if(Array.isArray(result?.items))return {...result,items:result.items.map(mark)};
        return result;
      }
    };
    if(lounge.has(name)&&['get','list','filter'].includes(method)) return (...args)=>gateway(name,'read',[method,...args]);
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
