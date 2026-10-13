import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

// Failed lookups remain unknown rather than enabling duplicate interactions.
export function useTrackMenuState(track, open) {
  const { user } = useAuth();
  const artistId=track?.uploader_id;
  const key=[user?.id,track?.id,artistId].join(':');
  const empty={key,liked:false,following:false,likeReady:false,followReady:false};
  const [state,setState]=useState(empty);
  const [retry,setRetry]=useState(0);
  const current=state.key===key?state:empty;
  const canFollow=!!user&&!!artistId&&artistId!==user.id;
  useEffect(()=>{
    if(!open||!user?.id||!track?.id)return;
    let alive=true;
    Promise.allSettled([
      base44.entities.Like.filter({user_id:user.id,track_id:track.id},'-created_date',1),
      canFollow?base44.entities.Follow.filter({follower_id:user.id,following_id:artistId},'-created_date',1):Promise.resolve([]),
    ]).then(([likes,follows])=>{
      if(!alive)return;
      setState(previous=>{
        const next=previous.key===key?{...previous}:{...empty};
        if(likes.status==='fulfilled'){next.liked=likes.value.length>0;next.likeReady=true;}
        if(follows.status==='fulfilled'){next.following=follows.value.length>0;next.followReady=true;}
        return next;
      });
    });
    return()=>{alive=false;};
  },[open,key,canFollow,retry]);
  const patch=change=>setState(previous=>previous.key===key?{...previous,...change}:previous);
  return {...current,reload:()=>setRetry(value=>value+1),ready:current.likeReady&&current.followReady,canFollow,
    setLiked:liked=>patch({liked}),setFollowing:following=>patch({following})};
}
