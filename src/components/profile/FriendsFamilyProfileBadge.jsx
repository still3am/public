import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import ProfileBadge from './AdminProfileBadge';

export default function FriendsFamilyProfileBadge() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const id = pathname.match(/^\/profile\/([a-zA-Z0-9_-]+)\/?$/)?.[1] || user?.id;
  const [enabled, setEnabled] = useState(false);
  const [host, setHost] = useState(null);

  useEffect(() => {
    let current = true;
    let version = 0;
    async function load() {
      const request = ++version;
      try {
        const result = await base44.entities.PublicProfile.filter({ user_id: id, visible: true }, '-updated_date', 1);
        const profile = (Array.isArray(result) ? result : result?.items || [])[0];
        if (current && request === version) setEnabled(profile ? profile.friends_family_badge === true && profile.is_public_admin !== true : id === user?.id && user?.role !== 'admin' && user?.friends_family_badge === true);
      } catch {
        if (current && request === version) setEnabled(id === user?.id && user?.role !== 'admin' && user?.friends_family_badge === true);
      }
    }
    if (!id) return;
    load();
    window.addEventListener('profiles:changed', load);
    return () => { current = false; window.removeEventListener('profiles:changed', load); };
  }, [id, user?.id, user?.role, user?.friends_family_badge]);

  useEffect(() => {
    if (!enabled) return;
    function findHero() {
      const stage = document.querySelector('[data-page="profile"]:not(.hidden) .profile-cover-stage');
      setHost(stage?.parentElement ?? null);
    }
    findHero();
    const container = document.getElementById('main-content');
    if (!container) return;
    const observer = new MutationObserver(findHero);
    observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [enabled, pathname]);

  return enabled && host ? createPortal(<ProfileBadge variant="friends_family" />, host) : null;
}
