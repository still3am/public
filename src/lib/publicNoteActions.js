export async function requestPublicNote(client, action, args) {
  const response = await client.functions.invoke("securityGateway", {entity:"PublicNote",action,args});
  if (!response?.data || !Object.prototype.hasOwnProperty.call(response.data,"result")) throw Error("Note not confirmed");
  return response.data.result;
}
export async function savePublicNote(client, profileId, draft) {
  const expected={track_id:draft.track_id||"",caption:String(draft.caption||"").trim()};
  const started=Date.now();
  try { return await requestPublicNote(client,"saveNote",[expected]); }
  catch(error) {
    const status=Number(error?.response?.status??error?.status);
    // A timeout can lose the response after a successful write. Confirm using
    // the server before showing failure; never invent a local-only note.
    if (!status || status>=500) {
      try {
        const saved=await requestPublicNote(client,"readNote",[profileId]);
        if(saved?.id && (saved.track_id||"")===expected.track_id && (saved.caption||"")===expected.caption &&
          Date.parse(saved.expires_at)>=started+86400000-10000) return saved;
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
  if(status===422)return detail||"Add a note, a published song, or both.";
  if(status===429)return "Too many requests. Wait a moment, then try again. Your draft is still here.";
  return removing?"Couldn’t confirm removal. Please retry.":"Couldn’t confirm your note was saved. Your draft is still here—check your connection and retry.";
}
