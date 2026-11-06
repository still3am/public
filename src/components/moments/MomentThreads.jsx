import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, MessageCircle, Send, Trash2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { momentsApi, momentError } from '@/lib/momentsApi';
import './moment-tools.css';

export default function MomentThreads() {
  const [host, setHost] = useState(null);
  useEffect(() => {
    function findPanel() {
      const panel = document.querySelector('[role="dialog"][data-state="open"] .reels-discussion-panel');
      setHost(panel);
    }
    findPanel();
    const observer = new MutationObserver(findPanel);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] });
    return () => observer.disconnect();
  }, []);
  const title = host?.querySelector('[id^="discussion-title-"]');
  const id = title?.id.slice('discussion-title-'.length);
  return id ? createPortal(<Threads key={id} id={id} />, host) : null;
}

function Threads({ id }) {
  const [open, setOpen] = useState(false);
  const [parent, setParent] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState({ more: false, offset: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const serial = useRef(0);
  const requestId = useRef('');
  const submitting = useRef(false);
  const panel = useRef(null);
  const trigger = useRef(null);

  async function load(selected, offset = 0) {
    const request = ++serial.current;
    setLoading(true);
    setError('');
    try {
      const response = await momentsApi(selected ? 'replies' : 'comments', { id, ...(selected ? { parent_id: selected.id } : {}), offset });
      if (request !== serial.current) return;
      if (!Array.isArray(response.items)) throw Error('Comments could not load.');
      setItems((old) => offset ? [...old, ...response.items.filter((item) => !old.some((row) => row.id === item.id))] : response.items);
      setPage({ more: !!response.has_more, offset: response.next_offset || 0 });
    } catch (error) { if (request === serial.current) setError(momentError(error)); }
    finally { if (request === serial.current) setLoading(false); }
  }

  useEffect(() => () => { serial.current++; }, []);
  useEffect(() => { if (open) panel.current?.focus(); }, [open, parent?.id]);

  function show(selected) {
    setParent(selected);
    setBody('');
    setItems([]);
    setPage({ more: false, offset: 0 });
    requestId.current = crypto.randomUUID();
    load(selected);
  }

  function close() {
    serial.current++;
    setOpen(false);
    trigger.current?.focus();
  }

  async function reply(event) {
    event.preventDefault();
    if (!parent || !body.trim() || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await momentsApi('comment', { id, parent_id: parent.id, body: body.trim(), request_id: requestId.current });
      setBody('');
      requestId.current = crypto.randomUUID();
      await load(parent);
    } catch (error) { setError(momentError(error)); }
    finally { submitting.current = false; setBusy(false); }
  }

  async function remove(item) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      await momentsApi('delete_comment', { id, comment_id: item.id });
      setItems((old) => old.filter((row) => row.id !== item.id));
    } catch (error) { setError(momentError(error)); }
    finally { submitting.current = false; setBusy(false); }
  }

  const comment = (item) => <div className="moment-thread-comment">
    <Avatar user={item.author} size={30} />
    <div><strong>{item.author?.display_name || item.author?.username || 'PUBLIC listener'}</strong><p>{item.body}</p></div>
  </div>;
  return <>
    <button ref={trigger} type="button" className="moment-threads-trigger" aria-expanded={open} onClick={() => {
      if (open) close(); else { setOpen(true); show(null); }
    }} disabled={busy}><MessageCircle size={14} />Threads</button>
    {open && <section ref={panel} tabIndex={-1} aria-label={parent ? 'Comment replies' : 'Comment threads'} className="moment-threads">
      <div className="moment-thread-heading">
        <button type="button" disabled={busy} onClick={() => parent ? show(null) : close()} aria-label="Back to comments"><ArrowLeft size={18} /></button>
        <strong>{parent ? 'Replies' : 'Choose a comment'}</strong>
      </div>
      <div className="moment-thread-scroll">
        {parent && <div className="moment-thread-parent">{comment(parent)}</div>}
        {items.map((item) => <div key={item.id} className="moment-thread-row">
          {comment(item)}
          {parent ? item.can_delete && <button type="button" disabled={busy} aria-label="Delete reply" onClick={() => remove(item)}><Trash2 size={15} /></button> :
            <button type="button" onClick={() => show(item)}>Reply</button>}
        </div>)}
        {loading && <p role="status">Loading…</p>}
        {!loading && !items.length && !error && <p>{parent ? 'No replies yet.' : 'No comments yet.'}</p>}
        {page.more && !loading && <button type="button" onClick={() => load(parent, page.offset)}>Load more</button>}
      </div>
      {error && <div className="moment-thread-error" role="alert">{error} <button type="button" disabled={busy} onClick={() => load(parent)}>Reload</button></div>}
      {parent && <form onSubmit={reply}>
        <input value={body} maxLength={1000} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply…" aria-label="Write a reply" disabled={busy} />
        <button type="submit" disabled={busy || !body.trim()} aria-label="Post reply"><Send size={18} /></button>
      </form>}
    </section>}
  </>;
}
