import {Link,useLocation} from 'react-router-dom';
import {Bell,Search,ArrowUpRight} from 'lucide-react';
import {useAuth} from '@/lib/AuthContext';
import Logo from '@/components/Logo';
const groups={'/':'Discover','/search':'Explore','/library':'Your collection','/profile':'Your profile'};
export default function AppHeader(){
 const {pathname}=useLocation(),{user}=useAuth();
 return <header className="app-header"><div className="app-header-inner">
  <Link to="/" aria-label="PUBLIC home" className="md:hidden"><Logo width="112px"/></Link>
  <div className="hidden md:flex items-center gap-3 text-xs font-medium text-muted-foreground"><span className="tracking-[0.18em] uppercase">PUBLIC</span><span className="opacity-40">/</span><span>{groups[pathname]||'Music & community'}</span></div>
  <div className="flex items-center gap-2 ml-auto">
   <Link to="/search" className="header-icon" aria-label="Search music"><Search size={18}/></Link>
   <Link to={user?'/notifications':'/login'} className="header-icon" aria-label={user?'Notifications':'Sign in'}><Bell size={18}/></Link>
   <Link to="/upload" className="hidden md:inline-flex items-center gap-2 chrome-button text-xs">Upload music<ArrowUpRight size={14}/></Link>
  </div>
 </div></header>;
}
