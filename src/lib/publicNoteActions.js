import {hasNativeNotes,readNativeSongNote,saveNativeSongNote,setNativeNoteMode} from "./nativeSongNotes.js";
async function rawRequest(client, action, args) {
  const response = await client.functions.invoke("securityGateway", {entity:"PublicNote",action,args});
  if (!response?.data || !Object.prototype.hasOwnProperty.call(response.data,"result")) throw Error("Note not confirmed");
  return response.data.result;
}
export async function requestPublicNote(client, action, args, database=client) {
  if(hasNativeNotes(database)) {
    if(action==="readNote") {
      const native=await readNativeSongNote(database,args[0]);
      if(native.handled)return native.note;
    }
    if(action==="removeNote") {
      const owner=args[0]||(await database.auth.me())?.id;
      if(await setNativeNoteMode(database,owner,"none"))return true;
    }
  }
  return rawRequest(client,action,args);
}
export async function savePublicNote(client, profileId, draft, database=client) {
  const expected={track_id:draft.track_id||"",caption:String(draft.caption||"").trim()};
  const native=hasNativeNotes(database);
  if(native&&expected.track_id&&!expected.caption)return saveNativeSongNote(database,profileId,expected.track_id);
  const started=Date.now();
  async function confirmed(saved) {
    if(native)await setNativeNoteMode(database,profileId,"server");
    return saved;
  }
  try { return await confirmed(await rawRequest(client,"saveNote",[expected])); }
  catch(error) {
    const status=Number(error?.response?.status??error?.status);
    // A timeout can lose the response after a successful write. Confirm using
    // the server before showing failure; never invent a local-only note.
    if (!status || status>=500) {
      try {
        const saved=await rawRequest(client,"readNote",[profileId]);
        if(saved?.id && (saved.track_id||"")===expected.track_id && (saved.caption||"")===expected.caption &&
          Date.parse(saved.expires_at)>=started+86400000-10000) return await confirmed(saved);
      } catch { /* Keep the original write error and the editable draft. */ }
    }
    throw error;
  }
}
export function publicNoteError(error, removing=false) {
  const status=Number(error?.response?.status??error?.status);
  const detail=String(error?.response?.data?.error||error?.message||"");
  if(status===402 || /integration_credits_limit_reached/i.test(detail)) return "Notes can’t save because PUBLIC has reached its service limit. Your draft is still here. Please try again once service is restored.";
  if(status===401)return "Your session expired. Sign in again before saving your note.";
  if(status===403)return "This account or song isn’t available for sharing. Choose another song or refresh your profile.";
  if(status===404)return "This song or the notes service is unavailable. Refresh PUBLIC and try again.";
  if(status===409)return detail||"Reopen your profile and try again.";
  if(status===422)return detail||"Add a note, a published song, or both.";
  if(status===429)return "Too many requests. Wait a moment, then try again. Your draft is still here.";
  return removing?"Couldn’t confirm removal. Please retry.":"Couldn’t confirm your note was saved. Your draft is still here—check your connection and retry.";
}
