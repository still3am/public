import {Link} from "react-router-dom";
import OverflowText from "./OverflowText";
// Every artist stays linked. Long credits scroll rather than hiding names behind +N.
export default function ArtistLinks({artist,className="",linkClassName=""}){
 if(!artist)return null;
 const tokens=String(artist).split(/(\s*(?:,|&| feat\.| ft\.| x |;)\s*)/i).map(t=>t.trim()).filter(Boolean);
 const out=[];
 tokens.forEach((token,index)=>{
  if(index%2===0)out.push(<Link key={index} to={"/artist?name="+encodeURIComponent(token)} className={linkClassName||className}>{token}</Link>);
  else out.push(<span key={index}>{token===","||token===";"?token+" ":" "+token+" "}</span>);
 });
 return <OverflowText text={String(artist)} className={"artist-credits "+className}>{out}</OverflowText>;
}
