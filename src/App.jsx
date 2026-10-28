import {useEffect} from "react";
import MusicRequests from '@/pages/MusicRequests';
import MusicRequestSync from '@/components/MusicRequestSync';
import ArtistRegistration from '@/pages/ArtistRegistration';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { PlayerProvider } from '@/context/PlayerContext';
import { LibraryProvider } from '@/context/LibraryContext';
import { UploadProvider } from '@/context/UploadContext';
import { LoungeHostProvider } from '@/hooks/useLoungeHost';
import Layout from '@/components/Layout';
import DialogFocusManager from '@/components/DialogFocusManager';
import GlobalStatus from '@/components/GlobalStatus';
import OfflineSyncManager from '@/components/OfflineSyncManager';
import Support from '@/pages/Support';
import Policies from '@/pages/Policies';
import ErrorBoundary from '@/components/ErrorBoundary';
import {SafetyProvider} from '@/context/SafetyContext';
import OAuthConsent from '@/pages/OAuthConsent';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import CommunityPreview from '@/pages/CommunityPreview';
import Moments from '@/pages/Moments';
import PersonalMix from '@/pages/PersonalMix';
import RecapPlaylist from '@/pages/RecapPlaylist';
import Search from '@/pages/Search';
import TopCharts from '@/pages/TopCharts';
import RecentlyAdded from '@/pages/RecentlyAdded';
import Profile from '@/pages/Profile';
import TrackDetail from '@/pages/TrackDetail';
import AlbumDetail from '@/pages/AlbumDetail';
import PublicRecords from '@/pages/PublicRecords';
import PublicRecordsIndex from '@/pages/PublicRecordsIndex';
import ArtistByName from '@/pages/ArtistByName';
import Suggestions from '@/pages/Suggestions';
import Upload from '@/pages/Upload';
import Lounge from '@/pages/Lounge';
import Library from '@/pages/Library';
import Downloads from '@/pages/Downloads';
import Admin from '@/pages/Admin';
import SongTransitions from '@/pages/SongTransitions';
import Notifications from '@/pages/Notifications';
import ArtistDashboard from '@/pages/ArtistDashboard';
import PlaylistDetail from '@/pages/PlaylistDetail';
import MyUploads from '@/pages/MyUploads';
import UnfinishedUploads from '@/pages/UnfinishedUploads';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, checkAppState } = useAuth();

  useEffect(()=>{if(authError?.type==="auth_required")navigateToLogin();},[authError?.type,navigateToLogin]);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if(['connection','unknown'].includes(authError.type))return <div className="p-8 text-center space-y-4"><p>{authError.message}</p><button className="underline" onClick={checkAppState}>Retry connection</button></div>;
    if(authError.type==='suspended' && !['/support','/privacy','/terms','/login'].includes(window.location.pathname)) return <div className="p-8 text-center space-y-4"><p>{authError.message}</p><a className="underline" href="/support">Contact support</a><button className="block mx-auto underline" onClick={()=>window.location.href='/login'}>Return to login</button></div>;
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/oauth-consent" element={<OAuthConsent />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* A single layout for every screen, so the mobile tabs stay mounted when
          moving between public and personal sections */}
      <Route element={<Layout />}>
        {/* Public browsing — no login required */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/community-preview" element={<CommunityPreview />} />
        <Route path="/moments" element={<Moments />} />
        <Route path="/moments/:id" element={<Moments />} />
        <Route path="/top" element={<TopCharts />} />
        <Route path="/recent" element={<RecentlyAdded />} />
        <Route path="/track/:id" element={<TrackDetail />} />
        <Route path="/album/:key" element={<AlbumDetail />} />
        <Route path="/records/:id" element={<PublicRecords />} />
        <Route path="/records" element={<PublicRecordsIndex />} />
        <Route path="/artist" element={<ArtistByName />} />
        <Route path="/support" element={<Support />} />
        <Route path="/privacy" element={<Policies />} />
        <Route path="/terms" element={<Policies />} />
        <Route path="/playlist/:id" element={<PlaylistDetail />} />
        <Route path="/suggestions" element={<Suggestions />} />

        {/* Personal features — login required */}
        <Route element={<ProtectedRoute />}>
          <Route path="/mix/:id" element={<PersonalMix />} />
          <Route path="/recap/:period/:value?" element={<RecapPlaylist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/music-requests" element={<MusicRequests />} />
          <Route path="/artist-registration" element={<ArtistRegistration />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/upload/review" element={<Upload />} />
          <Route path="/upload/publish" element={<Upload />} />
          <Route path="/lounge/:code" element={<Lounge />} />
          <Route path="/library" element={<Library />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings/transitions" element={<SongTransitions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/artist-dashboard" element={<ArtistDashboard />} />
          <Route path="/my-uploads" element={<MyUploads />} />
          <Route path="/unfinished-uploads" element={<UnfinishedUploads />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ErrorBoundary><GlobalStatus/><DialogFocusManager/><SafetyProvider><PlayerProvider><OfflineSyncManager/><MusicRequestSync/>
            <LibraryProvider>
              <UploadProvider>
                <LoungeHostProvider><AuthenticatedApp /></LoungeHostProvider>
              </UploadProvider>
            </LibraryProvider>
          </PlayerProvider></SafetyProvider></ErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App