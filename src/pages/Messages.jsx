import { mergeEarlierMessages, mergeLatestMessages } from '@/components/messages/messageHistory';
import { readMessageDrafts, writeMessageDrafts } from '@/components/messages/messageDrafts';
import { messageRunPosition } from '@/components/messages/messageRuns';
import { messageSender } from '@/components/messages/messageSender';
import ConversationMuteSwitch from '@/components/messages/ConversationMuteSwitch';
import { messageReactionBadges, ownMessageReaction } from '@/components/messages/messageReactions';
import GroupChatPanel, { GroupChatAvatar } from '@/components/messages/GroupChatPanel';
import { getRecentPlays } from '@/lib/recentPlays';
import MomentGifPicker, { MomentGif } from '@/components/moments/MomentGifPicker';
import '@/components/moments/moment-tools.css';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { copyText } from '@/lib/shareLink';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowUp, BellOff, Check, ChevronLeft, ChevronRight, Clapperboard, Copy, Disc3, ExternalLink, Library, Trash2, Users, MessageCircle, Image, ImagePlus, Info, Music2, Palette, Pause, Play, Plus, Reply, Search, ShoppingBag, SquarePen, TextQuote, UserRound, X } from 'lucide-react';
import LyricSharePicker from '@/components/LyricSharePicker';
import LyricCoverGradient from '@/components/LyricCoverGradient';
import TrackPickerSheet from '@/components/profile/TrackPickerSheet';
import ProfileColorPicker from '@/components/profile/ProfileColorPicker';
import ProfileMarketplace from '@/components/profile/ProfileMarketplace';
import MotionGradient from '@/components/MotionGradient';
import { usePlayer } from '@/context/PlayerContext';
import Avatar from '@/components/Avatar';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import './messages.css';
import '@/components/messages/conversation-layout.css';
import '@/components/messages/messages-layout.css';
import '@/components/messages/message-bubbles.css';

const REACTIONS = ["❤️", "👍", "👎", "😂", "‼️", "❓", "🔥"];
const REACTION_LABELS = ['Love', 'Like', 'Dislike', 'Laugh', 'Emphasize', 'Question', 'Fire'];


async function messages(action, data = {}) {
  try {
    const result = await base44.functions.invoke('messages', { action, ...data });
    if (!result.data || result.data.error) throw Error(result.data?.error || 'Messages are unavailable.');
    return result.data;
  } catch (error) {
    const failure = new Error(error.response?.data?.error || error.message);
    failure.status = error.response?.status || error.status;
    throw failure;
  }
}

function createSendRequestId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes);else
  for (let index = 0; index < bytes.length; index++) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = bytes[6] & 0x0f | 0x40;
  bytes[8] = bytes[8] & 0x3f | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
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

function messageDay(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
}

function PersonAvatar({ person, size = 40 }) {
  return <span className="public-messages-avatar" style={{ width: size, height: size, "--message-avatar-size": size + "px" }}><Avatar user={person} size={size} motion /></span>;
}

export default function Messages() {
  const { user } = useAuth();
  return <MessagesPage key={user?.id} user={user} />;
}

