import {createClientFromRequest} from 'npm:@base44/sdk';

const rows = page => Array.isArray(page) ? page : page?.items || [];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };

Deno.serve(async req => {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    if (!user?.id || user.disabled || user.is_blocked) fail('Sign in to use Messages.', 401);
    const {action, id, username, text, accept} = await req.json();
    const db = client.asServiceRole.entities;
    const uid = user.id;
    const blocked = async peer => rows(await db.Block.filter({
      $or:[{user_id:uid,blocked_user_id:peer},{user_id:peer,blocked_user_id:uid}],
    }, '-created_date', 1)).length > 0;

    if (action === 'inbox') {
      const conversations = rows(await db.Conversation.filter({participant_ids:uid, dm_enabled:true}, '-updated_date', 100));
      const visible = await Promise.all(conversations.map(async chat => await blocked(chat.participant_ids.find(member => member !== uid)) ? null : chat));
      return Response.json({conversations:visible.filter(Boolean)});
    }

    if (action === 'start') {
      if (typeof username !== 'string' || !/^[a-z0-9_]{3,24}$/.test(username)) fail('Enter a valid username.');
      const peer = rows(await db.PublicProfile.filter({username,visible:true}, '-updated_date', 1))[0];
      if (!peer?.user_id || peer.user_id === uid || await blocked(peer.user_id)) fail('This person is unavailable.', 404);
      const participants = [uid,peer.user_id].sort();
      const pair = participants.join(':');
      const existing = rows(await db.Conversation.filter({dm_key:pair,dm_enabled:true}, 'created_date', 1))[0];
      if (existing) return Response.json({id:existing.id});
      const follows = await Promise.all([
        db.Follow.filter({follower_id:uid,following_id:peer.user_id}, '-created_date', 1),
        db.Follow.filter({follower_id:peer.user_id,following_id:uid}, '-created_date', 1),
      ]);
      const chat = await db.Conversation.create({
        dm_enabled:true, dm_key:pair, participant_ids:participants,
        participant_names:participants.map(member => member === uid ? user.display_name || user.username || 'PUBLIC listener' : peer.display_name || peer.username),
        dm_requester:uid, dm_status:follows.every(page => rows(page).length) ? 'accepted' : 'pending',
      });
      return Response.json({id:chat.id});
    }

    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) fail('Choose a conversation.');
    const chat = await db.Conversation.get(id);
    if (!chat?.dm_enabled || !chat.participant_ids.includes(uid)) fail('Conversation unavailable.', 404);
    const peer = chat.participant_ids.find(member => member !== uid);
    if (!peer || await blocked(peer)) fail('Conversation unavailable.', 404);

    if (action === 'read') {
      const messages = rows(await db.Message.filter({conversation_id:id}, '-created_date', 100));
      if (messages.length) await db.Message.updateMany({id:{$in:messages.map(message=>message.id)},recipient_id:uid,read:false},{$set:{read:true}});
      return Response.json({chat,messages:messages.reverse()});
    }
    if (action === 'respond' && chat.dm_status === 'pending' && chat.dm_requester !== uid && typeof accept === 'boolean') {
      await db.Conversation.update(id,{dm_status:accept?'accepted':'declined'});
      return Response.json({ok:true});
    }
    if (action !== 'send' || typeof text !== 'string' || !text.trim() || text.length > 2000) fail('Write a message of up to 2,000 characters.');
    if (chat.dm_status !== 'accepted' && (chat.dm_status !== 'pending' || chat.dm_requester !== uid)) fail('This conversation is awaiting approval.',403);
    if (chat.dm_status === 'pending' && rows(await db.Message.filter({conversation_id:id}, '-created_date', 1)).length) fail('Wait for this person to accept your request.',403);
    const recent = rows(await db.Message.filter({sender_id:uid,created_date:{$gte:new Date(Date.now()-60000).toISOString()}}, '-created_date', 25));
    if (recent.length >= 25) fail('Give it a moment before sending again.',429);
    await db.Message.create({conversation_id:id,sender_id:uid,recipient_id:peer,text:text.trim()});
    await db.Conversation.update(id,{last_message_text:text.trim(),last_message_at:new Date().toISOString(),last_sender_id:uid});
    return Response.json({ok:true});
  } catch (error) {
    return Response.json({error:error.status ? error.message : 'Messages are temporarily unavailable.'},{status:error.status || 500});
  }
});
