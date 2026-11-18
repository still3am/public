export function messageReactionMap(message) {
  let saved={};
  try { const value=JSON.parse(message.reactions||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value; } catch {}
  return {
    ...(message.sender_id&&message.sender_reaction?{[message.sender_id]:message.sender_reaction}:{}),
    ...(message.recipient_id&&message.recipient_reaction?{[message.recipient_id]:message.recipient_reaction}:{}),
    ...saved,
  };
}
export function messageReactionBadges(message,userId,allowed) {
  const badges=new Map();
  for(const [person,emoji] of Object.entries(messageReactionMap(message))){
    if(!allowed.includes(emoji))continue;
    const badge=badges.get(emoji)||{emoji,mine:false,people:0};
    badge.mine=badge.mine||person===userId;badge.people++;
    badges.set(emoji,badge);
  }
  return allowed.filter(emoji=>badges.has(emoji)).map(emoji=>badges.get(emoji));
}
export function ownMessageReaction(message,userId) {
  return messageReactionMap(message)[userId]||'';
}