function MessagesPage({ user }) {
  const [params, setParams] = useSearchParams();
  const [viewport, setViewport] = useState(() => ({ height: window.visualViewport?.height || window.innerHeight, top: window.visualViewport?.offsetTop || 0 }));
  useEffect(() => {
    let frame;
    const sync = () => {cancelAnimationFrame(frame);frame = requestAnimationFrame(() => {const height = window.visualViewport?.height || window.innerHeight,top = window.visualViewport?.offsetTop || 0;setViewport((previous) => Math.abs(previous.height - height) < 1 && Math.abs(previous.top - top) < 1 ? previous : { height, top });});};
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('scroll', sync);
    sync();
    return () => {cancelAnimationFrame(frame);window.removeEventListener('resize', sync);window.visualViewport?.removeEventListener('resize', sync);window.visualViewport?.removeEventListener('scroll', sync);};
  }, []);
  const viewportStyle = { '--messages-viewport-height': viewport.height + 'px', '--messages-viewport-top': viewport.top + 'px', '--messages-sheet-top': viewport.top + Math.max(12, (viewport.height - 860) / 2) + 'px' };
  const id = params.get('chat');
  const threadCache=useRef(new Map());
  const [inbox, setInbox] = useState(null),[loadedThread, setThread] = useState(null),[requests, setRequests] = useState(false);
  const thread = loadedThread?.chat?.id === id ? loadedThread : null;
  const [menu, setMenu] = useState(null);
  const [groupMode, setGroupMode] = useState(false);
  const [groupPeople, setGroupPeople] = useState([]);
  const [groupName, setGroupName] = useState('');
  const groupCreationRequest = useRef(null);
  const [chatBackgrounds, setChatBackgrounds] = useState(() =>
  user?.message_backgrounds && typeof user.message_backgrounds === 'object' ? user.message_backgrounds : {}
  );
  const [chatDetailsOpen, setChatDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState('backgrounds');
  const [sharedPages,setSharedPages]=useState({});
  const sharedLoads=useRef(new Set());
  const [savingBackground, setSavingBackground] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState('');
  const [showChatColorEditor, setShowChatColorEditor] = useState(false);
  const [showChatMarketplace, setShowChatMarketplace] = useState(false);
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
  const [drafts, setDrafts] = useState(() => {try{return readMessageDrafts(window.sessionStorage,user?.id);}catch{return new Map();}});
  useEffect(()=>{try{writeMessageDrafts(window.sessionStorage,user?.id,drafts);}catch{}},[drafts,user?.id]);
  const draft = drafts.get(id) || '';
  const lastTypedAt = useRef(0);
  const draftText = useRef(draft);
  draftText.current = draft;
  const typingMisses = useRef(0);
  const [reply, setReply] = useState(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingPollLock = useRef(false);
  const draftInput = useRef(null);
  const [inboxQuery, setInboxQuery] = useState('');
  const player = usePlayer();
  const [musicMenu, setMusicMenu] = useState(/** @type {false | "attachments" | "music"} */false);
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
  useLayoutEffect(()=>{
    const input=draftInput.current;
    if(!input)return;
    const resize=()=>{input.style.height='0px';const maximum=Math.max(44,Math.min(120,viewport.height*.2));input.style.height=Math.max(44,Math.min(input.scrollHeight,maximum))+'px';input.style.overflowY=input.scrollHeight>maximum?'auto':'hidden';};
    resize();window.addEventListener('resize',resize);
    return()=>window.removeEventListener('resize',resize);
  },[draft,id,viewport.height,loadedThread?.chat?.id]);
  const [gif, setGif] = useState(""),[showGifs, setShowGifs] = useState(false);
  const [songPicker, setSongPicker] = useState(/** @type {false | "recent" | "song" | "lyrics"} */false);
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
  const [sendStage,setSendStage]=useState('');
  const sendingChat=useRef(null);
  const [online,setOnline]=useState(()=>navigator.onLine);
  const [readError, setReadError] = useState(null);
  const inboxPending = useRef(false);
  const readVersion = useRef(0);
  const olderPending=useRef(false);
  const pendingScrollAnchor=useRef(null);
  const [loadingOlder,setLoadingOlder]=useState(false);
  const [olderError,setOlderError]=useState('');
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
        participant_names: Array.isArray(data.chat.participant_names) ? data.chat.participant_names : []
      };
      const safeMessages = data.messages.filter((message) => message && typeof message.id === 'string');
      const cached=threadCache.current.get(chatId);
      const snapshot={chat:safeChat,messages:mergeLatestMessages(cached,safeMessages),latestIds:safeMessages.map(message=>message.id),historyCursor:cached&&Object.prototype.hasOwnProperty.call(cached,'historyCursor')?cached.historyCursor:data.nextCursor||null};
      threadCache.current.delete(chatId);threadCache.current.set(chatId,snapshot);
      if(threadCache.current.size>20)threadCache.current.delete(threadCache.current.keys().next().value);
      setThread(snapshot);
      setReadError(null);
      setInbox((previous) => previous?.map((chat) => chat.id === chatId ? { ...chat, unread: false } : chat) ?? null);
    } catch (error) {
      if (version === readVersion.current && currentChat.current === chatId) {
        setReadError({ id: chatId, message: error.message });
        if ([401, 403, 404].includes(error.status)) {threadCache.current.delete(chatId);setThread(null);setChatDetailsOpen(false);setShowChatColorEditor(false);setShowChatMarketplace(false);setInbox((previous) => previous?.filter((chat) => chat.id !== chatId) ?? null);}
      }
    }
  }, []);
  useEffect(()=>{
    const offline=()=>setOnline(false);
    const reconnect=()=>{setOnline(true);void loadInbox();if(currentChat.current)void loadThread(currentChat.current);};
    window.addEventListener('offline',offline);window.addEventListener('online',reconnect);
    return()=>{window.removeEventListener('offline',offline);window.removeEventListener('online',reconnect);};
  },[loadInbox,loadThread]);
  useEffect(()=>{if(loadedThread?.chat?.id)threadCache.current.set(loadedThread.chat.id,loadedThread);},[loadedThread]);
  useEffect(() => {
    void loadInbox();
    const timer = setInterval(() => {if(!document.hidden&&navigator.onLine)void loadInbox();}, 15000);
    return () => clearInterval(timer);
  }, [loadInbox]);
  useEffect(() => {
    setOlderError('');setLoadingOlder(false);pendingScrollAnchor.current=null;
    backgroundSaveVersion.current++;setSavingBackground(false);setUploadingBackground(false);
    setChatDetailsOpen(false);setShowChatColorEditor(false);setShowChatMarketplace(false);setBackgroundError('');
    setMediaDraft(null);setMenu(null);
    setThread(threadCache.current.get(id)||null);setGif('');setShowGifs(false);setReply(null);setAttachment(id ? lyricShare : null);setSelectingLyrics(false);setMusicMenu(false);setSongPicker(false);setError('');setReadError(null);
    if (!id) return;
    let pending = false;
    const refresh = async (initial = false) => {
      if (pending || !initial && (operation.current||olderPending.current||document.hidden||!navigator.onLine)) return;
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
      if (!active || typingPollLock.current||document.hidden||!navigator.onLine) return;
      typingPollLock.current = true;
      try {
        const typing = Boolean(draftText.current.trim()) &&
          document.activeElement === draftInput.current && Date.now() - lastTypedAt.current < 5000;
        await messages('typing', { id, typing });
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
    return () => {
      active = false;
      clearInterval(timer);
      if (navigator.onLine) void messages('typing', { id, typing: false }).catch(() => {});
    };
  }, [id]);
  async function perform(work) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);setError('');
    try {await work();} catch (error) {setError(error.message);} finally {operation.current = false;setBusy(false);}
  }
  const peerName = (chat) => {
    if (chat?.is_group) return chat.group_name || 'Group chat';
    const ids = Array.isArray(chat?.participant_ids) ? chat.participant_ids : [];
    const names = Array.isArray(chat?.participant_names) ? chat.participant_names : [];
    const peerIndex = ids.findIndex((member) => member !== user?.id);
    return chat?.peer?.display_name || names[peerIndex] || 'PUBLIC listener';
  };
  const peerFor = (chat) => chat.peer || inbox?.find((row) => row.id === chat.id)?.peer || { display_name: peerName(chat) };
  const currentPeer = thread?.chat?.is_group ? 'group' : Array.isArray(thread?.chat?.participant_ids) ? thread.chat.participant_ids.find((member) => member !== user?.id) : null;
  const activeBackground = id ? thread?.chat?.background || chatBackgrounds[id] || { type: 'none' } : { type: 'none' };
  const backgroundSaveQueue = useRef(Promise.resolve());
  const backgroundSaveVersion = useRef(0);
  const parseBackgroundValue = (value) => {
    try {return JSON.parse(value || '');} catch {return null;}
  };
  const gradientWallpaper = activeBackground.type === 'gradient' ? parseBackgroundValue(activeBackground.value) : null;
  const videoWallpaper = activeBackground.type === 'video' ? parseBackgroundValue(activeBackground.value) : null;
  const backgroundStyle = activeBackground.type === 'color' ?
  { backgroundImage: 'none', backgroundColor: activeBackground.value } :
  activeBackground.type === 'photo' ?
  { backgroundImage: 'url("' + activeBackground.value + '")' } :
  undefined;
  // Conversation backgrounds stay independent from profile appearance.
  // Start with no colors until the user adds them in this editor.
  const savedPalette = gradientWallpaper || {
    mode: 'custom',
    colors: [],
    motion: 'flow',
    speed: 1
  };
  async function saveConversationPalette(value) {
    if (!id || !thread?.chat?.id) throw new Error('Choose a conversation first.');
    const chatId = id;
    const version = ++backgroundSaveVersion.current;
    const background = value.mode === 'off' ? { type: 'none' } : {
      type: 'gradient',
      value: JSON.stringify({
        colors: value.colors.slice(0, 5),
        motion: value.motion === 'still' ? 'still' : 'flow',
        speed: Math.max(0.35, Math.min(1.6, Number(value.speed) || 1)),
      }),
    };
    setSavingBackground(true);
    setBackgroundError('');
    const save = backgroundSaveQueue.current.catch(() => {}).then(() =>
      messages('set_background', { id: chatId, background })
    );
    backgroundSaveQueue.current = save;
    try {
      const result = await save;
      if (!result?.background) throw new Error('Background save could not be confirmed.');
      setChatBackgrounds(current => ({ ...current, [chatId]: result.background }));
      if (version === backgroundSaveVersion.current && currentChat.current === chatId) {
        setThread(current => current?.chat?.id === chatId
          ? { ...current, chat: { ...current.chat, background: result.background } }
          : current);
      }
    } catch (error) {
      if (version === backgroundSaveVersion.current && currentChat.current === chatId) {
        setBackgroundError(error.message || 'Could not save this gradient.');
      }
      throw error;
    } finally {
      if (version === backgroundSaveVersion.current) setSavingBackground(false);
    }
  }
  function chooseMarketBackground(asset) {
    const src = typeof asset === 'string' ? asset : asset?.videoUrl || asset?.gifUrl || asset?.url;
    if (!src) {setBackgroundError('This marketplace item has no usable media.');return;}
    if (asset && typeof asset === 'object' && asset.videoUrl) {
      void saveChatBackground({ type: 'video', value: JSON.stringify({ src: asset.videoUrl, poster: asset.url, title: asset.name || 'PUBLIC Market clip' }) });
    } else {
      void saveChatBackground({ type: 'photo', value: src });
    }
  }
  async function saveChatBackground(nextBackground) {
    if (!user?.id || !id || !thread?.chat?.id) return;
    const chatId = id;
    const previous = thread.chat.background || chatBackgrounds[chatId] || { type: 'none' };
    const version = ++backgroundSaveVersion.current;
    setBackgroundError('');
    setChatBackgrounds((current) => ({ ...current, [chatId]: nextBackground }));
    setThread((current) => current?.chat?.id === chatId ?
    { ...current, chat: { ...current.chat, background: nextBackground } } :
    current);
    setSavingBackground(true);
    const save = backgroundSaveQueue.current.catch(() => {}).then(() =>
    messages('set_background', { id: chatId, background: nextBackground })
    );
    backgroundSaveQueue.current = save;
    try {
      const result = await save;
      if (version === backgroundSaveVersion.current && result?.background) {
        setThread((current) => current?.chat?.id === chatId ?
        { ...current, chat: { ...current.chat, background: result.background } } :
        current);
      }
    } catch (saveError) {
      if (version === backgroundSaveVersion.current) {
        setChatBackgrounds((current) => ({ ...current, [chatId]: previous }));
        setThread((current) => current?.chat?.id === chatId ?
        { ...current, chat: { ...current.chat, background: previous } } :
        current);
        setBackgroundError(saveError.message || 'Could not save this background. Please try again.');
      }
    } finally {
      if (version === backgroundSaveVersion.current) setSavingBackground(false);
    }
  }
  async function uploadChatBackground(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setBackgroundError('Choose a JPG, PNG, or WebP photo up to 8 MB.');
      return;
    }
    const chatId = id;
    const version = backgroundSaveVersion.current;
    setUploadingBackground(true);
    setBackgroundError('');
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (!result?.file_url) throw new Error('Photo upload was not confirmed. Please retry.');
      if (currentChat.current !== chatId || version !== backgroundSaveVersion.current) return;
      await saveChatBackground({ type: 'photo', value: result.file_url });
    } catch (uploadError) {
      if (currentChat.current === chatId) setBackgroundError(uploadError.message || 'Could not upload this photo. Please try again.');
    } finally {
      if (currentChat.current === chatId) setUploadingBackground(false);
    }
  }
  const migratedBackgrounds = useRef(new Set());
  useEffect(() => {
    const legacy = id ? chatBackgrounds[id] : null;
    if (!id || !thread?.chat?.id || thread.chat.background || !legacy || migratedBackgrounds.current.has(id)) return;
    migratedBackgrounds.current.add(id);
    void saveChatBackground(legacy);
  }, [id, thread?.chat?.id, thread?.chat?.background, chatBackgrounds]);

  const groupInvited = Boolean(thread?.chat?.is_group && thread.chat.invited_ids?.includes(user?.id));
  const pending = groupInvited || thread?.chat.dm_status === 'pending';
  const incoming = groupInvited || pending && thread?.chat.dm_requester !== user?.id;
  const canSend = !groupInvited && (thread?.chat.dm_status === 'accepted' || pending && !incoming && !thread.messages.length);
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
  const matches = searching && contacts ? contacts.filter((person) => [person.name, person.display_name, person.username].some(value =>
    typeof value === 'string' && value.toLocaleLowerCase().includes(searchTerm.replace(/^@/, ''))
  )) : [];
  function startChat(target) {
    void perform(async () => {
      const chat = await messages('start', target);
      setParams({ chat: chat.id });
      setComposing(false);
      setContactQuery('');
      await loadInbox();
    });
  }
  function createGroup() {
    void perform(async () => {
      const name = groupName.trim();
      const memberIds = groupPeople.map((person) => person.id).sort();
      const key = JSON.stringify([name, memberIds]);
      if (!groupCreationRequest.current || groupCreationRequest.current.key !== key) groupCreationRequest.current = { key, requestId: createSendRequestId() };
      const chat = await messages('create_group', { name, memberIds, requestId: groupCreationRequest.current.requestId });
      groupCreationRequest.current = null;
      setParams({ chat: chat.id });setComposing(false);setGroupMode(false);setGroupPeople([]);setGroupName('');setContactQuery('');setRequests(false);await loadInbox();
    });
  }
  const scroll = useRef(null);
  const messageStream=useRef(null);
  const [revealedTimestamp,setRevealedTimestamp]=useState(null);
  useEffect(()=>{setRevealedTimestamp(null);},[id]);
  useEffect(()=>{if(!revealedTimestamp)return;const timer=setTimeout(()=>setRevealedTimestamp(null),3500);return()=>clearTimeout(timer);},[revealedTimestamp]);
  const followLatest = useRef(true);
  const [showLatest, setShowLatest] = useState(false);
  const tabChats = inbox?.filter((chat) => requests === (chat.is_group ? Boolean(chat.invited_ids?.includes(user?.id)) : chat.dm_status === 'pending' && chat.dm_requester !== user?.id) && chat.dm_status !== 'declined' && (chat.is_group || chat.last_message_at || chat.dm_requester === user?.id));
  const inboxTerm = inboxQuery.trim().toLocaleLowerCase();
  const visibleChats = tabChats?.filter((chat) => !inboxTerm || peerName(chat).toLocaleLowerCase().includes(inboxTerm));
  useEffect(() => {followLatest.current = true;setShowLatest(false);}, [id]);
  function jumpToLatest() {
    followLatest.current = true;
    setShowLatest(false);
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }
  useLayoutEffect(()=>{
    if(!thread?.chat?.id||!messageStream.current||!scroll.current)return;
    let frame;
    const keepLatest=()=>{if(!followLatest.current)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(followLatest.current&&scroll.current)scroll.current.scrollTop=scroll.current.scrollHeight;});};
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(keepLatest);
    observer?.observe(messageStream.current);observer?.observe(scroll.current);
    keepLatest();
    return()=>{observer?.disconnect();cancelAnimationFrame(frame);};
  },[thread?.chat?.id]);
  async function loadEarlierMessages(){
    if(olderPending.current||!thread?.historyCursor||!id)return;
    const chatId=id,cursor=thread.historyCursor;
    olderPending.current=true;readVersion.current++;setLoadingOlder(true);setOlderError('');
    followLatest.current=false;
    try{
      const data=await messages('history',{id:chatId,cursor});
      if(currentChat.current!==chatId)return;
      if(!Array.isArray(data.messages))throw Error('Earlier messages could not load.');
      const history=scroll.current;
      const anchor=!followLatest.current&&history&&[...history.querySelectorAll('[data-message-id]')].find(element=>element.getBoundingClientRect().bottom>=history.getBoundingClientRect().top);
      pendingScrollAnchor.current=anchor?{chatId,messageId:anchor.dataset.messageId,top:anchor.getBoundingClientRect().top}:null;
      setThread(previous=>{
        if(previous?.chat?.id!==chatId)return previous;
        const snapshot={...previous,messages:mergeEarlierMessages(previous.messages,data.messages),historyCursor:data.nextCursor&&data.nextCursor!==cursor?data.nextCursor:null};
        threadCache.current.set(chatId,snapshot);return snapshot;
      });
    }catch(error){if(currentChat.current===chatId)setOlderError(error.message);}
    finally{olderPending.current=false;if(currentChat.current===chatId)setLoadingOlder(false);}
  }
  useLayoutEffect(()=>{
    const anchor=pendingScrollAnchor.current;
    if(!anchor||anchor.chatId!==id||!scroll.current)return;
    const element=[...scroll.current.querySelectorAll('[data-message-id]')].find(element=>element.dataset.messageId===anchor.messageId);
    if(element)scroll.current.scrollTop+=element.getBoundingClientRect().top-anchor.top;
    pendingScrollAnchor.current=null;
  },[id,thread?.messages]);
  const lastMessage = Array.isArray(thread?.messages) ? thread.messages.at(-1)?.id : null;
  async function loadSharedItems(kind,more=false){
    if(!id)return;
    const chatId=id,key=chatId+':'+kind;
    if(sharedLoads.current.has(key))return;
    const previous=sharedPages[key];
    if(more&&!previous?.cursor)return;
    sharedLoads.current.add(key);
    setSharedPages(current=>({...current,[key]:{...current[key],loading:true,error:''}}));
    try{
      const page=await messages('shared',{id:chatId,kind,...(more?{cursor:previous.cursor}:{})});
      if(!Array.isArray(page.messages))throw Error('Shared items could not load.');
      setSharedPages(current=>({...current,[key]:{messages:more?mergeEarlierMessages(current[key]?.messages||[],page.messages):page.messages,cursor:page.nextCursor||null,loaded:true,loading:false,error:''}}));
    }catch(error){setSharedPages(current=>({...current,[key]:{...current[key],loading:false,loaded:true,error:error.message}}));}
    finally{sharedLoads.current.delete(key);}
  }
  useEffect(()=>{if(chatDetailsOpen&&['photos','gifs','music'].includes(detailsTab))void loadSharedItems(detailsTab);},[chatDetailsOpen,detailsTab,id]);
  const sharedPhotos=(sharedPages[id+':photos']?.messages||[]).slice().reverse();
  const sharedGifs=(sharedPages[id+':gifs']?.messages||[]).slice().reverse();
  const sharedMusic=(sharedPages[id+':music']?.messages||[]).slice().reverse();
  useEffect(() => {
    if (!lastMessage) return;
    if (followLatest.current) jumpToLatest();else
    setShowLatest(true);
  }, [id, lastMessage]);
  return <main className="public-messages" style={viewportStyle} data-compact={viewport.height < 480} data-thread={Boolean(id)} data-composing={composing}>
    {!online&&<p className="public-messages-connection" role="status">You’re offline. Your draft is kept here.</p>}
    {error && <p role="alert" className="rounded-lg border p-3">{error}</p>}
    <div className="public-messages-layout">
      <aside className="public-messages-inbox">
        <header className="public-messages-inbox-header">
          <Link to="/" className="public-messages-back"><ChevronLeft size={17} /> PUBLIC</Link>
          <div><h1>Messages</h1><button type="button" aria-label="New message" aria-expanded={composing} onClick={() => {setComposing(!composing);setContactQuery('');setContacts(null);}}><SquarePen size={20} /></button></div>
        </header>
        {composing && <div className="px-4 pb-3">
          <div className="public-group-compose-tabs"><button aria-pressed={!groupMode} onClick={() => {setGroupMode(false);setGroupPeople([]);}}>Message</button><button aria-pressed={groupMode} onClick={() => setGroupMode(true)}><Users size={16} />New group</button></div>
          {groupMode && <div className="public-group-create"><input aria-label="Group name" placeholder="Group name" maxLength={80} value={groupName} onChange={(event) => setGroupName(event.target.value)} /><div className="public-group-selected" aria-label="Selected group members">{groupPeople.map((person) => <button key={person.id} onClick={() => setGroupPeople((previous) => previous.filter((item) => item.id !== person.id))}>{person.name}<X size={13} /></button>)}</div><button disabled={busy || groupPeople.length < 2 || !groupName.trim()} onClick={createGroup}>Create group · {groupPeople.length + 1}/20</button><p>Add at least two people. Private accounts and people who aren’t mutual followers receive an invitation.</p></div>}

          {!groupMode && (recipient || to) && <button className="mb-3 rounded-lg border px-3 py-2" type="button" disabled={busy} onClick={() => startChat(recipient ? { recipientId: recipient } : { username: to })}>{recipientName ? `Message ${recipientName}` : "Start message"}</button>}
          <input type="search" aria-label="Search people you follow by name or username" placeholder="Name or username" className="mb-2 w-full rounded-xl border bg-muted px-3 py-2 text-base" maxLength={80} value={contactQuery} onChange={(event) => setContactQuery(event.target.value)} />
          {matches.map((person) => <button type="button" className="public-messages-row" key={person.id} disabled={busy || groupMode && groupPeople.length >= 19 && !groupPeople.some((item) => item.id === person.id)} onClick={() => {if (!groupMode) {startChat({ recipientId: person.id });return;}setGroupPeople((previous) => previous.some((item) => item.id === person.id) ? previous.filter((item) => item.id !== person.id) : previous.length < 19 ? [...previous, person] : previous);}} aria-pressed={groupMode ? groupPeople.some((item) => item.id === person.id) : undefined}>
            <PersonAvatar person={person} />
            <span className="truncate font-semibold">{person.name}</span>{groupMode ? <span className="public-group-selection-mark" data-selected={groupPeople.some((item) => item.id === person.id)}>{groupPeople.some((item) => item.id === person.id) && <Check size={14} />}</span> : <ChevronRight size={14} aria-hidden="true" />}
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
        <button key={chat.id} onClick={() => {setComposing(false);setParams({ chat: chat.id });}} aria-current={id === chat.id} className="public-messages-row">
            <>{chat.is_group ? <GroupChatAvatar chat={chat} /> : <PersonAvatar person={peerFor(chat)} />}</>
            <span className="min-w-0"><span className="public-messages-row-title"><strong className="truncate">{peerName(chat)}</strong>{chat.last_message_at && <time dateTime={chat.last_message_at}>{messageTime(chat.last_message_at)}</time>}</span><span className="block truncate text-sm opacity-70">{drafts.get(chat.id)?<><strong className="public-message-draft-label">Draft: </strong>{drafts.get(chat.id)}</>:chat.last_message_text || 'New conversation'}</span></span>
            {chat.unread ? <span className="public-messages-dot" aria-label="Unread" /> : chat.muted_ids?.includes(user?.id)?<BellOff size={14} aria-label="Muted conversation"/>:<ChevronRight size={14} aria-hidden="true" />}
          </button>
        )}
      </aside>
      {id ? <section className="public-messages-thread" aria-label="Conversation" data-replying={Boolean(reply)} data-group={Boolean(thread?.chat?.is_group)} data-wallpaper={activeBackground.type !== 'none'} style={backgroundStyle} onKeyDown={(event) => {if (event.key === "Escape" && reply && !busy && !showGifs && !musicMenu && !songPicker) setReply(null);}}>
        {(videoWallpaper?.src || gradientWallpaper?.colors?.length > 0) && <div className="public-chat-wallpaper-layer" aria-hidden="true">
          {videoWallpaper?.src ?
          <video src={videoWallpaper.src} poster={videoWallpaper.poster} muted autoPlay loop playsInline /> :
          <MotionGradient colors={gradientWallpaper.colors} motion={gradientWallpaper.motion === 'still' ? 'still' : 'flow'} speed={gradientWallpaper.speed || 1} />}
        </div>}
        <header className="public-messages-thread-header">
          {reply && <button type="button" className="public-message-close-reply" aria-label="Cancel reply" disabled={busy} onClick={() => setReply(null)}><X size={23} /></button>}
          <button className="public-messages-back" onClick={() => setParams({})} aria-label="Back to inbox"><ChevronLeft size={23} /></button>
          {readError?.id === id ? <p role="alert" className="public-messages-list-empty">{readError.message} <button type="button" className="underline" onClick={() => loadThread(id)}>Retry</button></p> : !thread && <p role="status" className="public-messages-list-empty">Loading conversation…</p>}
        {thread && currentPeer && <button type="button" className="public-messages-peer" aria-label={"Conversation details for " + peerName(thread.chat)} onClick={() => {
            setDetailsTab('info');
            setBackgroundError('');
            if (!groupInvited) setChatDetailsOpen(true);
          }}>
          <>{thread.chat.is_group ? <GroupChatAvatar chat={thread.chat} /> : <PersonAvatar person={peerFor(thread.chat)} />}</>
          <h2>{peerName(thread.chat)}</h2>
          {thread.chat.is_group && <span className="public-group-header-count hidden">{thread.chat.participant_ids.length - (thread.chat.invited_ids?.length || 0)} members{(thread.chat.invited_ids?.length || 0) > 0 ? ` · ${thread.chat.invited_ids?.length || 0} invited` : ""}</span>}
        </button>}
          {thread?.chat && !groupInvited && <button type="button" className="public-group-details-button" aria-label="Conversation details" onClick={() => {setDetailsTab('info');setBackgroundError('');setChatDetailsOpen(true);}}><Info size={21} /></button>}
        </header>
        {thread && currentPeer && !groupInvited && <Dialog open={chatDetailsOpen} onOpenChange={setChatDetailsOpen}>
          <DialogContent className="public-chat-details" style={viewportStyle} data-compact={viewport.height < 480} data-group={Boolean(thread.chat.is_group)} data-tab={detailsTab} showClose={false}>
            <header className="public-chat-details-header">
              <button type="button" aria-label="Close conversation details" onClick={() => setChatDetailsOpen(false)}><ChevronLeft size={22} /></button>
              <span className="public-chat-details-heading">Conversation</span>
              <button type="button" className="public-chat-details-done" onClick={() => setChatDetailsOpen(false)}>Done</button>
            </header>
            <div className="public-chat-details-person">
              <>{thread.chat.is_group ? <GroupChatAvatar chat={thread.chat} size={76} /> : <PersonAvatar person={peerFor(thread.chat)} size={76} />}</>
              <DialogTitle>{peerName(thread.chat)}</DialogTitle>
              
              {!thread.chat.is_group && <Link to={"/profile/" + encodeURIComponent(currentPeer)} onClick={() => setChatDetailsOpen(false)}>View profile</Link>}
            </div>
            <div className="public-chat-details-tabs" role="tablist" aria-label="Conversation details">
              {[
              ['info', 'Info', <UserRound size={16} aria-hidden="true" />],
              ['backgrounds', 'Backgrounds', <Palette size={16} aria-hidden="true" />],
              ['photos', 'Photos', <Image size={16} aria-hidden="true" />],
              ['gifs', 'GIFs', <Clapperboard size={16} aria-hidden="true" />],
              ['music', 'Music', <Music2 size={16} aria-hidden="true" />]].
              map(([tab, label, icon]) => <button
                key={tab} id={"conversation-tab-" + tab} type="button" role="tab"
                tabIndex={detailsTab === tab ? 0 : -1}
                aria-selected={detailsTab === tab} aria-label={label}
                onClick={() => setDetailsTab(tab)}
                onKeyDown={event => {
                  const tabs = ['info', 'backgrounds', 'photos', 'gifs', 'music'];
                  const index = tabs.indexOf(tab);
                  let target;
                  if (event.key === 'ArrowRight') target = tabs[(index + 1) % tabs.length];
                  else if (event.key === 'ArrowLeft') target = tabs[(index + tabs.length - 1) % tabs.length];
                  else if (event.key === 'Home') target = tabs[0];
                  else if (event.key === 'End') target = tabs.at(-1);
                  else return;
                  event.preventDefault();
                  setDetailsTab(target);
                  event.currentTarget.parentElement.querySelector('#conversation-tab-' + target)?.focus();
                }}
              ><span className="public-chat-tab-icon">{icon}</span><span className="public-chat-tab-label">{label}</span></button>)}
            </div>
            {detailsTab === 'backgrounds' ? <section className="public-chat-backgrounds" aria-label="Conversation backgrounds">
              <div className="public-chat-background-scroll">
                <div className="public-chat-panel-heading"><h3>Conversation background</h3><p>Choose a look that everyone will see.</p></div>
                {(savingBackground || uploadingBackground) && <p className="public-chat-background-sync" role="status">{uploadingBackground ? "Uploading your shared photo…" : "Saving for everyone…"}</p>}
                <div className="public-chat-background-tools">
                  <button type="button" aria-pressed={activeBackground.type === 'none'} disabled={savingBackground || uploadingBackground} onClick={() => void saveChatBackground({ type: 'none' })}>
                    <span className="public-chat-background-sample public-chat-background-none"><X size={22} /></span><span>None</span>
                  </button>
                  <button type="button" disabled={savingBackground || uploadingBackground} onClick={() => backgroundFile.current?.click()}>
                    <span className="public-chat-background-sample public-chat-background-photo"><ImagePlus size={24} /></span><span>{uploadingBackground ? 'Uploading…' : savingBackground ? 'Saving…' : 'Photo'}</span>
                  </button>
                  <button type="button" aria-pressed={activeBackground.type === 'gradient'} disabled={savingBackground || uploadingBackground} onClick={() => setShowChatColorEditor(true)}>
                    <span className="public-chat-background-sample public-chat-background-your-color"><Palette size={23} /></span><span>Your color</span>
                  </button>
                  <button type="button" aria-pressed={showChatMarketplace} disabled={savingBackground || uploadingBackground} onClick={() => setShowChatMarketplace(true)}>
                    <span className="public-chat-background-sample public-chat-background-market"><ShoppingBag size={22} /></span><span>PUBLIC Market</span>
                  </button>
                </div>
                {backgroundError && <p className="public-chat-background-error" role="alert">{backgroundError}</p>}
                <p className="public-chat-background-note">Background changes are shared with everyone in this conversation.</p>
              </div>
              <input ref={backgroundFile} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {void uploadChatBackground(event.target.files?.[0]);event.target.value = '';}} />
            </section> : detailsTab === 'info' && thread.chat.is_group ? <GroupChatPanel key={id} chat={thread.chat} userId={user?.id} invoke={messages} busy={busy} onChanged={async () => {if (currentChat.current === id) await loadThread(id);await loadInbox();}} onLeft={() => {if (currentChat.current === id) {setChatDetailsOpen(false);setParams({});}void loadInbox();}} /> : detailsTab === 'info' ? <section className="public-chat-info" aria-label="Conversation info">
              <h3>Conversation info</h3>
              <ConversationMuteSwitch chat={thread.chat} userId={user?.id} invoke={messages} disabled={busy} onChanged={async () => {if (currentChat.current === id) await loadThread(id);await loadInbox();}} />
              <p>Messages, photos, GIFs, and music shared here stay available to everyone in this conversation.</p>
              <Link to={"/profile/" + encodeURIComponent(currentPeer)} onClick={() => setChatDetailsOpen(false)}><UserRound size={16} aria-hidden="true" /> View {peerName(thread.chat)}’s profile</Link>
            </section> : detailsTab === 'photos' ? <section className="public-chat-shared-items" aria-label="Shared photos and videos">
              <h3>Photos &amp; videos</h3>
              {sharedPhotos.length ? <div className="public-chat-shared-grid">{sharedPhotos.map((message) => <article key={message.id} className="public-chat-shared-tile"><ChatMedia chatId={id} message={message} /><time dateTime={message.created_date}>{messageTime(message.created_date)}</time></article>)}</div> : (!sharedPages[id+':photos']?.loaded?<p role="status" className="public-chat-shared-empty">Loading shared items…</p>:<p className="public-chat-shared-empty">Photos and videos shared in this conversation will appear here.</p>)}
              <SharedItemsPaging page={sharedPages[id+':photos']} onMore={()=>void loadSharedItems('photos',true)} onRetry={()=>void loadSharedItems('photos',Boolean(sharedPages[id+':photos']?.cursor))} />
            </section> : detailsTab === 'gifs' ? <section className="public-chat-shared-items" aria-label="Shared GIFs">
              <h3>GIFs</h3>
              {sharedGifs.length ? <div className="public-chat-shared-grid">{sharedGifs.map((message) => <article key={message.id} className="public-chat-shared-tile public-chat-shared-gif"><MomentGif id={messageGifId(message)} label="Shared GIF" /><time dateTime={message.created_date}>{messageTime(message.created_date)}</time></article>)}</div> : (!sharedPages[id+':gifs']?.loaded?<p role="status" className="public-chat-shared-empty">Loading shared items…</p>:<p className="public-chat-shared-empty">GIFs shared in this conversation will appear here.</p>)}
              <SharedItemsPaging page={sharedPages[id+':gifs']} onMore={()=>void loadSharedItems('gifs',true)} onRetry={()=>void loadSharedItems('gifs',Boolean(sharedPages[id+':gifs']?.cursor))} />
            </section> : <section className="public-chat-shared-items" aria-label="Shared music">
              <h3>Music</h3>
              {sharedMusic.length ? <div className="public-chat-shared-music">{sharedMusic.map((message) => <article key={message.id} className="public-chat-shared-track"><SharedSong message={message} playing={player.currentTrack?.id === message.track_id && player.isPlaying && (!songData(message)?.lyrics || lyricPlayback.current === message.id)} onPlay={() => void perform(() => playSharedSong(message))} busy={busy} /><time dateTime={message.created_date}>{messageTime(message.created_date)}</time></article>)}</div> : (!sharedPages[id+':music']?.loaded?<p role="status" className="public-chat-shared-empty">Loading shared items…</p>:<p className="public-chat-shared-empty">Songs shared in this conversation will appear here.</p>)}
              <SharedItemsPaging page={sharedPages[id+':music']} onMore={()=>void loadSharedItems('music',true)} onRetry={()=>void loadSharedItems('music',Boolean(sharedPages[id+':music']?.cursor))} />
            </section>}
          </DialogContent>
        </Dialog>}
        {showChatColorEditor && <ProfileColorPicker
          colors={savedPalette.colors}
          loading={false}
          value={{ ...savedPalette, mode: 'custom' }}
          title="Your conversation colors"
          description="Create a moving gradient for this chat. Your choice is shared with everyone."
          availableModes={[["custom", "Custom"], ["off", "No color"]]}
          conversationMode
          onPreview={() => {}}
          onSave={saveConversationPalette}
          onClose={() => setShowChatColorEditor(false)} />
        }
        {showChatMarketplace && <ProfileMarketplace
          user={user}
          backgroundMode
          allowMotion
          busy={savingBackground}
          onClose={() => setShowChatMarketplace(false)}
          onSelectBackground={chooseMarketBackground} />
        }
        {thread && <>
          <div ref={scroll} className="public-messages-history" aria-label="Conversation messages" onScroll={() => {
            const node = scroll.current;
            if (!node) return;
            followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 72;
            if (followLatest.current) setShowLatest(false);
          }}>
            {thread.messages.length === 0 && <p className="public-messages-list-empty">{groupInvited ? 'You have been invited to this group. Accept to see its messages.' : pending ? "Send a message request to start the conversation." : "Send the first message."}</p>}
            <div className="public-messages-stream" ref={messageStream}>
            {thread.historyCursor&&<div className="public-message-history-tools"><button type="button" disabled={loadingOlder||!online} onClick={()=>void loadEarlierMessages()}>{loadingOlder?'Loading earlier messages…':'Load earlier messages'}</button>{olderError&&<p role="alert">{olderError}</p>}</div>}
            {thread.messages.map((message, messageIndex) => <Fragment key={message.id}>
              {messageDay(message.created_date) && (messageIndex === 0 || new Date(message.created_date).toDateString() !== new Date(thread.messages[messageIndex - 1].created_date).toDateString()) &&
                <div className="public-message-day"><time dateTime={message.created_date}>{messageDay(message.created_date)}</time></div>}
              <div className="public-message-group" data-message-id={message.id} data-own={message.sender_id === user?.id} data-reply-target={reply?.id === message.id} data-time-visible={revealedTimestamp===message.id} data-run-start={messageRunPosition(thread.messages,messageIndex).start} data-run-end={messageRunPosition(thread.messages,messageIndex).end}
            onPointerDown={(event) => {
              if (event.pointerType === 'mouse' || event.target instanceof Element && event.target.closest('button,a')) return;
              cancelHold();
              const { clientX: x, clientY: y, currentTarget: group } = event;
              hold.current = { x, y, timer: setTimeout(() => {hold.current = null;openMessageMenu(message, group);}, 480) };
            }}
            onPointerMove={(event) => {if (hold.current && Math.hypot(event.clientX - hold.current.x, event.clientY - hold.current.y) > 9) cancelHold();}}
            onPointerCancel={cancelHold} onPointerUp={(event)=>{const press=hold.current;if(event.pointerType!=='mouse'&&press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<9)setRevealedTimestamp(previous=>previous===message.id?null:message.id);cancelHold();}} onPointerLeave={cancelHold}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || !(event.key === 'ContextMenu' || event.shiftKey && event.key === 'F10')) return;
              event.preventDefault();
              openMessageMenu(message, event.currentTarget);
            }}
            onContextMenu={(event) => {event.preventDefault();cancelHold();openMessageMenu(message, event.currentTarget);}}>
              {message.sender_id!==user?.id&&<span className="public-message-avatar-rail">{messageRunPosition(thread.messages,messageIndex).end&&<PersonAvatar size={34} person={messageSender(message,thread.chat,user)} />}</span>}
              <div className="public-message-body">
              {message.sender_id!==user?.id&&messageRunPosition(thread.messages,messageIndex).start&&<span className="public-message-author">{messageSender(message,thread.chat,user).display_name}</span>}
              <div className="public-message-content">
              {message.reply_preview && <ReplyQuote preview={message.reply_preview} />}
              <div className="public-message-reaction-target">
              {message.track_id && <SharedSong message={message} playing={player.currentTrack?.id === message.track_id && player.isPlaying && (!songData(message)?.lyrics || lyricPlayback.current === message.id)} onPlay={() => void perform(() => playSharedSong(message))} busy={busy} />}
              {message.media_url && !messageGifId(message) && ['image', 'video'].includes(message.media_type) && <ChatMedia key={message.id} chatId={id} message={message} />}
              {messageGifId(message) && <MomentGif id={messageGifId(message)} label="Shared GIF" />}
              {!message.track_id&&!message.media_url&&message.text&&<p className="public-message-bubble" data-own={message.sender_id === user?.id}>{message.text}</p>}
              <MessageReactions message={message} userId={user?.id} />
              </div>
              {(message.track_id||message.media_url)&&message.text&&<p className="public-message-bubble" data-own={message.sender_id === user?.id}>{message.text}</p>}
              </div>
              {messageTime(message.created_date)&&<time className="public-message-timestamp" dateTime={message.created_date}>{messageTime(message.created_date)}</time>}
              </div>
            </div></Fragment>)}
            {peerTyping && currentPeer !== user?.id && <div className="public-message-typing" role="status" aria-live="polite" aria-label={peerName(thread.chat) + " is typing"}><span className="public-message-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>}
            </div>
          </div>
          {activeMenu && <Dialog open onOpenChange={(open) => {if (!open) setMenu(null);}}>
            <DialogContent ref={setMenuPanel} showClose={false} className="public-message-actions public-message-context"
            data-own={activeMenu.sender_id === user?.id}>
              <DialogTitle className="sr-only">Message options</DialogTitle>
              <DialogDescription className="sr-only">React or choose an action for this message.</DialogDescription>
              <div className="public-message-reactions" role="group" aria-label="Emoji reactions" aria-busy={savingReaction !== null}>
                {REACTIONS.map((emoji, index) => {
                  const selected = ownMessageReaction(activeMenu, user?.id) === emoji;
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
                          ...message, reactions: saved.reactions, sender_reaction: saved.sender_reaction, recipient_reaction: saved.recipient_reaction
                        } : message) } : previous);
                      setMenu(null);
                    }
                  })}>{emoji}</button>;
                })}
              </div>
              {savingReaction && <p role="status" className="public-message-reaction-status">Saving reaction…</p>}
              {error && <p role="alert" className="rounded-xl border bg-card p-3 text-sm">{error}</p>}
              <div className="public-message-menu-preview">{messagePreview(activeMenu)}</div>
              <div className="public-message-menu-items">
              {canSend && <button type="button" onClick={() => {
                  setReply({ id: activeMenu.id, name: messageSender(activeMenu,thread.chat,user).display_name, text: messagePreview(activeMenu) });
                  setMenu(null);
                  requestAnimationFrame(() => {scroll.current?.querySelector('[data-reply-target="true"]')?.scrollIntoView({ block: "center" });draftInput.current?.focus({ preventScroll: true });});
                }}><Reply size={17} /> Reply</button>}
              {activeMenu.text && <button type="button" onClick={() => {setMenu(null);void perform(() => copyText(activeMenu.text));}}><Copy size={17} /> Copy</button>}
              {activeMenu.track_id && <Link to={'/track/' + encodeURIComponent(activeMenu.track_id)} onClick={() => setMenu(null)}><ExternalLink size={17} /> Open song</Link>}
              {activeMenu.track_id && <button type="button" onClick={() => {setMenu(null);void perform(() => playSharedSong(activeMenu));}}>{player.currentTrack?.id === activeMenu.track_id && player.isPlaying ? 'Pause song' : 'Play song'}</button>}
              {activeMenu.sender_id === user?.id && <button type="button" className="text-destructive" disabled={busy} onClick={() => {
                  if (!window.confirm('Delete this message for everyone?')) return;
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
          {incoming && (groupInvited || thread.messages.length > 0) && <div className="public-message-request-actions flex gap-3 p-3">
            {[true, false].map((accept) => <button className="rounded-lg border px-3 py-2" key={String(accept)} disabled={busy} onClick={() => void perform(async () => {
              await messages(groupInvited ? 'group_respond' : 'respond', { id, accept });
              if (currentChat.current === id) {
                if (accept) {
                  await loadThread(id);
                } else setParams({});
              }
              await loadInbox();
            })}>{accept ? groupInvited ? 'Join group' : 'Accept request' : 'Decline'}</button>)}
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
          {canSend && songPicker === "recent" && <RecentlyPlayedPicker
            onClose={() => setSongPicker(false)}
            onSelect={(song) => {setAttachment(song);setSongPicker(false);}} />}
          {canSend && reply && <div className="public-message-reply-draft">
            <div className="min-w-0"><strong className="block truncate">Replying to {reply.name}</strong><span className="block truncate">{reply.text}</span></div>
            <button type="button" aria-label="Cancel reply" disabled={busy} onClick={() => setReply(null)}><X size={17} /></button>
          </div>}
          {sendStage&&sendingChat.current===id&&<p className="public-message-send-status" role="status">{sendStage==='uploading'?'Uploading attachment…':'Sending message…'}</p>}
          {canSend && <form className="public-messages-compose" onSubmit={(event) => {event.preventDefault();void perform(async () => {
              const text = draft.trim();
              const trackId = attachment?.id || '',replyId = reply?.id || '',lyrics = attachment?.lyrics || null;
              const lyricKey = JSON.stringify(lyrics);
              if (!text && !trackId && !gif && !selectedMedia) return;
              if(!navigator.onLine)throw Error('You’re offline. Reconnect to send your message.');
              sendingChat.current=id;
              setSendStage(selectedMedia?'uploading':'sending');
              try {
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
              const requestId = existing?.text === text && existing?.trackId === trackId && existing?.replyId === replyId && existing?.lyricKey === lyricKey && existing?.gifId === gif && existing?.mediaUri === media?.uri ? existing.requestId : createSendRequestId();
              pendingSends.current.set(id, { text, trackId, replyId, lyricKey, gifId: gif, mediaUri: media?.uri, requestId });
              setSendStage('sending');
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
                if(window.matchMedia('(pointer: fine)').matches&&document.hasFocus())draftInput.current?.focus({preventScroll:true});
              }
              await loadInbox();
              } finally {sendingChat.current=null;setSendStage('');}
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
                lastTypedAt.current = Date.now();
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
            <button type="submit" aria-label={sendStage&&sendingChat.current===id?"Sending message":"Send message"} aria-busy={Boolean(sendStage&&sendingChat.current===id)} disabled={!online || busy || !draft.trim() && !attachment && !gif && !selectedMedia}><ArrowUp size={17} /></button>
            </div>
          </form>}
          {pending && !incoming && !canSend && <p className="text-sm">Waiting for them to accept your request.</p>}
        </>}
      </section> : <div className="public-messages-empty"><MessageCircle size={32} aria-hidden="true" /><h2>Your conversations</h2><p>Choose a chat or start a new message.</p><button type="button" onClick={() => setComposing(true)}><SquarePen size={16} /> New message</button></div>}
    </div>
  </main>;
}

function SharedItemsPaging({page,onMore,onRetry}) {
  return <div className="public-chat-shared-paging">
    {page?.error&&<p role="alert">{page.error} <button type="button" onClick={onRetry}>Retry</button></p>}
    {page?.cursor&&!page.error&&<button type="button" disabled={page.loading} onClick={onMore}>{page.loading?'Loading…':'Load more'}</button>}
  </div>;
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
  return <div className={lyrics ? "public-message-lyric-card public-lyric-gradient" : "public-message-music"}>
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

function messagePreview(message) {
  if (message.text) return message.text;
  if (message.track_id) return songData(message)?.lyrics ? 'Shared lyrics' : 'Shared a song';
  if (messageGifId(message)) return 'Sent a GIF';
  if (message.media_type === 'video') return 'Sent a video';
  if (message.media_type === 'image') return 'Sent a photo';
  return 'Message';
}

function messageGifId(message) {
  return message.media_type === "image" ? message.media_url?.match(/^https:\/\/media\.giphy\.com\/media\/([a-zA-Z0-9]{1,64})\/giphy\.gif$/)?.[1] : null;
}

function MessageReactions({ message, userId }) {
  const reactions = messageReactionBadges(message, userId, REACTIONS);
  if (!reactions.length) return null;
  const total = reactions.reduce((sum, reaction) => sum + reaction.people, 0);

  return <div
    className="public-message-reaction-group"
    data-reaction-total={total}
    role="group"
    aria-label="Message reactions"
  >
    {reactions.flatMap(({ emoji, mine, people }) => {
      const label = REACTION_LABELS[REACTIONS.indexOf(emoji)];
      // Direct messages show both people's emoji, including matching choices.
      // Larger groups retain one badge per emoji to fit the message corner.
      const copies = total <= 2 ? people : 1;
      return Array.from({ length: copies }, (_, index) => <span
        className="public-message-reaction-badge"
        data-mine={mine}
        key={emoji + '-' + index}
        role="img"
        aria-label={label + (copies === 1 && people > 1 ? ', ' + people + ' people' : '') + (mine ? ', including your reaction' : '')}
      >
        <span aria-hidden="true">{emoji}</span>
      </span>);
    })}
  </div>;
}

function ChatMedia({ chatId, message }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestVersion = useRef(0);
  const image = message.media_type === 'image';

  const open = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(false);
    setUrl('');
    try {
      const result = await messages('open_media', { id: chatId, messageId: message.id });
      if (!result.url?.startsWith('https://')) throw new Error('Attachment unavailable');
      if (version === requestVersion.current) setUrl(result.url);
    } catch {
      if (version === requestVersion.current) setError(true);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [chatId, message.id]);

  useEffect(() => {
    void open();
    return () => { requestVersion.current++; };
  }, [open]);

  const fail = () => {setUrl('');setError(true);};
  if (url) return image
    ? <img className="public-message-upload" src={url} alt="Shared photo" loading="lazy" decoding="async" onError={fail} />
    : <video className="public-message-upload" src={url} controls playsInline preload="metadata" onError={fail} />;
  return <button type="button" className="public-message-open-media" disabled={loading} onClick={() => void open()} aria-busy={loading}>
    {loading ? 'Loading attachment…' : error ? 'Couldn’t open. Tap to retry' : 'Open attachment'}
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
