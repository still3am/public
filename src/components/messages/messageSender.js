export function messageSender(message, chat, viewer) {
  const own=message.sender_id===viewer?.id;
  const profile=own?viewer:message.sender||(chat.members||[]).find(person=>person.id===message.sender_id)||(chat.peer?.id===message.sender_id?chat.peer:null);
  const index=(chat.participant_ids||[]).indexOf(message.sender_id);
  const name=profile?.display_name||profile?.full_name||message.sender_name||(index>=0?chat.participant_names?.[index]:'')||(own?'You':'PUBLIC listener');
  return {...profile,id:message.sender_id,display_name:name,avatar_url:profile?.avatar_url||message.sender_avatar_url||''};
}
