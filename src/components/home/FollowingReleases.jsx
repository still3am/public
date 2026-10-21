import {useArtistReleases} from "@/hooks/useArtistReleases";
import TrackCard from "@/components/TrackCard";
import ScrollShelf from "@/components/ScrollShelf";
import {Link} from "react-router-dom";
export default function FollowingReleases(){
 const {items,error,refresh}=useArtistReleases();
 const tracks=[...new Map(items.filter(item=>item.track).map(item=>[item.track_id,item.track])).values()].slice(0,24);
 if(!tracks.length&&!error)return null;
 return <section className="home-section mb-10" aria-label="New from artists you follow"><div className="flex justify-between gap-3 items-center mb-4"><h2 className="text-xl md:text-2xl font-bold tracking-tight">From artists you follow</h2><Link to="/notifications?view=music" className="text-xs underline">See all</Link></div>{error&&<p role="status" className="text-sm mb-3">Releases could not refresh. <button className="underline" onClick={refresh}>Retry</button></p>}<ScrollShelf label="Followed artist releases" className="home-card-shelf flex gap-3">{tracks.map(track=><div key={track.id} className="home-shelf-card shrink-0"><TrackCard track={track} queue={tracks}/></div>)}</ScrollShelf></section>;
}
