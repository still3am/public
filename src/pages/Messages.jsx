import { getRecentPlays } from '@/lib/recentPlays';
import MomentGifPicker, { MomentGif } from '@/components/moments/MomentGifPicker';
import '@/components/moments/moment-tools.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowUp, Check, ChevronLeft, ChevronRight, Clapperboard, Copy, Disc3, ExternalLink, Library, Trash2, MessageCircle, ImagePlus, Music2, Palette, Pause, Play, Plus, Reply, Search, SquarePen, TextQuote, X } from 'lucide-react';
import LyricSharePicker from '@/components/LyricSharePicker';
import LyricCoverGradient from '@/components/LyricCoverGradient';
import TrackPickerSheet from '@/components/profile/TrackPickerSheet';
import { usePlayer } from '@/context/PlayerContext';
import Avatar from '@/components/Avatar';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import './messages.css';

const REACTIONS = ["❤️", "👍", "👎", "😂", "‼️", "❓", "🔥"];
const REACTION_LABELS = ['Love', 'Like', 'Dislike', 'Laugh', 'Emphasize', 'Question', 'Fire'];

const CHAT_BACKGROUND_PRESETS = [
  { id: 'sky', name: 'Sky', background: 'linear-gradient(165deg, #173453 0%, #367b9d 48%, #f0a56e 100%)' },
  { id: 'water', name: 'Water', background: 'linear-gradient(160deg, #b5e4ef 0%, #80b7c6 48%, #315a70 100%)' },
  { id: 'aurora', name: 'Aurora', background: 'radial-gradient(ellipse at 22% 60%, #15c8e7b8 0%, transparent 38%), radial-gradient(ellipse at 80% 32%, #8946d58c 0%, transparent 42%), linear-gradient(145deg, #071122, #123653 55%, #171335)' },
  { id: 'dawn', name: 'Dawn', background: 'linear-gradient(160deg, #d8b8ce 0%, #f3b8a9 54%, #e98c85 100%)' },
  { id: 'sunset', name: 'Sunset', background: 'linear-gradient(165deg, #14344b 0%, #d76d5f 57%, #f4b079 100%)' },
  { id: 'dusk', name: 'Dusk', background: 'linear-gradient(165deg, #101226 0%, #20285a 48%, #bc523e 100%)' },
  { id: 'flow', name: 'Flow', background: 'radial-gradient(ellipse at 25% 68%, #00d6d6aa 0%, transparent 35%), radial-gradient(ellipse at 78% 32%, #bd38a8aa 0%, transparent 42%), linear-gradient(145deg, #080c1b, #073e58 52%, #34204e)' },
];

async function messages(action, data = {}) {
  try {
    const result = await base44.functions.invoke('messages', { action, ...data });
    if (!result.data || result.data.error) throw Error(result.data?.error || 'Messages are unavailable.');
    return result.data;
  } catch (error) {
    throw Error(error.response?.data?.error || error.message);
  }
}

function messageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const today = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, today ?
  { hour: "numeric", minute: "2-digit" } :
  { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function PersonAvatar({ person, size = 40 }) {
  return <span className="public-messages-avatar"><Avatar user={person} size={size} motion /></span>;
}

export default function Messages() {
  const { user } = useAuth();
  return <MessagesPage key={user?.id} user={user} />;
}

function MessagesPage({ user }) {
  const [params, setParams] = useSearchParams();
  const id = params.get('chat');
  const [inbox, setInbox] = useState(null),[loadedThread, setThread] = useState(null),[requests, setRequests] = useState(false);
  const thread = loadedThread?.chat?.id === id ? loadedThread : null;
  const [menu, setMenu] = useState(null);
  const [chatBackgrounds, setChatBackgrounds] = useState(() =>
    user?.message_backgrounds && typeof user.message_backgrounds === 'object' ? user.message_backgrounds : {}
  );
  const [chatDetailsOpen, setChatDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState('backgrounds');
  const [savingBackground, setSavingBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState('');
  const [draftBackgroundColor, setDraftBackgroundColor] = useState('#275dad');
  const backgroundFile = useRef(null);
  const [savingReaction, setSavingReaction] = useState(null);
  const [menuPanel, setMenuPanel] = useState(null);
  function openMessageMenu(message, group) {
    const bubble = group.querySelector('.public-message-bubble,.public-message-song') || group;
    const anchor = bubble;
    setError('');
    setMenu({ chatId: id, message, anchor });
  }
  const hold = useRef(null);
  function cancelHold() {
    clearTimeout(hold.current?.timer);
    hold.current = null;
  }
  useEffect(() => () => cancelHold(), [id]);
  const activeMenu = menu?.chatId === id ? thread?.messages.find((message) => message.id === menu.message.id) : null;
  useLayoutEffect(() => {
    const panel = menuPanel;
    if (!activeMenu || !panel || !menu?.anchor) return;
    function position() {
      const viewport = window.visualViewport;
      const x = viewport?.offsetLeft || 0,y = viewport?.offsetTop || 0;
      const width = viewport?.width || document.documentElement.clientWidth;
      const height = viewport?.height || document.documentElement.clientHeight;
      const inset = 12;
      const bounds = menu.anchor.getBoundingClientRect();
      panel.style.width = Math.min(342, Math.max(0, width - inset * 2)) + 'px';
      panel.style.maxHeight = Math.max(0, height - inset * 2) + 'px';
      const box = panel.getBoundingClientRect();
      const own = activeMenu.sender_id === user?.id;
      const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
      panel.style.left = clamp(own ? bounds.right - box.width : bounds.left, x + inset, x + width - box.width - inset) + 'px';
      const reactionHeight = panel.querySelector('.public-message-reactions')?.offsetHeight || 52;
      panel.style.top = clamp(bounds.top - reactionHeight - 8, y + inset, y + height - box.height - inset) + 'px';
      panel.style.visibility = 'visible';
    }
    position();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(position);
    observer?.observe(panel);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [menu, menuPanel, activeMenu?.id, user?.id]);
  const currentChat = useRef(id);
  currentChat.current = id;
  const operation = useRef(false);
  const pendingSends = useRef(new Map());
  const to = params.get('to'),recipient = params.get('recipient');
  const location = useLocation();
  const recipientName = location.state?.recipientName;
  const [lyricShare, setLyricShare] = useState(location.state?.lyricShare || null);
  const [selectingLyrics, setSelectingLyrics] = useState(false);
  const lyricPlayback = useRef(null);
  const [drafts, setDrafts] = useState(() => new Map());
  const draft = drafts.get(id) || '';
  const draftText = useRef(draft);
  draftText.current = draft;
  const typingMisses = useRef(0);
  const [reply, setReply] = useState(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingPollLock = useRef(false);
  const draftInput = useRef(null);
  const [inboxQuery, setInboxQuery] = useState('');
  const player = usePlayer();
  const [musicMenu, setMusicMenu] = useState(/** @type {false | "attachments" | "music"} */ (false));
  const [mediaDraft, setMediaDraft] = useState(null);
  const mediaInput = useRef(null);
  const uploadedMedia = useRef(new WeakMap());
  const selectedMedia = mediaDraft?.chatId === id ? mediaDraft : null;
  useEffect(() => () => {if (mediaDraft) URL.revokeObjectURL(mediaDraft.preview);}, [mediaDraft]);
  function selectMedia(file) {
    if (!file) return;
    const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? 'image' :
    ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) ? 'video' : '';
    if (!type || !file.size || file.size > (type === 'image' ? 10 : 50) * 1024 * 1024) {
      setError('Choose a JPG, PNG or WebP up to 10 MB, or an MP4, MOV or WebM up to 50 MB.');
      return;
    }
    setError('');
    setGif('');
    setMediaDraft({ chatId: id, file, type, preview: URL.createObjectURL(file) });
  }
  const [gif, setGif] = useState(""),[showGifs, setShowGifs] = useState(false);
  const [songPicker, setSongPicker] = useState(/** @type {false | "recent" | "song" | "lyrics"} */ (false));
  const [attachment, setAttachment] = useState(null);
  async function playSharedSong(message) {
    const trackId = message.track_id;
    const lyrics = songData(message)?.lyrics;
    if (player.currentTrack?.id === trackId && (!lyrics || lyricPlayback.current === message.id)) {
      await player.togglePlay();
      return;
    }
    const song = await base44.entities.Track.get(trackId);
    if (!song?.is_published || song.approval_status !== 'approved' || !song.audio_url && !song._private_audio) throw Error('This song is unavailable.');
    lyricPlayback.current = lyrics ? message.id : null;
    if (lyrics) player.resumeTrack(song, (lyrics.startMs ?? 0) / 1000, true);else
    await player.playTrackAt([song], 0);
  }
  const [contacts, setContacts] = useState(null),[contactQuery, setContactQuery] = useState(''),[contactError, setContactError] = useState(false),[retry, setRetry] = useState(0);
  const [error, setError] = useState(''),[busy, setBusy] = useState(false);
  const [inboxError, setInboxError] = useState('');
  const [readError, setReadError] = useState(null);
  const inboxPending = useRef(false);
  const readVersion = useRef(0);
  const loadInbox = useCallback(async () => {
    if (inboxPending.current) return;
    inboxPending.current = true;
    try {
      const data = await messages('inbox');
      setInbox(Array.isArray(data.conversations) ? data.conversations.filter((chat) => chat && typeof chat.id === 'string') : []);
      setInboxError('');
    } catch (error) {setInboxError(error.message);} finally
    {inboxPending.current = false;}
  }, []);
  const loadThread = useCallback(async (chatId) => {
    const version = ++readVersion.current;
    try {
      const data = await messages('read', { id: chatId });
      if (version !== readVersion.current || currentChat.current !== chatId) return;
      if (!data?.chat || typeof data.chat.id !== 'string' || !Array.isArray(data.messages)) {
        throw new Error('This conversation could not be loaded. Please try again.');
      }
      const safeChat = {
        ...data.chat,
        participant_ids: Array.isArray(data.chat.participant_ids) ? data.chat.participant_ids : [],
        participant_names: Array.isArray(data.chat.participant_names) ? data.chat.participant_names : [],
      };
      const safeMessages = data.messages.filter((message) => message && typeof message.id === 'string');
      setThread({ chat: safeChat, messages: safeMessages });
      setReadError(null);
      setInbox((previous) => previous?.map((chat) => chat.id === chatId ? { ...chat, unread: false } : chat) ?? null);
    } catch (error) {
      if (version === readVersion.current && currentChat.current === chatId) setReadError({ id: chatId, message: error.message });
    }
  }, []);
  useEffect(() => {
    void loadInbox();
    const timer = setInterval(() => void loadInbox(), 15000);
    return () => clearInterval(timer);
  }, [loadInbox]);
  useEffect(() => {
    setThread(null);setGif('');setShowGifs(false);setReply(null);setAttachment(id ? lyricShare : null);setSelectingLyrics(false);setMusicMenu(false);setSongPicker(false);setError('');setReadError(null);
    if (!id) return;
    let pending = false;
    const refresh = async (initial = false) => {
      if (pending || !initial && operation.current) return;
      pending = true;
      try {await loadThread(id);} finally {pending = false;}
    };
    void refresh(true);
    const timer = setInterval(refresh, 8000);
    return () => {readVersion.current++;clearInterval(timer);};
  }, [id, loadThread]);
  useEffect(() => {
    if (!id) return;
    let active = true;
    const refreshTyping = async () => {
      if (!active || typingPollLock.current) return;
      typingPollLock.current = true;
      try {
        await messages('typing', { id, typing: Boolean(draftText.current.trim()) });
        const result = await messages('typing_status', { id });
        if (active) {
          if (result.typing) {typingMisses.current = 0;setPeerTyping(true);} else
          if (++typingMisses.current >= 2) setPeerTyping(false);
        }
      } catch {
        if (active && ++typingMisses.current >= 3) setPeerTyping(false);
      } finally {typingPollLock.current = false;}
    };
    typingMisses.current = 0;
    setPeerTyping(false);
    void refreshTyping();
    const timer = setInterval(refreshTyping, 2500);
    return () => {active = false;clearInterval(timer);};
  }, [id]);
  async function perform(work) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);setError('');
    try {await work();} catch (error) {setError(error.message);} finally {operation.current = false;setBusy(false);}
  }
  const peerName = (chat) => {
    const ids = Array.isArray(chat?.participant_ids) ? chat.participant_ids : [];
    const names = Array.isArray(chat?.participant_names) ? chat.participant_names : [];
    const peerIndex = ids.findIndex((member) => member !== user?.id);
    return chat?.peer?.display_name || names[peerIndex] || 'PUBLIC listener';
  };
  const peerFor = (chat) => chat.peer || inbox?.find((row) => row.id === chat.id)?.peer || { display_name: peerName(chat) };
  const currentPeer = Array.isArray(thread?.chat?.participant_ids) ? thread.chat.participant_ids.find((member) => member !== user?.id) : null;
  const activeBackground = id ? chatBackgrounds[id] || { type: 'none' } : { type: 'none' };
  const backgroundStyle = activeBackground.type === 'preset'
    ? { backgroundImage: CHAT_BACKGROUND_PRESETS.find((item) => item.id === activeBackground.value)?.background }
    : activeBackground.type === 'color'
      ? { backgroundImage: 'none', backgroundColor: activeBackground.value }
      : activeBackground.type === 'photo'
        ? { backgroundImage: 'url("' + activeBackground.value + '")' }
        : undefined;
  async function saveChatBackground(nextBackground) {
    if (!user?.id || !id || savingBackground) return;
    const next = { ...chatBackgrounds, [id]: nextBackground };
    setSavingBackground(true);
    setBackgroundError('');
    try {
      await base44.auth.updateMe({ message_backgrounds: next });
      // updateMe resolves only after the account write succeeds. Avoid an
      // immediate profile read here: it can return a stale cached value and
      // incorrectly revert the freshly saved selection.
      setChatBackgrounds(next);
    } catch (saveError) {
      setBackgroundError(saveError.message || 'Could not save this background. Please try again.');
    } finally {
      setSavingBackground(false);
    }
  }
  async function uploadChatBackground(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setBackgroundError('Choose a JPG, PNG, or WebP photo up to 8 MB.');
      return;
    }
    setSavingBackground(true);
    setBackgroundError('');
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (!result?.file_url) throw new Error('Photo upload was not confirmed. Please retry.');
      const next = { ...chatBackgrounds, [id]: { type: 'photo', value: result.file_url } };
      await base44.auth.updateMe({ message_backgrounds: next });
      // Keep the confirmed selection immediately; a profile refresh can still
      // be briefly stale after an upload.
      setChatBackgrounds(next);
    } catch (uploadError) {
      setBackgroundError(uploadError.message || 'Could not upload this photo. Please try again.');
    } finally {
      setSavingBackground(false);
    }
  }
  const pending = thread?.chat.dm_status === 'pending';
  const incoming = pending && thread?.chat.dm_requester !== user?.id;
  const canSend = thread?.chat.dm_status === 'accepted' || pending && !incoming && !thread.messages.length;
  const [composing, setComposing] = useState(Boolean(to || recipient));
  const searchTerm = contactQuery.trim().toLocaleLowerCase();
  const searching = composing && Boolean(searchTerm);
  useEffect(() => {
    if (!searching || contacts) return;
    let active = true;
    setContactError(false);
    async function loadFollowedPeople() {
      const people = new Map();
      let offset = 0;
      do {
        const page = await messages('contacts', { offset });
        if (!active) return;
        for (const person of page.people) people.set(person.id, person);
        offset = Number.isSafeInteger(page.nextOffset) && page.nextOffset > offset ? page.nextOffset : null;
      } while (offset !== null);
      if (active) setContacts([...people.values()]);
    }
    void loadFollowedPeople().catch(() => {if (active) setContactError(true);});
    return () => {active = false;};
  }, [searching, contacts, retry]);
  const matches = searching && contacts ? contacts.filter((person) => person.name.toLocaleLowerCase().includes(searchTerm)) : [];
  function startChat(target) {
    void perform(async () => {
      const chat = await messages('start', target);
      setParams({ chat: chat.id });
      setComposing(false);
      setContactQuery('');
      await loadInbox();
    });
  }
  const scroll = useRef(null);
  const followLatest = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const tabChats = inbox?.filter((chat) => requests === (chat.dm_status === 'pending' && chat.dm_requester !== user?.id) && chat.dm_status !== 'declined' && (chat.last_message_at || chat.dm_requester === user?.id));
  const inboxTerm = inboxQuery.trim().toLocaleLowerCase();
  const visibleChats = tabChats?.filter((chat) => !inboxTerm || peerName(chat).toLocaleLowerCase().includes(inboxTerm));
  useEffect(() => {followLatest.current = true;setShowLatest(false);}, [id]);
  function jumpToLatest() {
    followLatest.current = true;
    setShowLatest(false);
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }
  const lastMessage = Array.isArray(thread?.messages) ? thread.messages.at(-1)?.id : null;
  useEffect(() => {
    if (!lastMessage) return;
    if (followLatest.current) jumpToLatest();else
    setShowLatest(true);
  }, [id, lastMessage]);
  return <main className="public-messages" data-thread={Boolean(id)}>
    {error && <p role="alert" className="rounded-lg border p-3">{error}</p>}
    <div className="public-messages-layout">
      <aside className="public-messages-inbox">
        <header className="public-messages-inbox-header">
          <Link to="/" className="public-messages-back"><ChevronLeft size={17} /> PUBLIC</Link>
          <div><h1>Messages</h1><button type="button" aria-label="New message" aria-expanded={composing} onClick={() => {setComposing(!composing);setContactQuery('');setContacts(null);}}><SquarePen size={20} /></button></div>
        </header>
        {composing && <div className="px-4 pb-3">
          {(recipient || to) && <button className="mb-3 rounded-lg border px-3 py-2" type="button" disabled={busy} onClick={() => startChat(recipient ? { recipientId: recipient } : { username: to })}>{recipientName ? `Message ${recipientName}` : "Start message"}</button>}
          <input type="search" aria-label="Search people you follow by name" placeholder="Search by name" className="mb-2 w-full rounded-xl border bg-muted px-3 py-2 text-base" maxLength={80} value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} />
          {matches.map((person) => <button type="button" className="public-messages-row" key={person.id} disabled={busy} onClick={() => startChat({ recipientId: person.id })}>
            <PersonAvatar person={person} />
            <span className="truncate font-semibold">{person.name}</span><ChevronRight size={14} aria-hidden="true" />
          </button>)}
          {searching && contacts && matches.length === 0 && <p role="status" className="text-sm text-muted-foreground">No matching people you follow.</p>}
          {searching && !contacts && !contactError && <p role="status" className="text-sm">Searching…</p>}
          {searching && contactError && <button type="button" className="text-sm underline" onClick={() => setRetry((value) => value + 1)}>Search failed. Try again.</button>}
        </div>}
        {lyricShare && !id && <div className="public-message-attachment">
          <div className="min-w-0"><strong className="block truncate">{lyricShare.title}</strong><span className="text-xs">Choose a conversation to share lyrics.</span></div>
          <button type="button" aria-label="Cancel lyric share" onClick={() => setLyricShare(null)}><X size={18} /></button>
        </div>}
        <div className="public-messages-tabs">
          <button aria-pressed={!requests} onClick={() => setRequests(false)}>Inbox</button>
          <button aria-pressed={requests} onClick={() => setRequests(true)}>Requests</button>
        </div>
        {tabChats?.length > 0 && <label className="public-messages-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" aria-label="Find a conversation by name" placeholder="Find a conversation" value={inboxQuery} onChange={(event) => setInboxQuery(event.target.value)} />
        </label>}
        {inboxError ? <p role="alert" className="public-messages-list-empty">Inbox couldn’t refresh. <button type="button" className="underline" onClick={loadInbox}>Retry</button></p> : inbox === null && <p role="status" className="public-messages-list-empty">Loading conversations…</p>}
        {visibleChats?.length === 0 && <p className="public-messages-list-empty">{inboxTerm && tabChats?.length ? "No conversations match that name." : requests ? "No message requests." : "No conversations yet. Tap the compose icon to start one."}</p>}
        {visibleChats?.map((chat) =>
        <button key={chat.id} onClick={() => setParams({ chat: chat.id })} aria-current={id === chat.id} className="public-messages-row">
            <PersonAvatar person={peerFor(chat)} />
            <span className="min-w-0"><span className="public-messages-row-title"><strong className="truncate">{peerName(chat)}</strong>{chat.last_message_at && <time dateTime={chat.last_message_at}>{messageTime(chat.last_message_at)}</time>}</span><span className="block truncate text-sm opacity-70">{chat.last_message_text || 'New conversation'}</span></span>
            {chat.unread ? <span className="public-messages-dot" aria-label="Unread" /> : <ChevronRight size={14} aria-hidden="true" />}
          </button>
        )}
      </aside>
      {id ? <section className="public-messages-thread" aria-label="Conversation" data-replying={Boolean(reply)} data-wallpaper={activeBackground.type !== 'none'} style={backgroundStyle} onKeyDown={(event) => {if (event.key === "Escape" && reply && !busy && !showGifs && !musicMenu && !songPicker) setReply(null);}}>
        <header className="public-messages-thread-header">
          {reply && <button type="button" className="public-message-close-reply" aria-label="Cancel reply" disabled={busy} onClick={() => setReply(null)}><X size={23} /></button>}
          <button className="public-messages-back" onClick={() => setParams({})} aria-label="Back to inbox"><ChevronLeft size={23} /></button>
          {readError?.id === id ? <p role="alert" className="public-messages-list-empty">{readError.message} <button type="button" className="underline" onClick={() => loadThread(id)}>Retry</button></p> : !thread && <p role="status" className="public-messages-list-empty">Loading conversation…</p>}
        {thread && currentPeer && <button type="button" className="public-messages-peer" aria-label={"Conversation details for " + peerName(thread.chat)} onClick={() => {
          setDetailsTab('backgrounds');
          setDraftBackgroundColor(activeBackground.type === 'color' ? activeBackground.value : '#275dad');
          setBackgroundError('');
          setChatDetailsOpen(true);
        }}>
          <PersonAvatar person={peerFor(thread.chat)} />
          <h2>{peerName(thread.chat)}</h2>
        </button>}
        </header>
        {thread && currentPeer && <Dialog open={chatDetailsOpen} onOpenChange={setChatDetailsOpen}>
          <DialogContent className="public-chat-details" data-tab={detailsTab} showClose={false}>
            <header className="public-chat-details-header">
              <button type="button" aria-label="Close conversation details" onClick={() => setChatDetailsOpen(false)}><ChevronLeft size={22} /></button>
              <span>Conversation</span>
              <button type="button" className="public-chat-details-done" onClick={() => setChatDetailsOpen(false)}>Done</button>
            </header>
            <div className="public-chat-details-person">
              <PersonAvatar person={peerFor(thread.chat)} size={76} />
              <DialogTitle>{peerName(thread.chat)}</DialogTitle>
              <DialogDescription>Make this conversation feel like yours.</DialogDescription>
              <Link to={"/profile/" + encodeURIComponent(currentPeer)} onClick={() => setChatDetailsOpen(false)}>View profile</Link>
            </div>
            <div className="public-chat-details-tabs" role="tablist" aria-label="Conversation details">
              <button type="button" role="tab" aria-selected={detailsTab === 'info'} onClick={() => setDetailsTab('info')}>Info</button>
              <button type="button" role="tab" aria-selected={detailsTab === 'backgrounds'} onClick={() => setDetailsTab('backgrounds')}>Backgrounds</button>
            </div>
            {detailsTab === 'backgrounds' ? <section className="public-chat-backgrounds" aria-label="Conversation backgrounds">
              <div className="public-chat-background-tools">
                <button type="button" aria-pressed={activeBackground.type === 'none'} disabled={savingBackground} onClick={() => void saveChatBackground({ type: 'none' })}>
                  <span className="public-chat-background-sample public-chat-background-none"><X size={22} /></span><span>None</span>
                </button>
                <button type="button" disabled={savingBackground} onClick={() => backgroundFile.current?.click()}>
                  <span className="public-chat-background-sample public-chat-background-photo"><ImagePlus size={24} /></span><span>{savingBackground ? 'Saving…' : 'Photo'}</span>
                </button>
                <label className="public-chat-background-color">
                  <span className="public-chat-background-sample"><Palette size={23} /></span><span>Color</span>
                  <input type="color" aria-label="Choose a conversation background color" value={draftBackgroundColor} disabled={savingBackground} onChange={(event) => setDraftBackgroundColor(event.target.value)} />
                </label>
                <button type="button" aria-pressed={activeBackground.value === 'flow'} disabled={savingBackground} onClick={() => void saveChatBackground({ type: 'preset', value: 'flow' })}>
                  <span className="public-chat-background-sample" style={{ backgroundImage: CHAT_BACKGROUND_PRESETS.find((item) => item.id === 'flow').background }}><span className="public-chat-background-glow" /></span><span>Flow</span>
                </button>
              </div>
              <div className="public-chat-background-color-apply">
                <span>Choose a color for this chat</span>
                <button type="button" disabled={savingBackground || (activeBackground.type === 'color' && activeBackground.value === draftBackgroundColor)} onClick={() => void saveChatBackground({ type: 'color', value: draftBackgroundColor })}>{savingBackground ? 'Saving…' : 'Apply color'}</button>
              </div>
              <h3>Suggestions</h3>
              <div className="public-chat-background-grid">
                {CHAT_BACKGROUND_PRESETS.filter((item) => item.id !== 'flow').map((item) => {
                  const selected = activeBackground.type === 'preset' && activeBackground.value === item.id;
                  return <button type="button" key={item.id} className="public-chat-background-tile" aria-pressed={selected} disabled={savingBackground} style={{ backgroundImage: item.background }} onClick={() => void saveChatBackground({ type: 'preset', value: item.id })}>
                    <span>{item.name}</span>{selected && <span className="public-chat-background-check"><Check size={16} /></span>}
                  </button>;
                })}
              </div>
              <input ref={backgroundFile} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { void uploadChatBackground(event.target.files?.[0]);event.target.value = ''; }} />
              {backgroundError && <p className="public-chat-background-error" role="alert">{backgroundError}</p>}
              <p className="public-chat-background-note">Only you can see your conversation background.</p>
            </section> : <section className="public-chat-info">
              <h3>Conversation info</h3>
              <p>Your messages stay in this conversation. Background choices are saved to your account and are only visible to you.</p>
              <Link to={"/profile/" + encodeURIComponent(currentPeer)} onClick={() => setChatDetailsOpen(false)}>View {peerName(thread.chat)}’s profile</Link>
            </section>}
          </DialogContent>
        </Dialog>}
        {thread && <>
          <div ref={scroll} className="public-messages-history" aria-label="Conversation messages" onScroll={() => {
            const node = scroll.current;
            if (!node) return;
            followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 72;
            if (followLatest.current) setShowLatest(false);
          }}>
            {thread.messages.length === 0 && <p className="public-messages-list-empty">{pending ? "Send a message request to start the conversation." : "Send the first message."}</p>}
            {thread.messages.map((message) => <div key={message.id} className="public-message-group" data-own={message.sender_id === user?.id} data-reply-target={reply?.id === message.id}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse' || (event.target instanceof Element && event.target.closest('button,a'))) return;
              cancelHold();
              const { clientX: x, clientY: y, currentTarget: group } = event;
              hold.current = { x, y, timer: setTimeout(() => {hold.current = null;openMessageMenu(message, group);}, 480) };
            }}
            onPointerMove={(event) => {if (hold.current && Math.hypot(event.clientX - hold.current.x, event.clientY - hold.current.y) > 9) cancelHold();}}
            onPointerCancel={cancelHold} onPointerUp={cancelHold} onPointerLeave={cancelHold}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || !(event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10')) return;
              event.preventDefault();
              openMessageMenu(message, event.currentTarget);
            }}
            onContextMenu={(event) => {event.preventDefault();cancelHold();openMessageMenu(message, event.currentTarget);}}>
              {message.reply_preview && <ReplyQuote preview={message.reply_preview} />}
              {message.track_id && <SharedSong message={message} playing={player.currentTrack?.id === message.track_id && player.isPlaying && (!songData(message)?.lyrics || lyricPlayback.current === message.id)} onPlay={() => void perform(() => playSharedSong(message))} busy={busy} />}
              {message.media_url && !messageGifId(message) && ['image', 'video'].includes(message.media_type) && <ChatMedia key={message.id} chatId={id} message={message} />}
              {messageGifId(message) && <MomentGif id={messageGifId(message)} label="Shared GIF" />}
              {message.text && <p className="public-message-bubble" data-own={message.sender_id === user?.id}>{message.text}</p>}
              <MessageReactions message={message} userId={user?.id} />
              {messageTime(message.created_date) && <time dateTime={message.created_date}>{messageTime(message.created_date)}</time>}
            </div>)}
            {peerTyping && currentPeer !== user?.id && <div className="public-message-typing" role="status" aria-live="polite" aria-label={peerName(thread.chat) + " is typing"}><span className="public-message-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>}
          </div>
          {activeMenu && <Dialog open onOpenChange={(open) => {if (!open) setMenu(null);}}>
            <DialogContent ref={setMenuPanel} showClose={false} className="public-message-actions public-message-context"
            data-own={activeMenu.sender_id === user?.id}>
              <DialogTitle className="sr-only">Message options</DialogTitle>
              <DialogDescription className="sr-only">React or choose an action for this message.</DialogDescription>
              <div className="public-message-reactions" role="group" aria-label="Emoji reactions" aria-busy={savingReaction !== null}>
                {REACTIONS.map((emoji, index) => {
                  const selected = (activeMenu.sender_id === user?.id ? activeMenu.sender_reaction : activeMenu.recipient_reaction) === emoji;
                  return <button key={emoji} type="button" aria-label={REACTION_LABELS[index]} aria-pressed={selected} data-saving={savingReaction === emoji} disabled={busy} onClick={() => void perform(async () => {
                    setSavingReaction(emoji);
                    let saved;
                    try {
                      saved = await messages('react', { id, messageId: activeMenu.id, emoji: selected ? '' : emoji });
                    } finally {
                      setSavingReaction(null);
                    }
                    if (saved.messageId !== activeMenu.id) throw Error('Reaction could not be confirmed. Try again.');
                    if (currentChat.current === id) {
                      readVersion.current++;
                      setThread((previous) => previous?.chat.id === id ? { ...previous, messages: previous.messages.map((message) => message.id === saved.messageId ? {
                          ...message, sender_reaction: saved.sender_reaction, recipient_reaction: saved.recipient_reaction
                        } : message) } : previous);
                      setMenu(null);
                    }
                  })}>{emoji}</button>;
                })}
              </div>
              {savingReaction && <p role="status" className="public-message-reaction-status">Saving reaction…</p>}
              {error && <p role="alert" className="rounded-xl border bg-card p-3 text-sm">{error}</p>}
              <div className="public-message-menu-preview">{activeMenu.text || (activeMenu.track_id ? 'Shared a song' : messageGifId(activeMenu) ? 'Sent a GIF' : 'Message')}</div>
              <div className="public-message-menu-items">
              {canSend && <button type="button" onClick={() => {
                  setReply({ id: activeMenu.id, name: activeMenu.sender_id === user?.id ? 'You' : peerName(thread.chat), text: activeMenu.text || (activeMenu.track_id ? 'Shared a song' : messageGifId(activeMenu) ? 'Sent a GIF' : 'Message') });
                  setMenu(null);
                  requestAnimationFrame(() => {scroll.current?.querySelector('[data-reply-target="true"]')?.scrollIntoView({ block: "center" });draftInput.current?.focus({ preventScroll: true });});
                }}><Reply size={17} /> Reply</button>}
              {activeMenu.text && <button type="button" onClick={() => {setMenu(null);void perform(() => navigator.clipboard.writeText(activeMenu.text));}}><Copy size={17} /> Copy</button>}
              {activeMenu.track_id && <Link to={'/track/' + encodeURIComponent(activeMenu.track_id)} onClick={() => setMenu(null)}><ExternalLink size={17} /> Open song</Link>}
              {activeMenu.track_id && <button type="button" onClick={() => {setMenu(null);void perform(() => playSharedSong(activeMenu));}}>{player.currentTrack?.id === activeMenu.track_id && player.isPlaying ? 'Pause song' : 'Play song'}</button>}
              {activeMenu.sender_id === user?.id && <button type="button" className="text-destructive" disabled={busy} onClick={() => {
                  if (!window.confirm('Delete this message for both people?')) return;
                  setMenu(null);
                  void perform(async () => {
                    await messages('delete_message', { id, messageId: activeMenu.id });
                    if (currentChat.current === id) {
                      setThread((previous) => previous?.chat.id === id ? { ...previous, messages: previous.messages.filter((message) => message.id !== activeMenu.id) } : previous);
                      setReply((previous) => previous?.id === activeMenu.id ? null : previous);
                      await loadThread(id);
                    }
                    await loadInbox();
                  });
                }}><Trash2 size={17} /> Delete message</button>}
              </div>
            </DialogContent>
          </Dialog>}
          {showLatest && <button type="button" className="public-messages-latest" onClick={jumpToLatest}>Jump to latest</button>}
          {incoming && thread.messages.length > 0 && <div className="flex gap-3 p-3">
            {[true, false].map((accept) => <button className="rounded-lg border px-3 py-2" key={String(accept)} disabled={busy} onClick={() => void perform(async () => {
              await messages('respond', { id, accept });
              if (currentChat.current === id) {
                if (accept) {
                  await loadThread(id);
                } else setParams({});
              }
              await loadInbox();
            })}>{accept ? 'Accept request' : 'Decline'}</button>)}
          </div>}

          {canSend && attachment?.lyrics && <LyricDraftPreview track={attachment} onRemove={() => {setAttachment(null);setLyricShare(null);}} disabled={busy} />}
          {canSend && selectingLyrics && attachment && <LyricSharePicker track={attachment} onClose={() => setSelectingLyrics(false)} onSelect={(lyrics) => {
            setAttachment({ ...attachment, lyrics });setSelectingLyrics(false);
          }} />}
          {canSend && songPicker && songPicker !== "recent" && <TrackPickerSheet title={songPicker === "lyrics" ? "Choose a song for your lyrics" : "Share a song"} description="Choose a song to send in this conversation." selectedIds={[]} onClose={() => setSongPicker(false)} onToggle={(_, song) => {setAttachment(song);if (songPicker === "lyrics") setSelectingLyrics(true);setSongPicker(false);}} />}
          {canSend && showGifs && <MomentGifPicker onClose={() => setShowGifs(false)} onSelect={(id) => {setMediaDraft(null);setGif(id);setShowGifs(false);}} />}

          {canSend && selectedMedia && <div className="public-message-attachment public-message-upload-preview">
            {selectedMedia.type === 'image' ? <img src={selectedMedia.preview} alt="Selected photo" /> : <video src={selectedMedia.preview} muted playsInline preload="metadata" />}
            <span className="truncate">{selectedMedia.file.name}</span>
            <button type="button" aria-label="Remove attachment" disabled={busy} onClick={() => setMediaDraft(null)}><X size={18} /></button>
          </div>}
          {canSend && <form className="public-messages-compose" onSubmit={(event) => {event.preventDefault();void perform(async () => {
              const text = draft.trim();
              const trackId = attachment?.id || '',replyId = reply?.id || '',lyrics = attachment?.lyrics || null;
              const lyricKey = JSON.stringify(lyrics);
              if (!text && !trackId && !gif && !selectedMedia) return;
              let media;
              if (selectedMedia) {
                const file = selectedMedia.file;
                let uri = uploadedMedia.current.get(file);
                if (!uri) {
                  uri = (await base44.integrations.Core.UploadPrivateFile({ file }))?.file_uri;
                  if (!uri) throw Error('Attachment upload could not be confirmed. Try again.');
                  uploadedMedia.current.set(file, uri);
                }
                media = { uri, type: selectedMedia.type };
              }
              const existing = pendingSends.current.get(id);
              const requestId = existing?.text === text && existing?.trackId === trackId && existing?.replyId === replyId && existing?.lyricKey === lyricKey && existing?.gifId === gif && existing?.mediaUri === media?.uri ? existing.requestId : globalThis.crypto?.randomUUID?.();
              pendingSends.current.set(id, { text, trackId, replyId, lyricKey, gifId: gif, mediaUri: media?.uri, requestId });
              await messages('send', { id, text, trackId, replyId, requestId, lyrics, gifId: gif, media });
              void messages('typing', { id, typing: false }).catch(() => {});
              pendingSends.current.delete(id);
              setMediaDraft((previous) => previous === selectedMedia ? null : previous);
              setDrafts((previous) => {
                if (previous.get(id) !== draft) return previous;
                const next = new Map(previous);
                next.delete(id);
                return next;
              });
              if (lyrics) setLyricShare(null);
              if (currentChat.current === id) {
                followLatest.current = true;
                setReply((previous) => previous?.id === replyId ? null : previous);
                setGif((previous) => previous === gif ? "" : previous);
                setAttachment((previous) => previous?.id === trackId ? null : previous);
                await loadThread(id);
              }
              await loadInbox();
            });}}>
            <Popover open={Boolean(musicMenu)} onOpenChange={(open) => setMusicMenu(open ? "attachments" : false)}>
              <PopoverTrigger asChild>
                <button type="button" className="public-message-add" aria-label="Add attachment" disabled={busy}><Plus size={22} /></button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" sideOffset={9} collisionPadding={12}
              aria-label={musicMenu === "music" ? "Share music" : "Add to message"} className="public-message-attachment-menu">
                {musicMenu === "music" ? <>
                  <button type="button" onClick={() => setMusicMenu("attachments")}><ChevronLeft size={19} /> Attachments</button>
                  <button type="button" onClick={() => {setMusicMenu(false);setSongPicker("recent");}}><Disc3 size={19} /> Share recently played</button>
                  <button type="button" onClick={() => {setMusicMenu(false);setSongPicker("song");}}><Library size={19} /> Share song</button>
                  <button type="button" onClick={() => {setMusicMenu(false);setSongPicker("lyrics");}}><TextQuote size={19} /> Share lyrics</button>
                </> : <>
                  <button type="button" onClick={() => {mediaInput.current?.click();setMusicMenu(false);}}><ImagePlus size={19} /> Photo or video</button>
                  <button type="button" onClick={() => setMusicMenu("music")}><Music2 size={19} /> Music</button>
                  <button type="button" onClick={() => {setMusicMenu(false);setShowGifs(true);}}><Clapperboard size={19} /> {gif ? "Change GIF" : "GIF"}</button>
                </>}
              </PopoverContent>
            </Popover>
            <input hidden ref={mediaInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" aria-label="Choose photo or video" onChange={(event) => {const file = event.currentTarget.files?.[0];event.currentTarget.value = '';selectMedia(file);}} />
            <div className="public-message-input-pill" data-has-gif={Boolean(gif)} data-has-lyrics={Boolean(attachment?.lyrics)} data-has-song={Boolean(attachment && !attachment.lyrics)}>
            {attachment && !attachment.lyrics && <SongDraftPreview track={attachment} disabled={busy} onRemove={() => {setAttachment(null);setLyricShare(null);}} />}
            {gif && <div className="public-message-gif-draft"><MomentGif id={gif} label="Selected GIF" /><button type="button" aria-label="Remove GIF" disabled={busy} onClick={() => setGif("")}><X size={15} /></button></div>}
            <textarea ref={draftInput} rows={1} aria-label={reply ? "Reply" : "Message"} placeholder={attachment && !attachment.lyrics ? "Add a comment or send" : gif ? "Add a comment or send" : reply ? "Reply" : pending ? 'Write a message request…' : 'Write a message…'} className="min-w-0 flex-1 rounded-lg border bg-background p-2" value={draft} maxLength={2000} onChange={(event) => {
                const value = event.target.value;
                setDrafts((previous) => {
                  const next = new Map(previous);
                  if (value) next.set(id, value);else
                  next.delete(id);
                  return next;
                });
              }} onKeyDown={(event) => {
                if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing || event.keyCode === 229 || !window.matchMedia('(pointer: fine)').matches) return;
                event.preventDefault();
                if (!busy && (draft.trim() || attachment || gif || selectedMedia)) event.currentTarget.form?.requestSubmit();
              }} />
            <button type="submit" aria-label="Send message" disabled={busy || !draft.trim() && !attachment && !gif && !selectedMedia}><ArrowUp size={17} /></button>
            </div>
          </form>}
          {canSend && songPicker === "recent" && <RecentlyPlayedPicker
            onClose={() => setSongPicker(false)}
            onSelect={(song) => {setAttachment(song);setSongPicker(false);}} />}
          {pending && !incoming && !canSend && <p className="text-sm">Waiting for them to accept your request.</p>}
        </>}
      </section> : <div className="public-messages-empty"><MessageCircle size={32} aria-hidden="true" /><h2>Your conversations</h2><p>Choose a chat or start a new message.</p><button type="button" onClick={() => setComposing(true)}><SquarePen size={16} /> New message</button></div>}
    </div>
  </main>;
}

