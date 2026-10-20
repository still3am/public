import assert from "node:assert/strict";
import fs from "node:fs";
const source=fs.readFileSync("base44/functions/securityGateway/entry.ts","utf8").replace(/import \{ createClientFromRequest \} from 'npm:@base44\/sdk';/,"const createClientFromRequest=()=>client;").replace("export default async function handleRequest","async function handleRequest");
const copy=value=>structuredClone(value);
function fixture(uid="owner"){
 const playlist={id:"p",creator_id:"owner",name:"Together",is_public:false,track_ids:["a"]};
 let collaboration=null,blocked=false;
 const users={owner:{id:"owner",display_name:"Owner"},editor:{id:"editor",display_name:"Editor"},outsider:{id:"outsider",display_name:"Outsider"}};
 const tracks={a:{id:"a",is_published:true,approval_status:"approved",uploader_id:"artist"},b:{id:"b",is_published:true,approval_status:"approved",uploader_id:"artist"},private:{id:"private",is_published:false,uploader_id:"someone"}};
 const patch=(obj,update)=>{for(const [path,value] of Object.entries(update.$set||{})){const keys=path.split(".");let node=obj;for(const key of keys.slice(0,-1))node=node[key]??={};node[keys.at(-1)]=copy(value);}for(const [key,value] of Object.entries(update.$addToSet||{}))obj[key]=[...new Set([...(obj[key]||[]),...(value?.$each||[value])])];for(const [key,value] of Object.entries(update.$pull||{}))obj[key]=(obj[key]||[]).filter(v=>!(value?.$in||[value]).includes(v));};
 const client={auth:{me:async()=>uid?{...users[uid],role:"user"}:null},asServiceRole:{entities:{
  Playlist:{get:async()=>copy(playlist),updateMany:async(query,data)=>{if(query.track_ids&&JSON.stringify(query.track_ids.$eq)!==JSON.stringify(playlist.track_ids))return;if(query.updated_date&&query.updated_date!==playlist.updated_date)return;if(query.collaborator_ids?.$exists===false&&Array.isArray(playlist.collaborator_ids))return;patch(playlist,data);}},
  PlaylistCollaboration:{filter:async()=>collaboration?[copy(collaboration)]:[],create:async data=>collaboration={id:"c",...data},updateMany:async(query,data)=>patch(collaboration,data),get:async()=>copy(collaboration)},
  Block:{filter:async()=>blocked?[{id:"block"}]:[]},User:{get:async id=>users[id]||{id}},
  Track:{get:async id=>copy(tracks[id])}
 }}};
 const handle=new Function("client",source+"\nreturn handleRequest;")(client);
 const call=async(action,args)=>{const response=await handle(new Request("https://test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({entity:"Playlist",action,args})}));return {status:response.status,data:await response.json()};};
 return {call,playlist,setUser:value=>uid=value,block:value=>blocked=value,getCollab:()=>collaboration};
}
const f=fixture();let r=await f.call("collaborators",["p","editor",true]);assert.equal(r.status,200);assert.deepEqual(f.playlist.collaborator_ids,["editor"]);assert.equal(f.getCollab(),null);
f.setUser("outsider");assert.equal((await f.call("collaborationDetail",["p"])).status,403);assert.equal((await f.call("playlistAdd",["p",["b"]])).status,403);
f.setUser("editor");assert.equal((await f.call("collaborators",["p","outsider",true])).status,403);r=await f.call("playlistAdd",["p",["b"]]);assert.equal(r.status,200);assert.deepEqual(f.playlist.track_ids,["a","b"]);assert.equal(f.getCollab().track_contributors.b.name,"Editor");
assert.equal((await f.call("playlistAdd",["p",["private"]])).status,404);assert.equal((await f.call("playlistReorder",["p",["b","a"],["a"]])).status,409);assert.equal((await f.call("playlistReorder",["p",["b","a"],["a","b"]])).status,200);assert.deepEqual(f.playlist.track_ids,["b","a"]);
f.block(true);assert.equal((await f.call("playlistRemove",["p",["a"]])).status,403);f.block(false);
f.setUser("owner");assert.equal((await f.call("collaborators",["p","editor",false])).status,200);f.setUser("editor");assert.equal((await f.call("playlistRemove",["p",["a"]])).status,403);f.getCollab().member_ids=["editor"];assert.equal((await f.call("playlistAdd",["p",["b"]])).status,403,"legacy membership cannot restore revoked access");f.setUser(null);assert.equal((await f.call("collaborationDetail",["p"])).status,401);
console.log("PASS real gateway enforces owner invitations, private membership, verified credits, unavailable-track checks, stale reorder protection, blocks and revocation");
