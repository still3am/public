import {Link} from 'react-router-dom';
import {ArrowUp} from 'lucide-react';
import publicWordmark from '@/assets/public-wordmark.svg';
import './public-footer.css';

export default function PublicFooter() {
 function backToTop() {
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
  document.getElementById('main-content')?.focus({preventScroll:true});
 }
 return <footer className="public-site-footer" aria-label="PUBLIC footer">
  <div className="public-site-footer-top"><p className="public-site-footer-note">They made music a subscription.<br/><strong>We made it PUBLIC.</strong></p><button type="button" className="public-site-footer-top-button" onClick={backToTop} aria-label="Back to top"><span>Back to top</span><ArrowUp size={17}/></button></div>
  <div className="public-site-footer-main">
   <nav className="public-site-footer-links" aria-label="Information and support">
    <Link to="/terms">Terms &amp; community</Link>
    <Link to="/privacy">Privacy policy</Link>
    <Link to="/support">Help &amp; support</Link>
   </nav>
   <p className="public-site-footer-copyright">© {new Date().getFullYear()} PUBLIC.<span>Music. People. Connection.</span></p>
  </div>
  <Link className="public-site-footer-brand" to="/" aria-label="PUBLIC home"><img src={publicWordmark} width={620} height={130} alt="PUBLIC." className="logo-dark-invert" loading="lazy" draggable={false}/></Link>
 </footer>;
}
