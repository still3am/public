import TrackMusicVideo from "@/components/TrackMusicVideo";
import "./track-editorial.css";
import {useReleaseTheme} from "@/hooks/useReleaseTheme";
import { shareTrack } from "@/lib/shareTrack";
import { prepareTrackShare } from "@/lib/trackShareUrl";
import { getPublishedTracks } from "@/lib/catalogCache";
import { splitArtistNames } from "@/lib/artistTracks";
import TrackCard from "@/components/TrackCard";
import ScrollShelf from "@/components/ScrollShelf";
import LoadError from '@/components/LoadError';
import { useRef } from 'react';
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { usePlayer } from "@/context/PlayerContext";
import LibraryButton from "@/components/LibraryButton";
import CollapsibleText from "@/components/CollapsibleText";
import { useCoverUrl } from "@/hooks/useCoverUrl";
import { formatTime } from "@/lib/audio-utils";
import EmptyState from "@/components/EmptyState";
import EditTrackModal from "@/components/EditTrackModal";
import ArtistLinks from "@/components/ArtistLinks";
import {
  ChevronLeft,
  Share2,
  Shuffle,
  Music,
  Loader2,
  Play,
  Pause,
  Pencil,
  Sparkles,
  Timer,
  Wand2 } from
"lucide-react";
import TrackRow from "@/components/TrackRow";
import TrackOptionsMenu from "@/components/track/TrackOptionsMenu";
import SyncLyricsModal from "@/components/SyncLyricsModal";
import GenerateLyricsModal from "@/components/GenerateLyricsModal";
import { useToast } from "@/components/ui/use-toast";
import { fetchArtistTracks } from "@/lib/artistTracks";
import { getUsersByIds } from "@/lib/userLookup";