function songData(message) {
  try {return JSON.parse(message.track);} catch {return null;}
}
function SharedSong({ message, onPlay, busy, playing }) {
  const song = songData(message);
  const lyrics = Array.isArray(song?.lyrics?.lines) ? song.lyrics : null;
  const cover = useCoverUrl(typeof song?.cover_art_url === 'string' ? song.cover_art_url : '');
  const [failedCover, setFailedCover] = useState(null);
  const title = typeof song?.title === 'string' && song.title ? song.title : 'Shared song';
  const artist = typeof song?.artist === 'string' ? song.artist : '';
  const seconds = Number.isSafeInteger(lyrics?.startMs) ? Math.floor(lyrics.startMs / 1000) : null;
  return <div className={lyrics ? "public-message-lyric-card public-lyric-gradient" : undefined}>
    {lyrics && <LyricCoverGradient cover={cover} animated={lyrics.animated === true} />}
    {lyrics && <div className="public-message-lyric-lines">
      {lyrics.lines.map((line, index) => <div key={index}>{line}</div>)}
      {seconds !== null && <span>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>}
    </div>}
    <div className="public-message-song">
    <Link className="public-message-song-link" to={"/track/" + encodeURIComponent(message.track_id)}>
      <span className="public-message-song-cover" aria-hidden="true">
        {cover && failedCover !== cover ? <img src={cover} alt="" loading="lazy" onError={() => setFailedCover(cover)} /> : <Music2 size={21} />}
      </span>
      <span className="min-w-0">
        <strong className="public-message-song-title">{title}</strong>
        {artist && <span className="public-message-song-artist block truncate">{artist}</span>}
        <span className="public-message-song-brand">PUBLIC.</span>
      </span>
    </Link>
    <button type="button" className="public-message-song-play" data-playing={playing} onClick={onPlay} disabled={busy} aria-label={(playing ? "Pause " : "Play ") + title}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
    </div>
  </div>;
}

