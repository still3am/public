import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Navigate } from 'react-router-dom';
import { PlayerProvider } from '@/context/PlayerContext';
import { LibraryProvider } from '@/context/LibraryContext';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import Search from '@/pages/Search';
import TopCharts from '@/pages/TopCharts';
import RecentlyAdded from '@/pages/RecentlyAdded';
import Profile from '@/pages/Profile';
import TrackDetail from '@/pages/TrackDetail';
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
import Mixer from '@/pages/Mixer';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/top" element={<TopCharts />} />
          <Route path="/recent" element={<RecentlyAdded />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/track/:id" element={<TrackDetail />} />
          <Route path="/records/:id" element={<PublicRecords />} />
          <Route path="/records" element={<PublicRecordsIndex />} />
          <Route path="/artist" element={<ArtistByName />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/lounge/:code" element={<Lounge />} />
          <Route path="/library" element={<Library />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings/transitions" element={<SongTransitions />} />
          <Route path="/mixer" element={<Mixer />} />
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
          <PlayerProvider>
            <LibraryProvider>
              <AuthenticatedApp />
            </LibraryProvider>
          </PlayerProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App