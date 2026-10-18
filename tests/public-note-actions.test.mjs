import assert from "node:assert/strict";
import {savePublicNote,publicNoteError} from "../src/lib/publicNoteActions.js";
let calls=[],mode="lost";
const draft={track_id:"song",caption:" Hello "};
const saved={id:"note",user_id:"me",track_id:"song",caption:"Hello",expires_at:new Date(Date.now()+86400000).toISOString()};
const client={functions:{invoke:async(_name,body)=>{
 calls.push(body.action);
 if(body.action==="saveNote"){if(mode==="credit")throw {response:{status:402}};if(mode==="validation")throw {response:{status:422,data:{error:"Song unavailable"}}};throw Error("Connection lost");}
 return {data:{result:mode==="different"?{...saved,caption:"Previous"}:saved}};
}}};
assert.equal((await savePublicNote(client,"me",draft)).id,"note");
assert.deepEqual(calls,["saveNote","readNote"],"lost responses reconcile against the server");
mode="different";calls=[];await assert.rejects(savePublicNote(client,"me",draft),/Connection lost/);
mode="credit";calls=[];await assert.rejects(savePublicNote(client,"me",draft));assert.deepEqual(calls,["saveNote"],"service limits do not trigger more requests");
assert.match(publicNoteError({response:{status:402}}),/service limit/);
assert.match(publicNoteError({response:{status:422,data:{error:"Song unavailable"}}}),/Song unavailable/);
assert.match(publicNoteError({response:{status:401}}),/Sign in/);
console.log("PASS note save confirmation, lost-response reconciliation, unrelated prior-note rejection, service-limit handling and actionable errors");