function ReplyQuote({ preview }) {
  let quote;
  try {quote = JSON.parse(preview);} catch {return null;}
  if (typeof quote?.text !== "string") return null;
  return <blockquote className="public-message-reply-quote">
    <strong className="block truncate">{quote.sender_name || "Reply"}</strong>
    <span className="block truncate">{quote.text}</span>
  </blockquote>;
}

function messageGifId(message) {
  return message.media_type === "image" ? message.media_url?.match(/^https:\/\/media\.giphy\.com\/media\/([a-zA-Z0-9]{1,64})\/giphy\.gif$/)?.[1] : null;
}

function MessageReactions({ message, userId }) {
  const own = message.sender_id === userId ? message.sender_reaction : message.recipient_reaction;
  const reactions = [message.sender_reaction, message.recipient_reaction].filter((emoji) => REACTIONS.includes(emoji));
  if (!reactions.length) return null;
  return <div className="public-message-reaction-group" role="group" aria-label="Message reactions">
    {[...new Set(reactions)].map((emoji) => {
      const count = reactions.filter((value) => value === emoji).length;
      const label = REACTION_LABELS[REACTIONS.indexOf(emoji)];
      return <span className="public-message-reaction-badge" data-mine={own === emoji} key={emoji} role="img"
      aria-label={label + ', ' + count + (own === emoji ? ', including you' : '')}>
        <span aria-hidden="true">{emoji}{count > 1 && <small>{count}</small>}</span>
      </span>;
    })}
  </div>;
}

