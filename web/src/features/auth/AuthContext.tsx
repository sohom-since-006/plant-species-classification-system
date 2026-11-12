import React, { useEffect, useState, useCallback, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ToastContext } from '@/components/ui/toastContext';
import { AuthContext, type AuthContextValue } from './authTypes';

const GUEST_KEY = 'plant_guest_mode_enabled';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(GUEST_KEY) === 'true';
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const toastCtx = useContext(ToastContext);
  const showToast = toastCtx?.showToast;

  useEffect(() => {
    // Handle auth callback redirect fragments (e.g. from email verification or error)
    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const errorDesc = params.get('error_description');
        const tokenType = params.get('type');

        if (errorDesc) {
          const cleanDesc = decodeURIComponent(errorDesc.replace(/\+/g, ' '));
          showToast?.(cleanDesc, 'error');
          // Clean the error fragment from the address bar
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else if (tokenType === 'signup' || tokenType === 'email_change') {
          showToast?.('Email verified successfully! Welcome to PlantAI.', 'success');
          setTimeout(() => {
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }, 600);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Load initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
      }
      setLoading(false);
    });

    // Listen to auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [showToast]);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase is not configured or in offline mode.' };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) {
      return { error: error.message };
    }
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
    return { error: null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, pass: string, displayName?: string) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: 'Supabase is not configured or in offline mode.' };
    }

    // Dynamically route email confirmation to the active deployment origin
    const emailRedirectTo =
      typeof window !== 'undefined' && window.location.origin
        ? `${window.location.origin}/`
        : undefined;

    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        emailRedirectTo,
        data: {
          name: displayName || email.split('@')[0],
        },
      },
    });
    if (error) {
      return { error: error.message };
    }
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setIsGuest(true);
    localStorage.setItem(GUEST_KEY, 'true');
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    localStorage.setItem(GUEST_KEY, 'true');
    setIsAuthModalOpen(false);
  }, []);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    isGuest,
    isConfigured: isSupabaseConfigured,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    continueAsGuest,
    openAuthModal,
    closeAuthModal,
    isAuthModalOpen,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
