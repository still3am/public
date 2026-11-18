export function messageReactionMap(message) {
  let saved={};
  try { const value=JSON.parse(message.reactions||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value; } catch {}
  return {
    ...(message.sender_id&&message.sender_reaction?{[message.sender_id]:message.sender_reaction}:{}),
    ...(message.recipient_id&&message.recipient_reaction?{[message.recipient_id]:message.recipient_reaction}:{}),
    ...saved,
  };
}
export function ownMessageReaction(message,userId) {
  return messageReactionMap(message)[userId]||'';
}