function ChatMedia({ chatId, message }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const image = message.media_type === 'image';
  const open = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await messages('open_media', { id: chatId, messageId: message.id });
      if (!result.url?.startsWith('https://')) throw Error();
      setUrl(result.url);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [chatId, message.id]);
  useEffect(() => { void open(); }, [open]);
  const fail = () => {setUrl('');setError(true);};
  if (url) return image ? <img className="public-message-upload" src={url} alt="Shared photo" onError={fail} /> : <video className="public-message-upload" src={url} controls playsInline preload="metadata" onError={fail} />;
  return <button type="button" className="public-message-open-media" disabled={loading} onClick={() => void open()}>
    {loading ? 'Loading attachment…' : error ? 'Couldn’t open. Tap to retry' : 'Loading attachment…'}
  </button>;
}

function SongDraftPreview({ track, onRemove, disabled }) {
  const cover = useCoverUrl(track.cover_art_url);
  return <div className="public-message-song-draft">
    {cover ? <img src={cover} alt="" loading="lazy" /> : <Music2 size={20} aria-hidden="true" />}
    <span className="min-w-0"><strong className="block truncate">{track.title}</strong><small className="block truncate">{track.artist || track.uploader_name || "PUBLIC"}</small><small className="public-message-song-brand">PUBLIC.</small></span>
    <button type="button" aria-label="Remove song" disabled={disabled} onClick={onRemove}><X size={17} /></button>
  </div>;
}

