import {Link,useLocation,useNavigate} from 'react-router-dom';
import {ArrowLeft,Home,Search} from 'lucide-react';
import Logo from '@/components/Logo';
export default function PageNotFound(){
 const location=useLocation(),navigate=useNavigate();
 return <main className="min-h-dvh grid place-items-center px-5 py-12 bg-background text-foreground"><section className="w-full max-w-lg text-center rounded-3xl bg-card border p-6 sm:p-10"><div className="flex justify-center mb-8"><Logo width="160px"/></div><p className="eyebrow">404</p><h1 className="text-3xl sm:text-4xl font-bold tracking-tight mt-3">This page isn’t here</h1><p className="text-sm text-muted-foreground leading-relaxed mt-4">The link may have moved or been removed.</p><p className="text-xs text-muted-foreground break-all mt-2 selectable-content">{location.pathname}</p><div className="flex flex-wrap items-center justify-center gap-3 mt-7"><Link className="chrome-button" to="/"><Home size={16}/>Home</Link><Link className="playlist-action" to="/search"><Search size={16}/>Find music</Link></div>{window.history.state?.idx>0&&<button className="inline-flex items-center gap-2 text-sm text-muted-foreground mt-6" onClick={()=>navigate(-1)}><ArrowLeft size={15}/>Go back</button>}</section></main>;
}
