import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import {withReadTimeout} from "./readTimeout.js";
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
  const appVersion=useRef(0);
  const authVersion=useRef(0),account=useRef(null);account.current=user?.id||null;
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
    const request=++appVersion.current;
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
        const publicSettings = await withReadTimeout(appClient.get(`/prod/public-settings/by-id/${appParams.appId}`, {timeout:15000}));
        if(request!==appVersion.current)return;
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        // Check cookies as well as stored bearer tokens, including OAuth returns.
        await checkUserAuth();
        if(request!==appVersion.current)return;
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        if(request!==appVersion.current)return;
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
      if(request!==appVersion.current)return;
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
    const request=++authVersion.current,knownAccount=account.current;
    try {
      // Settings refreshes keep the current page mounted.
      if(!silent)setIsLoadingAuth(true);
      const currentUser = await withReadTimeout(base44.auth.me());
      if(request!==authVersion.current)return;
      if(!currentUser?.id)throw Error("Your account response was incomplete. Please retry.");
      if(currentUser?.is_blocked || currentUser?.disabled) { await clearPersonalData();if(request!==authVersion.current)return;setUser(null); setIsAuthenticated(false); setAuthError({type:'suspended',message:'Your account is suspended. Contact PUBLIC support.'}); setIsLoadingAuth(false); setAuthChecked(true); return; }
      let previous;try{previous=localStorage.getItem("public:active-account");}catch{}
      if(previous && previous!==currentUser.id)await clearPersonalData();
      await migrateLegacyOffline(currentUser.id,previous).catch(()=>{});
      if(request!==authVersion.current)return;
      setOfflineAccount(currentUser.id);
      try{localStorage.setItem("public:active-account",currentUser.id);}catch{}
      setUser(currentUser);
      setAuthError(null);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      if(request!==authVersion.current)return;
      setIsLoadingAuth(false);
      setAuthChecked(true);
      const status=error.status ?? error.response?.status;
      // An unavailable connection must not make an existing account look new.
      if (status === 401 || status === 403) {
        await clearPersonalData();
        if(request!==authVersion.current)return;
        setUser(null);
        setIsAuthenticated(false);
        setAuthError(null);
      } else if(knownAccount && account.current===knownAccount) {
        // A failed preference/profile refresh must not unmount every open page.
        setAuthError(null);
        if(!silent)window.dispatchEvent(new CustomEvent('public:error',{detail:{message:'Could not refresh your account. Your current session and saved data are unchanged.'}}));
      } else {
        setAuthError({type:'connection',message:'Could not reconnect to your account. Your data has not been reset.'});
      }
    }
  };

  useEffect(()=>{
    if(!authChecked)return;
    let stopped=false,busy=false;const uid=user?.id;
    const verify=async()=>{
      if(!isAuthenticated||!uid||stopped||busy)return;
      busy=true;const version=authVersion.current;
      const active=()=>!stopped&&version===authVersion.current&&account.current===uid;
      try{
        const current=await withReadTimeout(base44.auth.me());if(!active())return;
        if(current.id!==uid||current.is_blocked||current.disabled){
          await clearPersonalData();if(!active())return;
          setUser(null);setIsAuthenticated(false);
          setAuthError(current.id===uid?{type:'suspended',message:'Your account is suspended. Contact PUBLIC support.'}:null);
        }else{
          // Admin grants/revocations and profile preferences reach open sessions.
          setUser(previous=>previous?.id===uid?current:previous);
        }
      }catch(error){if(active()&&(error.status??error.response?.status)===401){await clearPersonalData();if(active()){setUser(null);setIsAuthenticated(false);setAuthError(null);}}}
      finally{busy=false;}
    };
    const timer=setInterval(verify,60000);window.addEventListener('focus',verify);window.addEventListener('online',verify);
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener('focus',verify);window.removeEventListener('online',verify);};
  },[authChecked,isAuthenticated,user?.id]);
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
    authVersion.current++;appVersion.current++;
    await clearPersonalData();
    setUser(null);
    setIsAuthenticated(false);setIsLoadingAuth(false);setAuthChecked(true);setAuthError(null);
    
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
