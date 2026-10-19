import { getPlaylist } from "@/lib/collaborativePlaylists";
import PlaylistCollaborators from "@/components/playlist/PlaylistCollaborators";
import PlaylistActionsSheet from '@/components/playlist/PlaylistActionsSheet';
import { shareLink } from '@/lib/shareLink';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { readAllPages } from '@/lib/readPages';
import { removePlaylistTracks, reorderPlaylistTracks, movePlaylistTrack, shufflePlaylist } from '@/lib/playlistActions';
import { Play, Pause, Shuffle, Plus, Pencil, Trash2, Share2, ListMusic, Search, ArrowUp, ArrowDown, X, Check, Loader2, ImagePlus, ChevronLeft, MoreHorizontal, Copy } from 'lucide-react';
import TrackRow from '@/components/TrackRow';
import AddToPlaylistPicker from '@/components/playlist/AddToPlaylistPicker';
import EmptyState from '@/components/EmptyState';
import LoadError from '@/components/LoadError';
import { useToast } from '@/components/ui/use-toast';
import { useCoverUrl } from '@/hooks/useCoverUrl';
import '@/components/playlist/playlist-detail.css';
function PlaylistArtwork({ url }) {const src = useCoverUrl(url);return src ? <img src={src} alt="" className="playlist-collage-tile" /> : <span className="playlist-collage-tile" />;}
export default function PlaylistDetail() {
  const { id } = useParams(),nav = useNavigate(),{ user } = useAuth(),p = usePlayer(),{ toast } = useToast();
  const [playlist, setPlaylist] = useState(null),[tracks, setTracks] = useState([]),[loading, setLoading] = useState(true),[error, setError] = useState(false);
  const [showMore, setShowMore] = useState(false),[managing, setManaging] = useState(false);
  const [editing, setEditing] = useState(false),[showAdd, setShowAdd] = useState(false),[busy, setBusy] = useState(false),[saved, setSaved] = useState(false);
  const [query, setQuery] = useState(''),[sort, setSort] = useState('custom'),[selected, setSelected] = useState(new Set());
  const [form, setForm] = useState({ name: '', description: '', is_public: true }),[coverFile, setCoverFile] = useState(null),[preview, setPreview] = useState('');
  const version = useRef(0),writeLock = useRef(false),imageMemo = useRef(null),baseline = useRef(null),savedRead = useRef(0);
  const load = useCallback(async () => {
    const v = ++version.current;setLoading(true);setError(false);
    try {
      const pl = await getPlaylist(id),ids = [...new Set(pl.track_ids || [])];let list = [];
      for (let start = 0; start < ids.length; start += 200) list.push(...(await readAllPages((opts) => base44.entities.Track.filter({ id: { $in: ids.slice(start, start + 200) } }, { ...opts }))));
      if (v !== version.current) return;
      const order = new Map(ids.map((id, i) => [id, i]));list.sort((a, b) => order.get(a.id) - order.get(b.id));
      setPlaylist(pl);setTracks(list);baseline.current = pl;setForm({ name: pl.name || '', description: pl.description || '', is_public: !!pl.is_public });
    } catch {if (v === version.current) setError(true);} finally {if (v === version.current) setLoading(false);}
  }, [id]);
  useEffect(() => {setSelected(new Set());setManaging(false);setEditing(false);setShowAdd(false);setCoverFile(null);setPreview('');setQuery('');setSort('custom');setSaved(false);setShowMore(false);load();return () => {version.current++;};}, [load]);
  useEffect(() => {let alive = true;const request = ++savedRead.current;if (user?.id) base44.entities.SavedPlaylist.filter({ user_id: user.id, playlist_id: id }, '-created_date', 1).then((rows) => {if (alive && request === savedRead.current) setSaved((Array.isArray(rows) ? rows : rows?.items || []).length > 0);}).catch(() => {});return () => {alive = false;};}, [id, user?.id]);
  useEffect(() => {if (!user?.id) return;let stop = () => {};try {stop = base44.entities.Playlist.subscribe((event) => {if (event.id === id && !writeLock.current) load();});} catch {}return () => stop();}, [id, user?.id, load]);
  useEffect(() => () => {if (preview) URL.revokeObjectURL(preview);}, [preview]);
  const isOwn = !!user && playlist?.creator_id === user.id;
  const canEditSongs = isOwn || !!user && playlist?.collaboration_enabled && (playlist.collaborator_ids || []).includes(user.id);
  const cover = useCoverUrl(preview || playlist?.cover_art_url || tracks.find((t) => t.cover_art_url)?.cover_art_url || '');
  const collage = useMemo(() => [...new Set(tracks.map((t) => t.cover_art_url).filter(Boolean))].slice(0, 4), [tracks]);
  const useCollage = !preview && !playlist?.cover_art_url && collage.length === 4;
  const sameQueue = tracks.length > 0 && p.queue?.length === tracks.length && tracks.every((t, i) => p.queue[i]?.id === t.id);
  const playlistActive = sameQueue && tracks.some((t) => t.id === p.currentTrack?.id);
  const playlistPlaying = playlistActive && p.isPlaying;
  const filtered = !!query.trim();
  const view = useMemo(() => {
    const term = query.trim().toLowerCase(),rows = tracks.filter((t) => !term || [t.title, t.artist, t.uploader_name].some((s) => s?.toLowerCase().includes(term)));
    if (sort === 'title') rows.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    if (sort === 'artist') rows.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
    if (sort === 'duration') rows.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
    if (sort === 'shortest') rows.sort((a, b) => (a.duration_seconds || 0) - (b.duration_seconds || 0));
    return rows;
  }, [tracks, query, sort]);
  const total = tracks.reduce((n, t) => n + (t.duration_seconds || 0), 0),missing = Math.max(0, new Set(playlist?.track_ids || []).size - tracks.length);
  async function write(fn) {
    if (writeLock.current) return;writeLock.current = true;setBusy(true);
    try {await fn();window.dispatchEvent(new Event('playlists:changed'));}
    catch (e) {toast({ title: e?.response?.data?.error || e.message || 'Could not save. Retry.', variant: 'destructive' });} finally
    {writeLock.current = false;setBusy(false);}
  }
  async function saveEdit() {
    if (!form.name.trim()) return;
    await write(async () => {
      let url = playlist.cover_art_url || '';
      if (coverFile) {
        if (imageMemo.current?.file !== coverFile) {const r = await base44.integrations.Core.UploadFile({ file: coverFile });if (!r.file_url) throw Error('Artwork did not upload.');imageMemo.current = { file: coverFile, url: r.file_url };}
        url = imageMemo.current.url;
      }
      const original = baseline.current || playlist,values = { name: form.name.trim(), description: form.description.trim(), is_public: form.is_public };
      const payload = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== (key === 'is_public' ? !!original[key] : original[key] || '')));
      if (coverFile) payload.cover_art_url = url;
      const result = Object.keys(payload).length ? await base44.entities.Playlist.update(id, payload) : playlist;
      baseline.current = result;setPlaylist(result);setEditing(false);setPreview('');setCoverFile(null);toast({ title: 'Playlist updated' });
    });
  }
  async function move(t, delta) {
    const original = playlist.track_ids || [],next = movePlaylistTrack(original, t.id, delta, tracks.map((row) => row.id));
    if (next.every((id, i) => id === original[i])) return;
    await write(async () => {const updated = await reorderPlaylistTracks(id, next, original);setPlaylist(updated);const order = new Map([...new Set(next)].map((id, i) => [id, i]));setTracks((prev) => [...prev].sort((a, b) => order.get(a.id) - order.get(b.id)));});
  }
  async function remove(ids) {
    if (!ids.length || !window.confirm('Remove ' + ids.length + ' song' + (ids.length === 1 ? '' : 's') + ' from this playlist? The songs will stay on PUBLIC.')) return;
    await write(async () => {const updated = await removePlaylistTracks(id, ids);setPlaylist(updated);setTracks((prev) => prev.filter((t) => !ids.includes(t.id)));setSelected(new Set());toast({ title: 'Removed from playlist' });});
  }
  async function share() {
    try {const result = await shareLink({ title: playlist.name, url: window.location.origin + '/playlist/' + encodeURIComponent(id) });if (result === 'copied') toast({ title: 'Playlist link copied' });}
    catch {toast({ title: 'Couldn’t share this playlist. Please try again.', variant: 'destructive' });}
  }

  async function duplicate() {
    if (!user) {nav('/login?returnTo=' + encodeURIComponent(window.location.pathname));return;}
    await write(async () => {const copy = await base44.entities.Playlist.create({ name: (playlist.name + ' — Copy').slice(0, 160), description: playlist.description || '', cover_art_url: playlist.cover_art_url || '', is_public: false, track_ids: tracks.map((t) => t.id) });nav('/playlist/' + copy.id);toast({ title: 'Private playlist copy created' });});
  }
  async function toggleSaved() {
    if (!user) {nav('/login?returnTo=' + encodeURIComponent(window.location.pathname));return;}
    savedRead.current++;
    await write(async () => {const result = await base44.entities.SavedPlaylist.filter({ user_id: user.id, playlist_id: id }, { sort: '-created_date', limit: 1 });if (!Array.isArray(result) && !Array.isArray(result?.items)) throw Error('Could not check saved playlists. Please retry.');const wasSaved = (Array.isArray(result) ? result : result.items).length > 0;if (wasSaved) await base44.entities.SavedPlaylist.deleteMany({ user_id: user.id, playlist_id: id });else await base44.entities.SavedPlaylist.create({ user_id: user.id, playlist_id: id });setSaved(!wasSaved);toast({ title: wasSaved ? 'Removed from your library' : 'Added to your library' });});
  }
  const playAll = (shuffle) => {if (!tracks.length) return;p.setShuffle(false);p.playTrackAt(shuffle ? shufflePlaylist(tracks) : tracks, 0);};
  if (playlist && playlist.id !== id) return error ? <LoadError onRetry={load} /> : <div className="py-16 grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (error && !playlist) return <LoadError onRetry={load} />;
  if (loading && !playlist) return <div className="py-16 grid place-items-center"><Loader2 className="animate-spin" /></div>;
  if (!playlist) return <EmptyState title="Playlist unavailable" />;
  return <div className="playlist-page playlist-editorial mx-auto pb-8" data-managing={managing && canEditSongs}>
  <nav className="playlist-page-nav" aria-label="Playlist navigation"><button type="button" disabled={busy} onClick={() => nav('/library')} className="playlist-circle" aria-label="Back to Library"><ChevronLeft size={23} /></button><span>YOUR PUBLIC · PLAYLIST</span><div><button type="button" onClick={share} className="playlist-circle" aria-label="Share playlist"><Share2 size={19} /></button><button type="button" disabled={busy} onClick={() => setShowMore(true)} className="playlist-circle" aria-label="More playlist options" aria-haspopup="dialog" aria-expanded={showMore}><MoreHorizontal size={21} /></button></div></nav>
  {error && <button disabled={loading || busy || editing} onClick={load} className="playlist-action mb-4">Refresh playlist</button>}
  <section className="playlist-hero">
   <div className={"playlist-cover " + (useCollage ? "playlist-collage" : "")} role="img" aria-label={playlist.name + " playlist artwork"}>{useCollage ? collage.map((url) => <PlaylistArtwork key={url} url={url} />) : cover ? <img src={cover} alt="Playlist cover" className="w-full h-full object-cover" /> : <div className="playlist-art-placeholder"><ListMusic size={52} /><span>PUBLIC.</span></div>}
    {isOwn && editing && <label className="absolute bottom-3 inset-x-3 bg-background/90 border rounded-full px-3 py-2 flex items-center justify-center gap-2 text-xs cursor-pointer"><ImagePlus size={15} />Change cover<input aria-label="Playlist cover" disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {const f = e.target.files?.[0];e.target.value = '';if (!f || writeLock.current) return;if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || f.size > 10 * 1024 * 1024) {toast({ title: 'Choose a JPEG, PNG or WebP image under 10 MB', variant: 'destructive' });return;}setCoverFile(f);setPreview(URL.createObjectURL(f));}} /></label>}
   </div>
   <div className="playlist-info min-w-0 flex-1">
    <p className="eyebrow mb-3">{playlist.is_public ? 'Public playlist' : 'Private playlist'}</p>
    {editing ? <input aria-label="Playlist name" disabled={busy} maxLength={160} className="playlist-title bg-transparent border-b w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /> : <h1 className="playlist-title break-words">{playlist.name}</h1>}
    {editing ? <><textarea aria-label="Playlist description" disabled={busy} maxLength={2000} rows={3} className="w-full mt-4 bg-background border rounded-xl p-3 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><label className="flex gap-2 items-center text-sm my-4"><input type="checkbox" disabled={busy} checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.target.checked })} />Public — anyone can find this playlist</label></> : playlist.description && <p className="text-muted-foreground text-sm leading-relaxed max-w-xl mt-4 whitespace-pre-wrap">{playlist.description}</p>}
    <p className="text-sm text-muted-foreground mt-4 mb-5">{tracks.length} songs · {Math.floor(total / 3600) > 0 ? Math.floor(total / 3600) + ' hr ' : ''}{Math.floor(total / 60) % 60} min{missing > 0 ? ' · ' + missing + ' unavailable' : ''}</p>
    <div className="playlist-controls">
     {!editing && <><button type="button" disabled={!tracks.length} onClick={() => playlistActive ? p.togglePlay() : playAll(false)} className="chrome-button playlist-primary-play" aria-label={(playlistPlaying ? "Pause " : playlistActive ? "Resume " : "Play ") + playlist.name}>{playlistPlaying ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}{playlistPlaying ? "Pause" : playlistActive ? "Resume" : "Play"}</button><button type="button" disabled={!tracks.length} onClick={() => playAll(true)} className="playlist-action playlist-shuffle"><Shuffle size={19} />Shuffle</button>{!isOwn && <button type="button" disabled={busy} onClick={toggleSaved} className="playlist-circle playlist-save" aria-label={saved ? "Remove playlist from library" : "Save playlist to library"} aria-pressed={saved}>{saved ? <Check size={20} /> : <Plus size={20} />}</button>}</>}
     {editing && <><button type="button" disabled={busy || !form.name.trim()} onClick={saveEdit} className="chrome-button">{busy ? 'Saving…' : 'Save changes'}</button><button type="button" disabled={busy} onClick={() => {setEditing(false);setCoverFile(null);setPreview('');setForm({ name: playlist.name, description: playlist.description || '', is_public: !!playlist.is_public });}} className="playlist-action">Cancel</button><button type="button" disabled={busy} className="playlist-action text-destructive" onClick={() => {if (confirm('Delete this playlist? Your songs will remain on PUBLIC.')) write(async () => {await base44.entities.Playlist.delete(id);nav('/library');});}}><Trash2 size={16} />Delete playlist</button></>}
    </div>
    {playlist.is_public && tracks.some((t) => !t.is_published) && <p className="text-xs text-muted-foreground mt-3">Private or pending songs are only playable by their owner until published.</p>}
    {!playlist.is_public && <p className="text-xs text-muted-foreground mt-3">Sharing the link does not give other accounts access to a private playlist.</p>}
   </div>
  </section>
  <PlaylistCollaborators playlist={playlist} onSaved={setPlaylist} />
  <div className="playlist-section-title"><div><h2>{managing && canEditSongs ? 'Edit songs' : 'Songs'}</h2><span>{filtered ? view.length + ' of ' + tracks.length : tracks.length} {tracks.length === 1 ? 'song' : 'songs'}</span></div>{canEditSongs && <div className="playlist-list-tools"><button type="button" disabled={busy || editing} className="playlist-circle" aria-label="Add songs to playlist" onClick={() => setShowAdd(true)}><Plus size={19} /></button><button type="button" disabled={busy || editing} className="playlist-action" aria-pressed={managing} onClick={() => {setManaging((v) => !v);setSelected(new Set());}}>{managing ? <><Check size={15} />Done</> : <><Pencil size={14} />Edit songs</>}</button></div>}</div>
  {canEditSongs && managing && <p className="playlist-edit-hint" role="status">{filtered || sort !== 'custom' ? 'Clear search and choose Playlist order to rearrange songs.' : 'Select songs to remove together, or use the arrows to change their order.'}</p>}
  



    
  {selected.size > 0 && canEditSongs && managing && <div className="flex items-center justify-between border rounded-xl p-3 mb-3 text-sm"><div className="flex flex-wrap items-center gap-3"><span>{selected.size} selected</span><button type="button" disabled={busy} onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">Clear selection</button></div><button disabled={busy} onClick={() => remove([...selected])} className="text-destructive inline-flex gap-2 items-center"><Trash2 size={15} />Remove selected</button></div>}
  {!view.length ? <div className="playlist-empty"><EmptyState icon={ListMusic} title={filtered ? 'No matching songs' : 'Your next favorite starts here'} description={filtered ? 'Try a different title or artist.' : canEditSongs ? 'Add songs and make this playlist your own.' : 'Check back when new music is added.'} />{filtered ? <button type="button" className="playlist-action" onClick={() => setQuery('')}>Clear search</button> : canEditSongs && <button type="button" className="chrome-button" disabled={busy} onClick={() => setShowAdd(true)}><Plus size={17} />Add your first songs</button>}</div> :
    <div className="playlist-song-list">{view.map((t, i) => <div key={t.id} className={"playlist-song-item " + (managing && canEditSongs ? "has-edit-controls" : "")} data-current={p.currentTrack?.id === t.id} aria-current={p.currentTrack?.id === t.id ? "true" : undefined}>
    {canEditSongs && managing && <input disabled={busy} aria-label={'Select ' + t.title} type="checkbox" checked={selected.has(t.id)} onChange={() => setSelected((prev) => {const next = new Set(prev);next.has(t.id) ? next.delete(t.id) : next.add(t.id);return next;})} />}
    <div className="flex-1 min-w-0"><TrackRow track={t} index={i} queue={tracks} queueIndex={tracks.findIndex((row) => row.id === t.id)} showArt />{playlist.track_contributors?.[t.id] && <p className="text-[11px] text-muted-foreground pl-3 pb-2">Added by {playlist.track_contributors[t.id].name || "a collaborator"}</p>}</div>
    {canEditSongs && managing && <div className="playlist-row-actions"><button disabled={busy || sort !== 'custom' || !!query || tracks.findIndex((row) => row.id === t.id) === 0} onClick={() => move(t, -1)} aria-label={'Move ' + t.title + ' up'}><ArrowUp size={15} /></button><button disabled={busy || sort !== 'custom' || !!query || tracks.findIndex((row) => row.id === t.id) === tracks.length - 1} onClick={() => move(t, 1)} aria-label={'Move ' + t.title + ' down'}><ArrowDown size={15} /></button><button disabled={busy} onClick={() => remove([t.id])} aria-label={'Remove ' + t.title + ' from playlist'}><X size={15} /></button></div>}
   </div>)}</div>}
  
  {showMore && <PlaylistActionsSheet name={playlist.name} cover={cover} subtitle={tracks.length + ' songs · ' + (playlist.is_public ? 'Public playlist' : 'Private playlist')} onClose={() => setShowMore(false)} actions={[
    { label: 'Add to queue', description: 'Play after your current queue', icon: ListMusic, disabled: !tracks.length, onClick: () => {p.addManyToQueue(tracks);toast({ title: 'Playlist added to queue' });} },
    { label: 'Share playlist', description: playlist.is_public ? 'Send a link to this playlist' : 'Copy your private playlist link', icon: Share2, onClick: share },
    ...(!isOwn && canEditSongs ? [{ label: 'Add songs', icon: Plus, disabled: busy, onClick: () => setShowAdd(true) }, { label: 'Edit songs', icon: ListMusic, disabled: busy, onClick: () => setManaging(true) }] : []),
    ...(isOwn ? [
    { label: 'Add songs', icon: Plus, disabled: busy, onClick: () => setShowAdd(true) },
    { label: 'Edit songs', description: 'Select, reorder and remove songs', icon: ListMusic, disabled: busy, onClick: () => {setEditing(false);setManaging(true);} },
    { label: 'Edit playlist details', description: 'Artwork, name and privacy', icon: Pencil, disabled: busy, onClick: () => {setManaging(false);setSelected(new Set());setEditing(true);} }] :
    [{ label: saved ? 'Remove from library' : 'Save to library', icon: saved ? Check : Plus, disabled: busy, onClick: toggleSaved }]),
    { label: 'Make a copy', description: 'Create your own private version', icon: Copy, disabled: busy, onClick: duplicate }]
    } />}
  {showAdd && <AddToPlaylistPicker playlist={playlist} onClose={() => {setShowAdd(false);load();}} />}
 </div>;
}