export default function TrackDetail() {
  const { id } = useParams();
  useEffect(() => {prepareTrackShare();}, [id]);
  const nav = useNavigate();
  const { user } = useAuth();
  const p = usePlayer();
  const [track, setTrack] = useState(null);
  const coverUrl = useCoverUrl(track?.cover_art_url);
  const releaseTheme = useReleaseTheme(coverUrl);
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [coverUrl]);
  const [loading, setLoading] = useState(true);
  const [uploader, setUploader] = useState(null);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [moreTracks, setMoreTracks] = useState([]);
  const [recommended, setRecommended] = useState([]);
  useEffect(() => {
    let active = true;setRecommended([]);
    if (!track?.genre || track.genre === "Other") return;
    const names = new Set(splitArtistNames(track.artist));
    getPublishedTracks().then((rows) => {
      const picks = rows.filter((row) => row.id !== track.id && row.genre === track.genre && !splitArtistNames(row.artist).some((name) => names.has(name)));
      picks.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
      if (active) setRecommended(picks.slice(0, 10));
    }).catch(() => {});
    return () => {active = false;};
  }, [track?.id, track?.genre, track?.artist]);
  const { toast } = useToast();

  const loadVersion = useRef(0),detectVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);
  async function load() {
    const request = ++loadVersion.current;request === loadVersion.current && setLoadError(false);
    request === loadVersion.current && setLoading(true);
    try {
      let t;
      try {t = await base44.entities.Track.get(id);} catch (original) {
        const status = original?.status ?? original?.response?.status;
        if (status === 403 || status === 404) throw original;
        const rows = await base44.entities.Track.filter({ id }, "-created_date", 1);
        t = (Array.isArray(rows) ? rows : rows?.items || [])[0];if (!t) throw original;
      }
      if (request !== loadVersion.current) return;
      setTrack(t);setLoading(false);
      setUploader((previous) => previous?.id === t?.uploader_id ? previous : t?.uploader_id ? { id: t.uploader_id, display_name: t.uploader_name || "PUBLIC member" } : null);
      const [credit, related] = await Promise.allSettled([
      t?.uploader_id ? getUsersByIds([t.uploader_id]) : Promise.resolve([]),
      t?.artist ? fetchArtistTracks(t.artist) : Promise.resolve([])]
      );
      if (request !== loadVersion.current) return;
      if (credit.status === "fulfilled" && credit.value[0]) setUploader(credit.value[0]);
      if (related.status === "fulfilled") setMoreTracks(related.value.filter((row) => row.id !== t.id).slice(0, 6));
    } catch {request === loadVersion.current && setLoadError(true);
    } finally {
      request === loadVersion.current && setLoading(false);
    }
  }

  useEffect(() => {
    detectVersion.current++;setTrack(null);setUploader(null);setMoreTracks([]);setEditing(false);setGenerating(false);setSyncing(false);setDetecting(false);load();
    return () => {loadVersion.current++;};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);


  async function detectGenre() {
    if (!track || detecting) return;
    const trackId = track.id,request = ++detectVersion.current;setDetecting(true);
    try {
      const res = await base44.functions.invoke("detectGenre", { track_id: track.id });
      const genre = res?.data?.genre;
      if (genre) {
        setTrack((previous) => previous?.id === trackId ? { ...previous, genre } : previous);
        toast({ title: `Genre set to ${genre}` });
      } else {
        toast({ title: "Couldn't detect genre", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: e?.response?.data?.error || "Couldn't detect genre", variant: "destructive" });
    } finally {
      if (request === detectVersion.current) setDetecting(false);
    }
  }

  if (loadError && !track) return <LoadError onRetry={load} />;
  if (loading) {
    return (
      <div className="py-20 grid place-items-center">
        <Loader2 className="animate-spin" />
      </div>);

  }
  if (!track) return <EmptyState title="Track not found" />;

  const isCurrent = p.currentTrack?.id === track.id;
  const isOwner = track.uploader_id === user?.id;
  const isPlaying = isCurrent && p.isPlaying;
  const hasLyricsAudio = !!(track.audio_url || track.audio_file_uri || track._private_audio);
  const displayArtist = track.artist || "";

  const ownerItems = isOwner ?
  [
  {
    icon: Pencil,
    label: "Edit track",
    onClick: () => setEditing(true)
  },
  {
    icon: detecting ? Loader2 : Wand2,
    label: detecting ? "Detecting genre…" : "Detect genre (AI)",
    onClick: detectGenre
  },
  ...(hasLyricsAudio ?
  [{
    icon: Sparkles,
    label: track.lyrics_text?.trim() ? "Regenerate lyrics" : "Generate lyrics",
    onClick: () => setGenerating(true)
  },
  {
    icon: Timer,
    label: "Sync lyrics",
    onClick: () => setSyncing(true)
  }] :
  [])] :
  [];

  return (
    <div className="track-page track-editorial release-page mx-auto" style={releaseTheme}>
      <div className="release-toolbar">
        <button onClick={() => window.history.state?.idx > 0 ? nav(-1) : nav("/search")} className="release-round" aria-label="Back"><ChevronLeft size={26} /></button>
        <div className="release-toolbar-actions">
          <button className="release-round" aria-label="Share song" onClick={async () => {try {const result = await shareTrack(track);if (result === "copied") toast({ title: "Song link copied" });} catch {toast({ title: "Couldn’t share this song. Please try again.", variant: "destructive" });}}}><Share2 size={21} /></button>
          <TrackOptionsMenu track={track} size={22} buttonClassName="release-round" items={ownerItems} />
        </div>
      </div>
      <section className={"release-header release-header-full" + (coverUrl && !coverFailed ? " has-release-art" : "")}>
        <div className="release-art">{coverUrl && !coverFailed ? <img src={coverUrl} alt={track.title + " cover"} onError={() => setCoverFailed(true)} /> : <Music size={52} />}</div>
        <div className="track-release-info">
        
        <h1>{track.title}</h1>
        <div className="release-artist">{displayArtist ? <ArtistLinks artist={displayArtist} maxShown={8} linkClassName="hover:underline" /> : uploader && <Link to={"/profile/" + uploader.id}>{uploader.display_name || uploader.full_name || track.uploader_name}</Link>}</div>
        <p className="release-subtitle">{[track.genre, track.release_year || null, track.duration_seconds > 0 ? formatTime(track.duration_seconds) : null].filter(Boolean).join(" · ")}{track.explicit && <span className="release-explicit" aria-label="Explicit">E</span>}</p>
        <div className="release-play-controls">
          <button className="release-add-button release-shuffle-button" aria-label="Shuffle playback" aria-pressed={p.shuffle} onClick={() => {p.setShuffle(!p.shuffle);if (!isCurrent) p.playTrackAt([track]);}}><Shuffle size={22}/></button>
          <button className="release-play-button" onClick={() => isCurrent ? p.togglePlay() : p.playTrackAt([track])}>{isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}{isPlaying ? "Pause" : "Play"}</button>
          <LibraryButton track={track} size={24} className="release-add-button" />
        </div>
        </div>
      </section>
      <section className="release-song-list" aria-label="Song">
        <TrackRow track={track} index={0} showArt={false} compactRelease queue={[track]} queueIndex={0} />
      </section>
      <div className="track-detail-columns">


      {track.lyrics_text && track.lyrics_text.trim() &&
        <section className="track-page-section">
          <h2 className="text-lg font-extrabold tracking-tight mb-3 flex items-center gap-2">
             Lyrics
          </h2>
          <CollapsibleText text={track.lyrics_text} className="track-page-lyrics selectable-content whitespace-pre-line leading-relaxed" clampClass="max-h-64" />
          {isOwner && hasLyricsAudio &&
          <button
            onClick={() => setGenerating(true)}
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-foreground/60 hover:text-foreground">
             Regenerate with AI
          </button>}
        </section>
        }

      {isOwner && !track.lyrics_text?.trim() && hasLyricsAudio &&
        <section className="track-page-section rounded-2xl border border-dashed border-border p-5 text-center">
          <Sparkles size={20} className="mx-auto text-foreground/40 mb-2" />
          <p className="text-sm text-foreground/60 mb-3">No lyrics yet. Let AI transcribe them from this track's audio.</p>
          <button
            onClick={() => setGenerating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-sm font-semibold">
            <Sparkles size={14} /> Generate lyrics
          </button>
        </section>
        }

      {(track._has_music_video || track.music_video_file_uri) && <TrackMusicVideo key={track.id + ":" + (track.music_video_file_uri || "")} track={track} />}
      <section className="release-credits">
        <h2 className="track-details-title">About this song</h2>
        {track.created_date && Number.isFinite(Date.parse(track.created_date)) && <p>Added to PUBLIC {new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(track.created_date))}</p>}
        <p>1 song{track.duration_seconds > 0 ? " · " + formatTime(track.duration_seconds) : ""}</p>
        {uploader && <p>Shared by <Link to={"/profile/" + uploader.id} className="hover:underline">{uploader.display_name || uploader.full_name || track.uploader_name || "PUBLIC member"}</Link></p>}
        {track.description && <div className="mt-4"><CollapsibleText text={track.description} className="selectable-content leading-relaxed" /></div>}
      </section>
      </div>

      {moreTracks.length > 0 && <section className="track-page-section">
        <h2>More by {track.artist}</h2>
        <ScrollShelf className="release-shelf" label="More songs by this artist">{moreTracks.map((row) => <div key={row.id} className="release-shelf-card"><TrackCard track={row} queue={moreTracks} /></div>)}</ScrollShelf>
      </section>}
      {recommended.length > 0 && <section className="track-page-section">
        <h2>You Might Also Like</h2>
        <ScrollShelf className="release-shelf" label="Songs in the same genre">{recommended.map((row) => <div key={row.id} className="release-shelf-card"><TrackCard track={row} queue={recommended} /></div>)}</ScrollShelf>
      </section>}

      {editing &&
      <EditTrackModal
        track={track}
        onClose={() => setEditing(false)}
        onSaved={(updated) => setTrack((prev) => ({ ...prev, ...updated, _has_music_video: updated.music_video_file_uri !== undefined ? !!updated.music_video_file_uri : prev?._has_music_video }))}
        onDeleted={() => nav("/profile", { replace: true })} />

      }

      {generating &&
      <GenerateLyricsModal
        track={track}
        onClose={() => setGenerating(false)}
        onSaved={(updated, options) => {
          setTrack((prev) => ({ ...prev, ...updated }));
          setGenerating(false);
          if (options?.sync) setSyncing("generated");
        }} />

      }

      {syncing &&
      <SyncLyricsModal
        track={track}
        preferTrackLyrics={syncing === "generated"}
        onClose={() => setSyncing(false)}
        onSaved={() => setSyncing(false)} />

      }
    </div>);

}