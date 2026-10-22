import ProfileMedia from "@/components/ProfileMedia";
import {withPresetAvatar} from "@/lib/nativeAvatar";
import {useEffect,useState} from "react";
/** @param {any} props */
export default function Avatar({user,size=40,className="",motion=false,active=true}){
 user=withPresetAvatar(user);
 const [failed,setFailed]=useState(false);
 const [defaultFailed,setDefaultFailed]=useState(false);
 useEffect(()=>setFailed(false),[user?.avatar_url]);
 if(!user)return null;
 const style={width:size,height:size,flexShrink:0,aspectRatio:"1 / 1",borderRadius:"50%",overflow:"hidden"};
 const name=user.display_name||user.full_name||"?";
 if(user.avatar_url&&!failed&&motion&&(user.avatar_video_url||user.avatar_gif_url))return <ProfileMedia src={user.avatar_url} videoSrc={user.avatar_video_url} gifSrc={user.avatar_gif_url} active={active} style={style} className={"rounded-full "+className} onError={()=>setFailed(true)}/>;
 if(user.avatar_url&&!failed)return <img src={user.avatar_url} alt="" onError={()=>setFailed(true)} style={{...style,objectFit:"cover"}} className={"rounded-full "+className}/>;
 if(!defaultFailed)return <img src="/avatars/default-headphones.webp" alt="" onError={()=>setDefaultFailed(true)} style={{...style,objectFit:"cover"}} className={"rounded-full "+className}/>;
 return <div style={{...style,fontSize:Math.max(11,size*.4)}} className={"rounded-full bg-foreground/10 grid place-items-center font-semibold text-foreground/70 shrink-0 "+className}>{name.trim().charAt(0)||"?"}</div>;
}
