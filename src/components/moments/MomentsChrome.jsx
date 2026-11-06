import { useEffect, useRef, useState } from 'react';
import { Link2, Send, Share2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { copyText, shareOutsidePublic } from '@/lib/shareLink';
import { momentsApi, momentError } from '@/lib/momentsApi';
import './moments-chrome.css';
import MomentReplies from './MomentReplies';
import MomentSpeedControl from './MomentSpeedControl';

export default function MomentsChrome() {
  const [share, setShare] = useState(null);

  useEffect(() => {
    const root = document.querySelector('.moments-route');
    if (!root) return;
    let idle;
    // The feed owns follow state. Hide its already-followed control after each render.
    function hideFollowing() {
      root.querySelectorAll('.reel-follow').forEach((button) => {
        button.hidden = button.textContent.trim() === 'Following';
      });
    }
    const followObserver = new MutationObserver(hideFollowing);
    followObserver.observe(root, { subtree: true, childList: true, characterData: true });
    hideFollowing();
    function reveal() {
      delete root.dataset.momentsIdle;
      clearTimeout(idle);
      idle = setTimeout(() => { root.dataset.momentsIdle = 'true'; }, 3200);
    }
    function pointerMove(event) {
      if (event.pointerType === 'mouse') reveal();
    }
    function openShare(event) {
      event.preventDefault();
      setShare({ ...event.detail, trigger: document.activeElement });
    }
    reveal();
    root.addEventListener('pointerdown', reveal, true);
    root.addEventListener('pointermove', pointerMove);
    root.addEventListener('keydown', reveal);
    window.addEventListener('public:share-moment', openShare);
    return () => {
      clearTimeout(idle);
      followObserver.disconnect();
      delete root.dataset.momentsIdle;
      root.removeEventListener('pointerdown', reveal, true);
      root.removeEventListener('pointermove', pointerMove);
      root.removeEventListener('keydown', reveal);
      window.removeEventListener('public:share-moment', openShare);
    };
  }, []);

  return <><MomentSpeedControl /><MomentReplies />{share && <ShareMoment key={share.id} share={share} close={() => setShare(null)} />}</>;
}

function ShareMoment({ share, close }) {
  const [people, setPeople] = useState(null);
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState('');
  const [sent, setSent] = useState(new Set());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    momentsApi('share_people', { id: share.id }).then((result) => {
      if (current) setPeople(result.people ?? []);
    }).catch((error) => {
      if (current) { setPeople([]); setError(momentError(error)); }
    });
    return () => { current = false; };
  }, [share.id, retry]);

  async function send(person) {
    if (busy.current || sent.has(person.user_id)) return;
    busy.current = true;
    setSending(person.user_id);
    setError('');
    setNotice('');
    try {
      const result = await momentsApi('share', { id: share.id, recipient_id: person.user_id });
      if (!result.success) throw Error('Delivery was not confirmed.');
      setSent((items) => new Set(items).add(person.user_id));
      setNotice('Sent to ' + person.display_name + '.');
    } catch (error) { setError(momentError(error)); }
    finally { busy.current = false; setSending(''); }
  }

  async function external(copy) {
    setError('');
    try {
      if (copy) { await copyText(share.data.url); setNotice('Moment link copied.'); }
      else if (await shareOutsidePublic(share.data) === 'copied') setNotice('Moment link copied.');
    } catch { setError('Couldn’t share the link. Try again.'); }
  }

  const matching = people?.filter((person) =>
    [person.display_name, person.username].some((value) => value?.toLowerCase().includes(query.trim().toLowerCase()))
  );
  return <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
    <DialogContent className="moment-share-dialog" onOpenAutoFocus={(event) => { event.preventDefault(); document.getElementById('moment-share-title')?.focus(); }} onCloseAutoFocus={(event) => {
      event.preventDefault();
      if (share.trigger?.isConnected) share.trigger.focus({ preventScroll: true });
    }}>
      <DialogHeader>
        <DialogTitle id="moment-share-title" tabIndex={-1}>Share Moment</DialogTitle>
        <DialogDescription>Send in PUBLIC or share a link.</DialogDescription>
      </DialogHeader>
      <div className="moment-share-options">
        <button type="button" onClick={() => external(true)}><Link2 size={18} />Copy link</button>
        <button type="button" onClick={() => external(false)}><Share2 size={18} />Share link</button>
      </div>
      <div className="moment-share-people">
        <strong>Send in PUBLIC</strong>
        {!people && <p role="status">Finding people…</p>}
        {people?.length > 0 && <input aria-label="Find people" placeholder="Find people…" value={query} onChange={(event) => setQuery(event.target.value)} />}
        {people && !people.length && !error && <p>No other accounts have access to this Moments preview yet.</p>}
        {people?.length > 0 && !matching.length && <p>No people match your search.</p>}
        {matching?.map((person) => <div className="moment-share-person" key={person.user_id}>
          <Avatar user={person} size={34} />
          <span>{person.display_name}{person.username && <small>@{person.username}</small>}</span>
          <button type="button" disabled={!!sending || sent.has(person.user_id)} onClick={() => send(person)} aria-label={'Send Moment to ' + person.display_name}><Send size={14} />{sent.has(person.user_id) ? 'Sent' : sending === person.user_id ? 'Sending…' : 'Send'}</button>
        </div>)}
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <div role="alert">{error}{people?.length === 0 && <button type="button" onClick={() => { setError(''); setPeople(null); setRetry((value) => value + 1); }}>Retry</button>}</div>}
    </DialogContent>
  </Dialog>;
}
