import {Link} from 'react-router-dom';
import Logo from '@/components/Logo';
import './public-footer.css';

export default function PublicFooter() {
 return <footer className="public-site-footer" aria-label="PUBLIC footer">
  <p className="public-site-footer-note">They made music a subscription. We made it PUBLIC.</p>
  <div className="public-site-footer-main">
   <Link className="public-site-footer-brand" to="/" aria-label="PUBLIC home"><Logo width={300}/></Link>
   <nav className="public-site-footer-links" aria-label="Information and support">
    <Link to="/terms">Terms &amp; community</Link>
    <Link to="/privacy">Privacy policy</Link>
    <Link to="/support">Help &amp; support</Link>
   </nav>
   <p className="public-site-footer-copyright">© {new Date().getFullYear()} PUBLIC.<span>Music. People. Connection.</span></p>
  </div>
 </footer>;
}
