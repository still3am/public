import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {syncPendingLikes} from "@/lib/likeActions";
import {clearPersonalData} from '@/lib/clearPersonalData';
import {setOfflineAccount,migrateLegacyOffline} from '@/lib/offlineCache';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

/** @type {import("react").Context<any>} */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        // Check cookies as well as stored bearer tokens, including OAuth returns.
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async ({ silent = false } = {}) => {
    try {
      // Settings refreshes keep the current page mounted.
      if(!silent)setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      if(currentUser?.is_blocked || currentUser?.disabled) { await clearPersonalData();setUser(null); setIsAuthenticated(false); setAuthError({type:'suspended',message:'Your account is suspended. Contact PUBLIC support.'}); setIsLoadingAuth(false); setAuthChecked(true); return; }
      let previous;try{previous=localStorage.getItem("public:active-account");}catch{}
      if(previous && previous!==currentUser.id)await clearPersonalData();
      await migrateLegacyOffline(currentUser.id,previous).catch(()=>{});
      setOfflineAccount(currentUser.id);
      try{localStorage.setItem("public:active-account",currentUser.id);}catch{}
      setUser(currentUser);
      setAuthError(null);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      const status=error.status ?? error.response?.status;
      // An unavailable connection must not make an existing account look new.
      if (status === 401 || status === 403) {
        await clearPersonalData();
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      } else {
        setAuthError({type:'connection',message:'Could not reconnect to your account. Your data has not been reset.'});
      }
    }
  };

  useEffect(()=>{
    if(!authChecked)return;
    const verify=async()=>{if(!isAuthenticated)return;try{const current=await base44.auth.me();if(current.is_blocked||current.disabled){await clearPersonalData();setUser(null);setIsAuthenticated(false);setAuthError({type:'suspended',message:'Your account is suspended. Contact PUBLIC support.'});}}catch(error){if(error.status===401){await clearPersonalData();setUser(null);setIsAuthenticated(false);setAuthError(null);}}};
    const timer=setInterval(verify,60000);window.addEventListener('focus',verify);
    return()=>{clearInterval(timer);window.removeEventListener('focus',verify);};
  },[authChecked,isAuthenticated]);
  useEffect(()=>{window.dispatchEvent(new Event("catalog:invalidate"));},[user?.id,user?.show_explicit,user?.adult_confirmed]);

  useEffect(() => {
    if (!user?.id || (user.public_follow_initialized && user.public_follower_initialized)) return;
    let stopped = false, timer, attempts = 0, busy = false, complete = false;
    const initialize = async () => {
      if (stopped || busy || complete) return;
      busy = true;
      try {
        const actions = [!user.public_follow_initialized && "initializePublicFollow", !user.public_follower_initialized && "initializePublicFollower"].filter(Boolean);
        const responses = await Promise.all(actions.map(action => base44.functions.invoke("securityGateway", {entity:"User",action,args:[]})));
        if (responses.some(response => response?.data?.result?.initialized !== true)) throw Error("Follow enrollment was not confirmed");
        complete = true;
        if (!stopped && responses.some(response => response.data.result.changed)) window.dispatchEvent(new Event("follows:changed"));
      } catch {
        if (!stopped && ++attempts < 3) timer = setTimeout(initialize, attempts * 5000);
      } finally {busy = false;}
    };
    initialize();
    window.addEventListener("online", initialize);
    return () => {stopped = true;clearTimeout(timer);window.removeEventListener("online", initialize);};
  }, [user?.id, user?.public_follow_initialized, user?.public_follower_initialized]);

  useEffect(()=>{
    if(!user?.id)return;
    let running=false,stopped=false;
    const sync=async()=>{if(running||stopped)return;running=true;try{await syncPendingLikes(base44,user.id);}catch{}finally{running=false;}};
    sync();window.addEventListener("online",sync);window.addEventListener("focus",sync);
    return()=>{stopped=true;window.removeEventListener("online",sync);window.removeEventListener("focus",sync);};
  },[user?.id]);

  const logout = async (shouldRedirect = true) => {
    await clearPersonalData();
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
