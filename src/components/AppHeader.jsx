import { Link, useLocation } from 'react-router-dom';
import { Bell, Search, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Logo from '@/components/Logo';
const groups = { '/': 'Discover', '/search': 'Explore', '/library': 'Your collection', '/profile': 'Your profile' };
export default function AppHeader() {
  const { pathname } = useLocation(),{ user } = useAuth();
  return <header className="app-header">







  </header>;
}