function LyricDraftPreview({ track, onRemove, disabled }) {
  const cover = useCoverUrl(track.cover_art_url);
  const lines = track.lyrics?.lines || [];
  return <div className="public-message-lyric-preview">
    <div className="public-message-lyric-preview-card public-lyric-gradient">
      <LyricCoverGradient cover={cover} animated={track.lyrics?.animated === true} />
      <div className="public-message-lyric-lines">{lines.map((line, index) => <div key={index}>{line}</div>)}</div>
      <div className="public-message-song">
        <span className="public-message-song-cover" aria-hidden="true">{cover && <img src={cover} alt="" />}</span>
        <span className="min-w-0"><strong className="public-message-song-title">{track.title}</strong><span className="public-message-song-artist block truncate">{track.artist || track.uploader_name || "PUBLIC"}</span><span className="public-message-song-brand">PUBLIC.</span></span>
      </div>
      <button type="button" className="public-message-lyric-remove" aria-label="Remove lyric card" disabled={disabled} onClick={onRemove}><X size={17} /></button>
    </div>
  </div>;
}

function RecentlyPlayedPicker({ onClose, onSelect }) {
  const tracks = getRecentPlays().filter((track) => track.is_published);
  return <section className="public-message-recent" aria-label="Share recently played">
    <header><h3>Share recently played</h3><button type="button" aria-label="Close recently played" onClick={onClose}><X size={18} /></button></header>
    {tracks.length ? <div className="public-message-recent-grid">{tracks.map((track) => <RecentTrack key={track.id} track={track} onSelect={onSelect} />)}</div> :
    <p>No shareable songs in your recent plays yet.</p>}
  </section>;
}

function RecentTrack({ track, onSelect }) {
  const cover = useCoverUrl(track.cover_art_url);
  return <button type="button" onClick={() => onSelect(track)}>
    {cover ? <img src={cover} alt="" loading="lazy" /> : <Music2 size={20} aria-hidden="true" />}
    <span className="min-w-0"><strong className="block truncate">{track.title}</strong><small className="block truncate">{track.artist}</small></span>
  </button>;
}