import {createClientFromRequest} from 'npm:@base44/sdk';

const rows = page => Array.isArray(page) ? page : page?.items || [];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };

Deno.serve(async req => {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    if (!user?.id || user.disabled || user.is_blocked) fail('Sign in to use Messages.', 401);
    const {action, id, username, recipientId, offset, text, trackId, accept, requestId, replyId, messageId} = await req.json();
    const db = client.asServiceRole.entities;
    const uid = user.id;
    const blocked = async peer => rows(await db.Block.filter({
      $or:[{user_id:uid,blocked_user_id:peer},{user_id:peer,blocked_user_id:uid}],
    }, '-created_date', 1)).length > 0;

    const peerId = chat => chat.participant_ids.find(member => member !== uid);
    const publicPerson = profile => ({
      id:profile.user_id,
      display_name:profile.display_name||profile.full_name||profile.username||'PUBLIC listener',
      avatar_url:profile.avatar_url||'',
      avatar_preset:profile.avatar_preset||'',
      avatar_gif_url:profile.avatar_gif_url||'',
      avatar_video_url:profile.avatar_video_url||'',
      is_public_admin:profile.is_public_admin===true,
      is_artist:profile.is_artist===true,
      creator_role:profile.creator_role,
      friends_family_badge:profile.friends_family_badge===true,
      profile_background_colors:profile.profile_background_colors,
      profile_background_motion:profile.profile_background_motion,
      profile_background_speed:profile.profile_background_speed,
    });

    if (action === 'inbox') {
      const conversations = rows(await db.Conversation.filter({participant_ids:uid, dm_enabled:true}, '-updated_date', 100));
      const ids = [...new Set(conversations.map(peerId).filter(Boolean))];
      const [profiles, blocks] = ids.length ? await Promise.all([
        db.PublicProfile.filter({user_id:{$in:ids},visible:true}, '-updated_date', 200),
        db.Block.filter({$or:[{user_id:uid,blocked_user_id:{$in:ids}},{blocked_user_id:uid,user_id:{$in:ids}}]}, '-created_date', 500),
      ]) : [[], []];
      const denied = new Set(rows(blocks).map(row=>row.user_id===uid?row.blocked_user_id:row.user_id));
      const people = new Map();
      for (const profile of rows(profiles)) {
        if (!people.has(profile.user_id)) people.set(profile.user_id,publicPerson(profile));
      }
      const chats = conversations.filter(chat=>peerId(chat)&&!denied.has(peerId(chat)));
      const unread = chats.length ? rows(await db.Message.filter({
        conversation_id:{$in:chats.map(chat=>chat.id)},recipient_id:uid,read:false,
      }, '-created_date', 500)) : [];
      const unreadChats = new Set(unread.map(message=>message.conversation_id));
      return Response.json({conversations:chats.map(chat=>({...chat,peer:people.get(peerId(chat))||null,unread:unreadChats.has(chat.id)}))});
    }

    if (action === 'contacts') {
      const start = Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
      const followed = rows(await db.Follow.filter({follower_id:uid}, '-created_date', 51, start));
      const ids = [...new Set(followed.slice(0,50).map(follow=>follow.following_id))].filter(peer=>peer!==uid);
      const profiles = ids.length ? rows(await db.PublicProfile.filter({user_id:{$in:ids},visible:true}, '-updated_date', 100)) : [];
      const blocks = ids.length ? rows(await db.Block.filter({
        $or:[{user_id:uid,blocked_user_id:{$in:ids}},{blocked_user_id:uid,user_id:{$in:ids}}],
      }, '-created_date', 500)) : [];
      const denied = new Set(blocks.map(row=>row.user_id===uid?row.blocked_user_id:row.user_id));
      const byId = new Map(profiles.map(profile=>[profile.user_id,profile]));
      const people = ids.filter(peer=>byId.has(peer)&&!denied.has(peer)).map(peer=>{
        const profile = byId.get(peer);
        const person = publicPerson(profile);
        return {...person,name:person.display_name};
      });
      return Response.json({people,nextOffset:followed.length>50?start+50:null});
    }

    if (action === 'start') {
      const target = typeof recipientId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(recipientId)
        ? {user_id:recipientId}
        : typeof username === 'string' && /^[a-z0-9_]{3,24}$/.test(username) ? {username} : null;
      if (!target) fail('Choose someone to message.');
      const peer = rows(await db.PublicProfile.filter({...target,visible:true}, '-updated_date', 1))[0];
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
        dm_requester:uid, dm_status:peer.profile_private!==true && follows.every(page => rows(page).length) ? 'accepted' : 'pending',
      });
      return Response.json({id:chat.id});
    }

    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) fail('Choose a conversation.');
    const chat = await db.Conversation.get(id);
    if (!chat?.dm_enabled || !chat.participant_ids.includes(uid)) fail('Conversation unavailable.', 404);
    const peer = chat.participant_ids.find(member => member !== uid);
    if (!peer || await blocked(peer)) fail('Conversation unavailable.', 404);

    if (action === 'delete_message') {
      if (typeof messageId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(messageId)) fail('Choose a message.');
      const source = rows(await db.Message.filter({id:messageId,conversation_id:id}, '-created_date', 1))[0];
      if (source && source.sender_id !== uid) fail('You can only delete messages you sent.',403);
      if (source) await db.Message.delete(source.id);
      const latest = rows(await db.Message.filter({conversation_id:id}, '-created_date', 1))[0];
      await db.Conversation.update(id,{
        last_message_text:latest?.text || (latest?.track_id ? 'Shared a song' : ''),
        last_message_at:latest?.created_date || null,
        last_sender_id:latest?.sender_id || '',
      });
      return Response.json({ok:true});
    }

    if (action === 'read') {
      const [page, profiles] = await Promise.all([
        db.Message.filter({conversation_id:id}, '-created_date', 100),
        db.PublicProfile.filter({user_id:peer,visible:true}, '-updated_date', 1),
      ]);
      const profile = rows(profiles)[0];
      const messages = rows(page);
      const unreadIds = messages.filter(message=>message.recipient_id===uid&&!message.read).map(message=>message.id);
      if (unreadIds.length) await db.Message.updateMany({id:{$in:unreadIds},recipient_id:uid,read:false},{$set:{read:true}});
      return Response.json({chat:{...chat,peer:profile?publicPerson(profile):null},messages:messages.reverse()});
    }
    if (action === 'respond' && chat.dm_status === 'pending' && chat.dm_requester !== uid && typeof accept === 'boolean') {
      await db.Conversation.update(id,{dm_status:accept?'accepted':'declined'});
      return Response.json({ok:true});
    }
    if (action !== 'send' || typeof text !== 'string' || (!text.trim() && !trackId) || text.length > 2000) fail('Write a message or attach a song.');
    if (trackId && (typeof trackId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(trackId))) fail('Choose a valid song.');
    if (requestId !== undefined && (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(requestId))) fail('Invalid message request.');
    if (replyId && (typeof replyId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(replyId))) fail('Choose a valid message to reply to.');
    const previous = requestId ? rows(await db.Message.filter({
      conversation_id:id,sender_id:uid,send_request_id:requestId,
    }, '-created_date', 1))[0] : null;
    if (previous && (previous.text !== text.trim() || (previous.track_id||"") !== (trackId||"") || (previous.reply_to_id||"") !== (replyId||""))) fail('This request already sent a different message.',409);
    if (!previous) {
      if (chat.dm_status !== 'accepted' && (chat.dm_status !== 'pending' || chat.dm_requester !== uid)) fail('This conversation is awaiting approval.',403);
      if (chat.dm_status === 'pending' && rows(await db.Message.filter({conversation_id:id}, '-created_date', 1)).length) fail('Wait for this person to accept your request.',403);
      const recent = rows(await db.Message.filter({sender_id:uid,created_date:{$gte:new Date(Date.now()-60000).toISOString()}}, '-created_date', 25));
      if (recent.length >= 25) fail('Give it a moment before sending again.',429);
      let quote = {};
      if (replyId) {
        const source = rows(await db.Message.filter({id:replyId,conversation_id:id}, '-created_date', 1))[0];
        if (!source) fail('That message is unavailable.',404);
        const senderIndex = chat.participant_ids.indexOf(source.sender_id);
        quote = {
          reply_to_id:source.id,
          reply_preview:JSON.stringify({
            sender_name:chat.participant_names?.[senderIndex]||'PUBLIC listener',
            text:(source.text|| (source.track_id?'Shared a song':'Message')).slice(0,180),
          }),
        };
      }
      let attachment = {};
      if (trackId) {
        const song = rows(await db.Track.filter({id:trackId,is_published:true,approval_status:'approved'}, '-created_date', 1))[0];
        if (!song || (song.uploader_id && await blocked(song.uploader_id))) fail('This song is unavailable.',404);
        attachment = {track_id:song.id,track:JSON.stringify({title:song.title,artist:song.artist||song.uploader_name,cover_art_url:song.cover_art_url})};
      }
      await db.Message.create({conversation_id:id,sender_id:uid,recipient_id:peer,text:text.trim(),...attachment,...quote,...(requestId?{send_request_id:requestId}:{})});
    }
    const latest = rows(await db.Message.filter({conversation_id:id}, '-created_date', 1))[0];
    if (latest) await db.Conversation.update(id,{
      last_message_text:latest.text || (latest.track_id ? "Shared a song" : ""),last_message_at:latest.created_date||new Date().toISOString(),last_sender_id:latest.sender_id,
    });
    return Response.json({ok:true});
  } catch (error) {
    return Response.json({error:error.status ? error.message : 'Messages are temporarily unavailable.'},{status:error.status || 500});
  }
});
