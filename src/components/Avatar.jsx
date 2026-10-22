import "./pfp-boy.css";
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
 const isHeadphones=typeof user.avatar_url==="string"&&user.avatar_url.split(/[?#]/)[0].endsWith("/avatars/default-headphones.webp");
 if(user.avatar_url&&!isHeadphones&&!failed&&motion&&(user.avatar_video_url||user.avatar_gif_url))return <ProfileMedia src={user.avatar_url} videoSrc={user.avatar_video_url} gifSrc={user.avatar_gif_url} active={active} style={style} className={"rounded-full "+className} onError={()=>setFailed(true)}/>;
 if(user.avatar_url&&!isHeadphones&&!failed)return <img src={user.avatar_url} alt="" onError={()=>setFailed(true)} style={{...style,objectFit:"cover"}} className={"rounded-full "+className}/>;
 if(!defaultFailed)return <span style={style} className={"pfp-boy rounded-full "+className} data-active={active?"true":"false"}><img className="pfp-boy-base" src="/avatars/default-headphones.webp" alt="" onError={()=>setDefaultFailed(true)}/><span className="pfp-boy-head-clear" aria-hidden="true"/><img className="pfp-boy-head" src="/avatars/default-headphones.webp" alt="" aria-hidden="true"/></span>;
 return <div style={{...style,fontSize:Math.max(11,size*.4)}} className={"rounded-full bg-foreground/10 grid place-items-center font-semibold text-foreground/70 shrink-0 "+className}>{name.trim().charAt(0)||"?"}</div>;
}
