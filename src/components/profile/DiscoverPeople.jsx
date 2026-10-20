import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {Loader2,UserCheck,RefreshCw,ArrowRight} from "lucide-react";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";
import {useSafety} from "@/context/SafetyContext";
import {readAllPages} from "@/lib/readPages";
import {setFollowState,followError} from "@/lib/followActions";
import Avatar from "@/components/Avatar";
import {rankDiscoverPeople} from "@/lib/discoverPeople";
import "./discover-people.css";

/** Public suggestions only; follow changes use the same authorized path as profiles. */
export default function DiscoverPeople({profileId,active=true}){
 const {user}=useAuth(),{blocked}=useSafety();
 const uid=user?.id||"",scope=uid+":"+profileId;
 const current=useRef(scope);current.current=scope;
 const locks=useRef(new Set());
 const mounted=useRef(false);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
 const [retry,setRetry]=useState(0),[limit,setLimit]=useState(5);
 const [state,setState]=useState({scope:"",people:[],loading:true,error:false});
 const [changes,setChanges]=useState({scope:"",following:{},busy:{},errors:{}});
 useEffect(()=>{
  if(!active)return;
  let cancelled=false;
  setLimit(5);setState(old=>({scope,people:old.scope===scope?old.people:[],loading:true,error:false}));
  setChanges(old=>old.scope===scope?old:{scope,following:{},busy:{},errors:{}});
  (async()=>{
   try{
    const [page,follows]=await Promise.all([
     base44.entities.PublicProfile.filter({visible:true},{sort:"-updated_date",limit:80,fields:["user_id","display_name","full_name","username","avatar_url","bio","is_artist","top_track_ids","featured_track_id"]}),
     uid?readAllPages(options=>base44.entities.Follow.filter({follower_id:uid},{sort:"-created_date",...options})):Promise.resolve([])
    ]);
    const profiles=Array.isArray(page)?page:page?.items;
    if(!Array.isArray(profiles))throw Error("Invalid public profiles");
    const followed=new Set(follows.map(row=>row.following_id)),seen=new Set();
    const people=profiles.filter(person=>{
     const id=person.user_id;
     if(!id||id===uid||id===profileId||person.visible===false||blocked.has(id)||followed.has(id)||seen.has(id))return false;
     seen.add(id);return true;
    }).map(person=>({...person,id:person.user_id}));
    if(!cancelled)setState({scope,people,loading:false,error:false});
   }catch{if(!cancelled)setState(old=>({...old,scope,loading:false,error:true}));}
  })();
  return ()=>{cancelled=true;};
 },[scope,uid,profileId,active,retry,blocked]);
 async function follow(person){
  const key=scope+":"+person.id;
  if(!uid||locks.current.has(key))return;
  locks.current.add(key);
  const desired=!(changes.scope===scope&&changes.following[person.id]);
  setChanges(old=>({...old,scope,busy:{...old.busy,[person.id]:true},errors:{...old.errors,[person.id]:""}}));
  try{
   const result=await setFollowState(base44,uid,person.id,desired);
   if(mounted.current&&current.current===scope)setChanges(old=>({...old,following:{...old.following,[person.id]:result.following}}));
  }catch(error){
   if(mounted.current&&current.current===scope)setChanges(old=>({...old,errors:{...old.errors,[person.id]:followError(error)}}));
  }finally{
   locks.current.delete(key);
   if(mounted.current&&current.current===scope)setChanges(old=>({...old,busy:{...old.busy,[person.id]:false}}));
  }
 }
 const ready=state.scope===scope,people=ready?rankDiscoverPeople(state.people.filter(p=>!blocked.has(p.id)),user):[];
 const local=changes.scope===scope?changes:{following:{},busy:{},errors:{}};
 return <section className="profile-discover" aria-label="Discover people">
  <header><div><span className="profile-discover-eyebrow">BETTER TOGETHER</span><h2>Discover People</h2><p>A shared song. A new connection.</p></div><button type="button" className="profile-discover-refresh" aria-label="Refresh people" title="Refresh suggestions" disabled={state.loading||Object.values(local.busy).some(Boolean)} onClick={()=>setRetry(n=>n+1)}><RefreshCw size={17} className={state.loading?"animate-spin":""}/></button></header>
  {state.error&&people.length>0&&<div className="profile-discover-status" role="status">Couldn’t refresh suggestions. Your current list is still here.</div>}
  {(!ready||state.loading&&!people.length)?<div className="profile-discover-loading" role="status" aria-label="Finding listeners">{[1,2,3].map(n=><div key={n}><i/><span><i/><i/></span></div>)}</div>:
   state.error&&!people.length?<div className="profile-discover-status"><p>Couldn’t load people.</p><button type="button" onClick={()=>setRetry(n=>n+1)}>Try again</button></div>:
   !people.length?<div className="profile-discover-status"><p>You’re all caught up. Check back for new people.</p></div>:
   <ul>{people.slice(0,limit).map(person=>{
    const name=person.display_name||person.full_name||person.username||"PUBLIC listener";
    const following=!!local.following[person.id],busy=!!local.busy[person.id];
    return <li key={person.id} className={following?"is-following":""}><div className="profile-discover-row">
     <Link to={"/profile/"+encodeURIComponent(person.id)} className="profile-discover-person"><Avatar user={person} size={48}/><span><strong title={name}>{name}</strong><small className={person.shared?"is-shared":""}>{person.reason}</small></span></Link>
     {uid&&<button type="button" className="profile-discover-follow" aria-label={(following?"Unfollow ":"Follow ")+name} aria-pressed={following} disabled={busy||state.loading} onClick={()=>follow(person)}>{busy?<Loader2 size={16} className="animate-spin"/>:following?<UserCheck size={15}/>:null}<span>{busy?"Saving":following?"Following":"Follow"}</span></button>}
    </div>{local.errors[person.id]&&<p className="profile-discover-error" role="alert">{local.errors[person.id]}</p>}</li>;
   })}</ul>}
  <p className="sr-only" role="status" aria-live="polite">{Object.values(local.following).filter(Boolean).length?Object.values(local.following).filter(Boolean).length+" new people followed.":""}</p>
  {people.length>limit&&<button type="button" className="profile-discover-more" onClick={()=>setLimit(n=>n+5)}>Show more people <ArrowRight size={15}/></button>}
 </section>;
}