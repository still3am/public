import {Link} from "react-router-dom";
import {Radio,ArrowUpRight} from "lucide-react";
export default function RadioPromo(){
 return <Link to="/radio" className="radio-promo"><div className="radio-promo-icon"><Radio size={27}/></div><div className="min-w-0"><p className="eyebrow">PUBLIC. Radio</p><h3>Press play. Discover together.</h3><p>One station, playing through the day.</p></div><ArrowUpRight size={22} className="shrink-0 ml-auto"/></Link>;
}
