import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Send, Trash2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { momentsApi, momentError } from '@/lib/momentsApi';
import './moment-tools.css';

export default function MomentReplies() {
  const [targets, setTargets] = useState([]);
  useEffect(() => {
    function findComments() {
      const panel = document.querySelector('[role="dialog"][data-state="open"] .reels-discussion-panel');
      const title = panel?.querySelector('[id^="discussion-title-"]');
      const moment = title?.id.slice('discussion-title-'.length);
      const next = !moment ? [] : [...panel.querySelectorAll('.discussion-comment [data-moment-comment-id]')].flatMap((marker) => {
        const host = marker.closest('.discussion-comment')?.children[1];
        return host ? [{ host, moment, parent: marker.dataset.momentCommentId }] : [];
      });
      setTargets((old) => old.length === next.length && old.every((item, index) => item.host === next[index].host && item.parent === next[index].parent) ? old : next);
    }
    findComments();
    const observer = new MutationObserver(findComments);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] });
    return () => observer.disconnect();
  }, []);
  return targets.map(({ host, moment, parent }) => createPortal(<InlineReply moment={moment} parent={parent} />, host, parent));
}

function InlineReply({ moment, parent }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null), request = useRef(''), writing = useRef(false), sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);

  async function load(offset = 0) {
    const version = ++sequence.current;
    setError('');
    setLoading(true);
    try {
      const response = await momentsApi('replies', { id: moment, parent_id: parent, offset });
      if (sequence.current !== version) return;
      if (!Array.isArray(response.items)) throw Error('Replies could not load.');
      setItems((old) => offset ? [...old, ...response.items.filter((item) => !old.some((row) => row.id === item.id))] : response.items);
      setNext(response.has_more ? response.next_offset : null);
    } catch (error) { if (sequence.current === version) setError(momentError(error)); }
    finally { if (sequence.current === version) setLoading(false); }
  }
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || writing.current) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      if (!request.current) request.current = crypto.randomUUID();
      await momentsApi('comment', { id: moment, parent_id: parent, body: text.trim(), request_id: request.current });
      request.current = '';
      setText('');
      await load();
    } catch (error) { setError(momentError(error)); }
    finally { writing.current = false; setBusy(false); }
  }
  async function remove(item) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    try {
      await momentsApi('delete_comment', { id: moment, comment_id: item.id });
      await load();
    } catch (error) { setError(momentError(error)); }
    finally { writing.current = false; setBusy(false); }
  }
  return <div className="moment-inline-replies">
    <button type="button" aria-expanded={open} disabled={busy} onClick={() => {
      if (open) { sequence.current++; setOpen(false); setLoading(false); }
      else { setOpen(true); load(); requestAnimationFrame(() => input.current?.focus({preventScroll:true})); }
    }}>{open ? 'Hide replies' : 'Reply'}</button>
    {open && <div className="moment-reply-body">
      {items.map((item) => <div className="moment-reply-row" key={item.id}>
        <Avatar user={item.author} size={24} />
        <div><strong>{item.author?.display_name || 'PUBLIC listener'}</strong><p>{item.body}</p></div>
        {item.can_delete && <button type="button" disabled={busy} aria-label="Delete reply" onClick={() => remove(item)}><Trash2 size={14}/></button>}
      </div>)}
      {loading && <small role="status">Loading replies…</small>}
      {!loading && next!==null && <button type="button" onClick={() => load(next)}>More replies</button>}
      {error && <p role="alert">{error} <button type="button" onClick={() => load()}>Reload</button></p>}
      <form onSubmit={send}>
        <input ref={input} value={text} maxLength={1000} disabled={busy} aria-label="Write a reply" placeholder="Write a reply…" onChange={(event) => setText(event.target.value)} />
        <button type="submit" aria-label="Post reply" disabled={busy || !text.trim()}><Send size={16}/></button>
      </form>
    </div>}
  </div>;
}
