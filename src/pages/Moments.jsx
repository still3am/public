import MomentGifPicker, { MomentGif } from '@/components/moments/MomentGifPicker';
import { MomentThread } from '@/components/moments/MomentReplies';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Heart, MessageCircle, Share2, Music2, MoreHorizontal, Trash2, Flag, ShieldOff, Loader2, ArrowLeft, ChevronUp, ChevronDown, Send, UserRound, Disc3, Bookmark, Clapperboard, ExternalLink, Images } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useSafety } from '@/context/SafetyContext';
import { usePlayer } from '@/context/PlayerContext';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import { readAllPages } from '@/lib/readPages';
import { setFollowState } from '@/lib/followActions';
import { shareLink } from '@/lib/shareLink';
import Avatar from '@/components/Avatar';
import LibraryButton from '@/components/LibraryButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import MomentMedia from '@/components/moments/MomentMedia';
import MomentComposer from '@/components/moments/MomentComposer';
import { momentsApi, momentError } from '@/lib/momentsApi';
import '@/components/moments/moments.css';
import '@/components/moments/mobile-feed.css';
const name = (p) => p?.display_name || p?.username || 'PUBLIC listener';
function SongArtwork({ url }) {const fixed = useCoverUrl(url);return fixed ? <img src={fixed} alt="" loading="lazy" /> : <Music2 size={22} />;}
function ReelCaption({ text }) {
  const caption = useRef(null);
  const [canExpand, setCanExpand] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const element = caption.current;
    if (!element || expanded) return;
    const measure = () => setCanExpand(element.scrollHeight > element.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);
  return <div className="reel-caption-wrap">
    <p ref={caption} className="reel-caption" data-expanded={expanded} tabIndex={expanded ? 0 : undefined}>{text}</p>
    {canExpand && <button className="reel-caption-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? 'Show less' : 'Read more'}</button>}
  </div>;
}
function MomentComments({ post, onReport, mobile = true }) {
  const { user } = useAuth(),nav = useNavigate();const [rows, setRows] = useState([]),[body, setBody] = useState(''),[busy, setBusy] = useState(false),[loading, setLoading] = useState(true),[error, setError] = useState(''),[page, setPage] = useState({ offset: 0, more: false });const section = useRef(null),live = useRef(true),lock = useRef(false),token = useRef(crypto.randomUUID());
  const [reply,setReply]=useState(null),[gif,setGif]=useState(''),[showGifs,setShowGifs]=useState(false),[updatedThread,setUpdatedThread]=useState(null);
  const composerInput=useRef(null);
  function chooseReply(comment, parent=comment.id){
    setReply({parent,label:name(comment.author)});
    composerInput.current?.focus({preventScroll:true});
  }
  const [showEmojis, setShowEmojis] = useState(false);
  const addEmoji = (emoji) => setBody((value) => value.length + emoji.length <= 1000 ? value + emoji : value);
  const load = async (more = false) => {setLoading(true);setError('');try {const result = await momentsApi('comments', { id: post.id, offset: more ? page.offset : 0 });if (!live.current) return;setRows((old) => more ? [...old, ...result.items.filter((x) => !old.some((y) => y.id === x.id))] : result.items);setPage({ offset: result.next_offset, more: result.has_more });} catch (e) {if (live.current) setError(momentError(e));} finally {if (live.current) setLoading(false);}};
  useEffect(() => {live.current = true;if (user) load();else setLoading(false);return () => {live.current = false;};}, [post.id, user?.id]);
  useEffect(() => {
    const sheet = section.current?.closest('.moment-comments-sheet');
    const viewport = window.visualViewport;
    if (!sheet || !viewport) return;
    function fitViewport() {
      sheet.style.setProperty('--discussion-height', viewport.height + 'px');
      sheet.style.setProperty('--discussion-lift', Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) + 'px');
      sheet.toggleAttribute('data-keyboard', window.innerHeight - viewport.height > 120);
    }
    fitViewport();
    viewport.addEventListener('resize', fitViewport);
    viewport.addEventListener('scroll', fitViewport);
    return () => {
      viewport.removeEventListener('resize', fitViewport);
      viewport.removeEventListener('scroll', fitViewport);
    };
  }, []);
  async function submit(e) {e.preventDefault();if (!user) {nav('/login?returnTo=' + encodeURIComponent('/moments/' + post.id));return;}if (lock.current || (!body.trim() && !gif)) return;lock.current = true;setBusy(true);setError('');try {await momentsApi('comment', { id: post.id, body, ...(gif?{gif_id:gif}:{}), ...(reply?{parent_id:reply.parent}:{}), request_id: token.current });if (live.current) {setBody('');setGif('');setShowGifs(false);setReply(null);token.current = crypto.randomUUID();if(reply)setUpdatedThread({id:reply.parent});else await load();}} catch (e) {if (live.current) setError(momentError(e));} finally {lock.current = false;if (live.current) setBusy(false);}}
  async function remove(c) {if (lock.current) return;lock.current = true;setBusy(true);try {await momentsApi('delete_comment', { id: post.id, comment_id: c.id });setRows((old) => old.filter((x) => x.id !== c.id));} catch (e) {setError(momentError(e));} finally {lock.current = false;setBusy(false);}}
  return <section ref={section} className="discussion-comments" aria-label="Moment comments">
    <div className="discussion-list" aria-busy={loading}>
      {!user && <p className="discussion-empty"><Link to={'/login?returnTo=' + encodeURIComponent('/moments/' + post.id)}>Sign in to join the conversation.</Link></p>}
      {user && !rows.length && !loading && !error && <p className="discussion-empty">Be the first to comment.</p>}
      {rows.map((comment) => {
        const author = comment.author;
        const profile = author?.user_id ? '/profile/' + author.user_id : null;
        const date = new Date(comment.created_date);
        return <article className="discussion-comment" key={comment.id}>
          {profile ? <Link to={profile} aria-label={name(author)}><Avatar user={author} size={34} /></Link> : <Avatar user={author ?? {}} size={34} />}
          <div>
            <div className="discussion-byline">
              {profile ? <Link to={profile}><strong>{name(author)}</strong></Link> : <strong>{name(author)}</strong>}
              {!Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()}>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>}
            </div>
            {comment.body&&<p>{comment.body}</p>}
            <MomentGif id={comment.gif_id}/>
            <button type="button" className="moment-thread-action" disabled={busy} onClick={()=>chooseReply(comment)}>Reply</button>
            <MomentThread moment={post.id} parent={comment.id} updated={updatedThread?.id===comment.id?updatedThread:null} onReply={child=>chooseReply(child,comment.id)} onReport={onReport}/>
          </div>
          {comment.can_delete ?
          <button type="button" disabled={busy} aria-label="Delete comment" onClick={() => remove(comment)}><Trash2 size={16} /></button> :
          <button type="button" aria-label="Report comment" onClick={() => onReport({ type: 'moment_comment', id: comment.id, userId: author?.user_id })}><Flag size={15} /></button>}
        </article>;
      })}
      {loading && <p className="discussion-empty" role="status">Loading comments…</p>}
      {page.more && !loading && <button className="discussion-more" type="button" onClick={() => load(true)}>Load more comments</button>}
    </div>
    {error && <p className="discussion-error" role="alert">{error}</p>}
    {error && !rows.length && !loading && <button className="discussion-more" type="button" disabled={busy} onClick={() => load()}>Retry loading comments</button>}
    {user && <div className="discussion-composer">
      <div className="discussion-reactions" role="group" aria-label="Quick reactions">
        {[['❤️', 'Heart'], ['🙌', 'Celebrate'], ['🔥', 'Fire'], ['👏', 'Clap'], ['😢', 'Sad'], ['😍', 'Love'], ['😮', 'Surprised'], ['😂', 'Laugh']].map(([emoji, label]) =>
        <button type="button" key={label} aria-label={'Add ' + label + ' reaction'} disabled={busy || body.length + emoji.length > 1000} onClick={() => addEmoji(emoji)}>{emoji}</button>)}
        <button type="button" className="discussion-emoji-more" aria-label={showEmojis ? 'Hide more emojis' : 'Show more emojis'} aria-expanded={showEmojis} aria-controls={'discussion-emoji-picker-' + post.id} onClick={() => setShowEmojis((value) => !value)}><Plus size={19} /></button>
      </div>
      <div id={'discussion-emoji-picker-' + post.id} className="discussion-emoji-picker" role="group" aria-label="More emojis" hidden={!showEmojis}>
        {[['🎶', 'Music'], ['🎧', 'Headphones'], ['🎤', 'Microphone'], ['💿', 'Record'], ['✨', 'Sparkles'], ['💯', 'Hundred'], ['🫶', 'Heart hands'], ['💜', 'Purple heart'], ['🤍', 'White heart'], ['😎', 'Cool'], ['🥹', 'Holding back tears'], ['😭', 'Crying'], ['🤩', 'Starstruck'], ['😂', 'Laughing'], ['👀', 'Eyes'], ['🤔', 'Thinking'], ['🙃', 'Upside down'], ['🤯', 'Mind blown'], ['👍', 'Thumbs up'], ['🙏', 'Thanks'], ['💃', 'Dancing'], ['🕺', 'Dancer'], ['⚡', 'Lightning'], ['🎉', 'Party']].map(([emoji, label]) =>
        <button type="button" key={label} aria-label={'Add ' + label} disabled={busy || body.length + emoji.length > 1000} onClick={() => addEmoji(emoji)}>{emoji}</button>)}
      </div>
      {reply&&<div className="moment-reply-context"><span>Replying to {reply.label}</span><button type="button" disabled={busy} onClick={()=>setReply(null)}>Cancel reply</button></div>}
      {gif&&<div className="moment-reply-context"><MomentGif id={gif}/><button type="button" disabled={busy} onClick={()=>setGif('')}>Remove GIF</button></div>}
      {showGifs&&<MomentGifPicker inline={!mobile} onClose={()=>setShowGifs(false)} onSelect={id=>{if(id){setGif(id);setShowGifs(false);}}}/>}
      <form onSubmit={submit}>
        <Avatar user={user} size={40} />
        <input ref={composerInput} aria-label={reply?"Write a reply":"Write a comment"} placeholder={reply?"Write a reply…":"Add a comment…"} maxLength={1000} value={body} disabled={busy} onChange={(event) => setBody(event.target.value)} />
        <button type="button" className="discussion-gif-button" aria-label={gif?"Change GIF":"Add a GIF"} aria-expanded={showGifs} aria-controls={"moment-gif-picker-"+post.id} disabled={busy} onClick={()=>setShowGifs(value=>!value)}><Images size={19} aria-hidden="true"/><span>GIF</span></button>
        <button type="submit" disabled={busy || (!body.trim() && !gif)} aria-label="Post comment">{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
      </form>
    </div>}
  </section>;
}
function ReportMoment({ target, onClose }) {
  const [reason, setReason] = useState(''),[busy, setBusy] = useState(false),[sent, setSent] = useState(false),[error, setError] = useState('');
  async function send() {if (busy || reason.trim().length < 3) return;setBusy(true);try {await base44.functions.invoke('safety', { action: 'report', target_type: target.type, target_id: target.id, reason });setSent(true);} catch (e) {setError(momentError(e));} finally {setBusy(false);}}
  return <Dialog open onOpenChange={(v) => {if (!v && !busy) onClose();}}><DialogContent className="moment-report"><DialogHeader><DialogTitle>{sent ? 'Report received' : 'Report this moment'}</DialogTitle><DialogDescription>{sent ? 'The PUBLIC team can review it in the moderation inbox.' : 'Tell us about unsafe content, harassment, copyright, or spam.'}</DialogDescription></DialogHeader>{sent ? <button className="moment-primary" type="button" onClick={onClose}>Done</button> : <><textarea aria-label="Report details" maxLength={2000} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />{error && <p role="alert">{error}</p>}<button className="moment-primary" type="button" disabled={busy || reason.trim().length < 3} onClick={send}>{busy ? 'Sending…' : 'Send report'}</button></>}</DialogContent></Dialog>;
}
export default function Moments() {
  const { user } = useAuth();
  if (user?.role === 'admin' && !user.disabled && !user.is_blocked) return <MomentsExperience />;
  return <section className="moments-coming-soon" aria-labelledby="moments-coming-title"><div className="moments-coming-copy"><p className="moments-coming-label">Coming soon</p><h1 id="moments-coming-title">Moments.</h1><p className="moments-coming-description">Your world, set to music.</p></div></section>;
}
export function MomentsExperience() {
  const { id } = useParams(),[params, setParams] = useSearchParams(),{ user } = useAuth(),safety = useSafety(),player = usePlayer(),nav = useNavigate();const scope = params.get('view') || 'discover',trackFilter = params.get('song') || '';
  const [posts, setPosts] = useState([]),[loading, setLoading] = useState(true),[more, setMore] = useState(false),[offset, setOffset] = useState(0),[error, setError] = useState(''),[notice, setNotice] = useState(''),[composer, setComposer] = useState(false),[seed, setSeed] = useState(null),[active, setActive] = useState(null),[comments, setComments] = useState(new Set()),[report, setReport] = useState(null),[busy, setBusy] = useState(''),[following, setFollowing] = useState(new Set());
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {const mq = window.matchMedia('(max-width: 767px)');const update = () => setMobile(mq.matches);update();mq.addEventListener('change', update);return () => mq.removeEventListener('change', update);}, []);
  const generation = useRef(0),loadLock = useRef(false),actionLock = useRef(false),sentinel = useRef(null),feed = useRef(null),live = useRef(true),followingVersion = useRef(0);
  useEffect(() => {live.current = true;return () => {live.current = false;generation.current++;};}, []);
  const login = () => {nav('/login?returnTo=' + encodeURIComponent('/moments' + (id ? '/' + id : '')));};
  const load = useCallback(async (append = false) => {if (append && loadLock.current) return;const version = append ? generation.current : ++generation.current;loadLock.current = true;setLoading(true);setError('');try {const result = id ? await momentsApi('get', { id }) : await momentsApi('feed', { scope, track_id: trackFilter, offset: append ? offset : 0 });if (!live.current || version !== generation.current) return;const items = id ? [result.post] : result.items;setPosts((old) => append ? [...old, ...items.filter((x) => !old.some((y) => x.id === y.id))] : items);setMore(!!result.has_more);setOffset(result.next_offset || 0);} catch (e) {if (live.current && version === generation.current) setError(momentError(e));} finally {if (version === generation.current) {loadLock.current = false;if (live.current) setLoading(false);}}}, [id, scope, trackFilter, offset]);
  useEffect(() => {setPosts([]);setOffset(0);setActive(null);setComments(new Set());if (feed.current) feed.current.scrollTop = 0;setReelIndex(0);load(false);}, [id, scope, trackFilter, user?.id, safety.blocked]);
  useEffect(() => {const version = ++followingVersion.current;setFollowing(new Set());if (!user) return;readAllPages((opts) => base44.entities.Follow.filter({ follower_id: user.id }, { sort: '-created_date', ...opts })).then((rows) => {if (live.current && version === followingVersion.current) setFollowing(new Set(rows.map((r) => r.following_id)));}).catch(() => {});}, [user?.id]);
  useEffect(() => {if (composer || report) setActive(null);}, [composer, report]);
  useEffect(() => {const el = sentinel.current;if (!el || !more || loading || error) return;const observer = new IntersectionObserver((entries) => {if (entries[0]?.isIntersecting) load(true);}, { root: feed.current, rootMargin: '300px' });observer.observe(el);return () => observer.disconnect();}, [more, loading, error, load]);
  function create(track = null) {if (!user) {login();return;}setActive(null);player.pausePlayback?.();setSeed(track);setComposer(true);}
  async function action(key, fn) {if (actionLock.current) return;actionLock.current = true;setBusy(key);setNotice('');try {await fn();} catch (e) {if (live.current) setNotice(momentError(e));} finally {actionLock.current = false;if (live.current) setBusy('');}}
  function like(p) {if (!user) {login();return;}action(p.id, async () => {const result = await momentsApi('like', { id: p.id, liked: !p.liked });if (live.current) setPosts((old) => old.map((x) => x.id === p.id ? { ...x, ...result } : x));});}
  function follow(p) {if (!user) {login();return;}action(p.id, async () => {const desired = !following.has(p.user_id);await setFollowState(base44, user.id, p.user_id, desired);setFollowing((old) => {const next = new Set(old);if (desired) next.add(p.user_id);else next.delete(p.user_id);return next;});window.dispatchEvent(new Event('follows:changed'));});}
  function remove(p) {if (!window.confirm('Delete this moment?')) return;action(p.id, async () => {await momentsApi('delete', { id: p.id });setPosts((old) => old.filter((x) => x.id !== p.id));setActive(null);if (id) nav('/moments');});}
  function block(p) {if (!user) {login();return;}if (!window.confirm('Block this creator and hide their content?')) return;action(p.id, async () => {await base44.functions.invoke('safety', { action: 'block', user_id: p.user_id, blocked: true });await safety.reload();setPosts((old) => old.filter((x) => x.user_id !== p.user_id));});}
  function share(p) {action(p.id, async () => {const result = await shareLink({ title: 'A moment on PUBLIC', text: p.caption || 'Life sounds better together.', url: window.location.origin + '/moments/' + encodeURIComponent(p.id) });if (result === 'copied') setNotice('Moment link copied.');});}
  const visiblePosts = posts.filter((post) => !safety.blocked.has(post.user_id));
  const [reelIndex, setReelIndex] = useState(0);
  const [momentsMuted, setMomentsMuted] = useState(false);
  const currentReel = Math.min(reelIndex, Math.max(0, visiblePosts.length - 1));

  useEffect(() => {
    const list = feed.current;
    if (!list) return;
    function closeOutside(event) {
      list.querySelectorAll('.reel-menu[open]').forEach((menu) => {
        if (!menu.contains(event.target)) menu.open = false;
      });
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  useEffect(() => {
    feed.current?.querySelectorAll('.reel-menu[open]').forEach((menu) => {menu.open = false;});
  }, [currentReel]);

  function updateReelIndex() {
    const list = feed.current;
    if (list?.clientHeight) setReelIndex(Math.round(list.scrollTop / list.clientHeight));
  }

  function moveReel(direction) {
    const list = feed.current;
    if (!list?.clientHeight) return;
    const index = Math.round(list.scrollTop / list.clientHeight);
    const next = Math.max(0, Math.min(visiblePosts.length - 1, index + direction));
    if (next === index) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top: next * list.clientHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function handleFeedKeys(event) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveReel(event.key === 'ArrowUp' ? -1 : 1);
    }
  }
  function dismissComments(postId) {
    setComments((old) => {
      const next = new Set(old);
      next.delete(postId);
      return next;
    });
  }
  return <div className="public-reels">
    <header className="reels-header">
      <h1 className="sr-only">Moments</h1>
      <nav className="reels-tabs" aria-label="Moments feed">
        {id ? <Link to="/moments"><ArrowLeft size={16} />All moments</Link> :
        [['discover', 'Discover'], ['following', 'Following'], ['mine', 'My moments']].map(([tab, label]) =>
        <button key={tab} type="button" aria-pressed={scope === tab} onClick={() => {
          if (tab !== 'discover' && !user) {login();return;}
          setParams({ ...Object.fromEntries(params), view: tab });
        }}>{label}</button>)}
      </nav>
      <button type="button" className="moment-primary" aria-label="Post a moment" onClick={() => create()}><Plus size={22} /></button>
    </header>
    {trackFilter && <div className="reels-filter">Moments using this song<button type="button" onClick={() => setParams({ view: scope })}>Clear</button></div>}
    {notice && <div className="reels-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
    <div className="reels-feed" ref={feed} tabIndex={0} role="region" aria-label="Moments feed" onScroll={updateReelIndex} onKeyDown={handleFeedKeys}>
      {visiblePosts.map((post) => <article key={post.id} className="reel">
        <MomentMedia post={post} muted={momentsMuted} onToggleMute={() => setMomentsMuted((value) => !value)} active={active === post.id} onActive={(value) => setActive((old) => value ? post.id : old === post.id ? null : old)} />
        <div className="reel-shade" aria-hidden="true" />
        <div className="reel-overlay">
          <div className="reel-info">
            <div className="reel-creator">
              <Link to={'/profile/' + post.user_id} className="reel-author"><Avatar user={post.author} size={34} /><span>{name(post.author)}</span></Link>
              {user?.id !== post.user_id && <button type="button" disabled={busy === post.id} className="reel-follow" onClick={() => follow(post)}>{following.has(post.user_id) ? 'Following' : 'Follow'}</button>}
            </div>
            {post.caption && <ReelCaption text={post.caption} />}
          </div>
          <div className="reel-actions" role="group" aria-label="Moment actions">
            <button type="button" aria-pressed={post.liked} disabled={busy === post.id} onClick={() => like(post)} aria-label={post.liked ? 'Unlike moment' : 'Like moment'}><Heart size={26} fill={post.liked ? 'currentColor' : 'none'} /><span>{post.like_count || 0}</span></button>
            <button type="button" id={'discussion-trigger-' + post.id} aria-label="Comments" aria-expanded={comments.has(post.id)} onClick={() => {setActive(null);setComments((old) => new Set(old).add(post.id));}}><MessageCircle size={25} /></button>
            <button type="button" disabled={busy === post.id} onClick={() => share(post)} aria-label="Share moment"><Share2 size={24} /></button>
            <details className="reel-menu" onKeyDown={(event) => {
              if (event.key !== 'Escape' || !event.currentTarget.open) return;
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }}>
              <summary aria-label="More moment options"><MoreHorizontal size={25} /></summary>
              <div>
                {post.track && <>
                  <Link to={'/artist?name=' + encodeURIComponent((post.track.artist || '').split(/,|&| feat\.| ft\./i)[0].trim())}><UserRound size={17} />Explore artist</Link>
                  <Link to={'/moments?song=' + encodeURIComponent(post.track.id)}><Disc3 size={17} />More with this song</Link>
                  <LibraryButton track={post.track} label icon={Bookmark} size={17} />
                  <button type="button" className="moment-use-song" onClick={() => create(post.track)}><Clapperboard size={17} />Use song</button>
                </>}
                {post.can_delete && <button type="button" disabled={!!busy} onClick={() => remove(post)}><Trash2 size={16} />Delete moment</button>}
                {user && user.id !== post.user_id && <>
                  <button type="button" onClick={() => setReport({ type: 'moment', id: post.id, userId: post.user_id })}><Flag size={16} />Report moment</button>
                  <button type="button" disabled={!!busy} onClick={() => block(post)}><ShieldOff size={16} />Block creator</button>
                </>}
                <Link to={'/moments/' + post.id}><ExternalLink size={17} />Open moment</Link>
              </div>
            </details>
            {post.track && <Link className="reel-track-art" to={'/track/' + post.track.id} aria-label={'Open ' + post.track.title + (post.track.artist ? ' by ' + post.track.artist : '')} title={post.track.title}>
              <SongArtwork url={post.track.cover_art_url} />
            </Link>}
          </div>
        </div>
      </article>)}
      {!loading && !visiblePosts.length && !error && <section className="reels-state">
        <Music2 size={34} /><h2>{scope === 'following' ? 'Your people, your soundtrack.' : scope === 'mine' ? 'This is your space.' : 'Every moment starts somewhere.'}</h2>
        <p>{scope === 'following' ? 'Follow creators to see their moments here.' : 'Share a photo or video with a song from PUBLIC.'}</p>
        <button className="moment-primary" type="button" onClick={() => create()}><Plus size={18} />Post a moment</button>
      </section>}
      {loading && <p className={visiblePosts.length ? 'reels-footer' : 'reels-state'} role="status"><Loader2 size={20} className="animate-spin" />Finding moments…</p>}
      {error && <div className={visiblePosts.length ? 'reels-footer' : 'reels-state'} role="alert"><p>{error}</p><button type="button" onClick={() => load(visiblePosts.length > 0)}>Try again</button></div>}
      <div ref={sentinel} className="reels-sentinel" />
      {more && !loading && !error && <div className="reels-footer"><button type="button" onClick={() => load(true)}>Load more moments</button></div>}
    </div>
    {visiblePosts.length > 1 && <nav className="reels-stepper" aria-label="Browse Moments">
      <button type="button" aria-label="Previous moment" disabled={currentReel === 0} onClick={() => moveReel(-1)}><ChevronUp size={22} /></button>
      
      <button type="button" aria-label="Next moment" disabled={currentReel >= visiblePosts.length - 1} onClick={() => moveReel(1)}><ChevronDown size={22} /></button>
    </nav>}
    {visiblePosts.filter((post) => comments.has(post.id)).map((post) => <Dialog key={post.id} open onOpenChange={(open) => {if (!open) dismissComments(post.id);}}>
      <DialogContent className={'moment-discussion-dialog ' + (mobile ? 'moment-comments-sheet' : 'reels-comments')} onOpenAutoFocus={(event) => {
        event.preventDefault();
        document.getElementById('discussion-title-' + post.id)?.focus();
      }} onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (!report) document.getElementById('discussion-trigger-' + post.id)?.focus();
      }}>
        {!mobile && post.media?.[0]?.url && <div className="moment-discussion-media">
          {post.media[0].type === 'video' ?
          <video src={post.media[0].url + '#t=0.1'} preload="metadata" muted playsInline /> :
          <img src={post.media[0].url} alt="" />}
        </div>}
        <div className="reels-discussion-panel">
          <DialogHeader className="discussion-header">
            <DialogTitle id={'discussion-title-' + post.id} tabIndex={-1}>Comments</DialogTitle>
            <DialogDescription className="sr-only">Comments on this Moment.</DialogDescription>
          </DialogHeader>
          <MomentComments mobile={mobile} post={post} onReport={(target) => {dismissComments(post.id);setReport(target);}} />
        </div>
      </DialogContent>
    </Dialog>)}
  {composer && <MomentComposer seedTrack={seed} onClose={() => setComposer(false)} onPublished={(post) => {setComposer(false);setNotice('Your moment is live.');if (id || scope === 'following' || trackFilter) {nav('/moments?view=mine');} else {setPosts((old) => [post, ...old.filter((x) => x.id !== post.id)]);if (feed.current) feed.current.scrollTop = 0;setReelIndex(0);}}} />}{report && <ReportMoment target={report} onClose={() => setReport(null)} />}
 </div>;
}