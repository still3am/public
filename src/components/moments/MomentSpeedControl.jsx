import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gauge } from 'lucide-react';
import { PHOTO_SPEEDS, setPhotoSpeed, setPhotoSpeedMenuOpen, useMomentSwipePreferences } from './momentSwipePreferences';

export default function MomentSpeedControl() {
  const [header, setHeader] = useState(null);
  const detail = useRef(null);
  const { speed } = useMomentSwipePreferences();
  useEffect(() => {
    const root = document.querySelector('.moments-route');
    if (!root) return;
    const findHeader = () => setHeader(root.querySelector('.reels-header'));
    const observer = new MutationObserver(findHeader);
    findHeader();
    observer.observe(root, { subtree: true, childList: true });
    function closeOutside(event) {
      if (detail.current?.open && !detail.current.contains(event.target)) detail.current.open = false;
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', closeOutside);
      setPhotoSpeedMenuOpen(false);
    };
  }, []);
  function close() {
    if (!detail.current) return;
    detail.current.open = false;
    detail.current.querySelector('summary')?.focus();
  }
  return header ? createPortal(
    <details ref={detail} className="moment-speed-control" onToggle={(event) => setPhotoSpeedMenuOpen(event.currentTarget.open)} onKeyDown={(event) => {
      if (event.key === 'Escape' && detail.current?.open) { event.stopPropagation(); close(); }
    }}>
      <summary aria-label="Photo autoplay speed" title="Photo autoplay speed"><Gauge size={19} /></summary>
      <fieldset>
        <legend>Photo autoplay</legend>
        {PHOTO_SPEEDS.map((option) => <label key={option.id}>
          <input type="radio" name="moment-photo-speed" value={option.id} checked={speed === option.id} onChange={() => setPhotoSpeed(option.id)} />
          <span>{option.label}</span><small>{option.delay ? option.delay / 1000 + ' sec' : 'Manual swipe'}</small>
        </label>)}
      </fieldset>
    </details>, header) : null;
}
