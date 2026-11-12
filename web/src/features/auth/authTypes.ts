import { createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/lib/supabase';

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const defaultGuestContext: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
  isGuest: true,
  isConfigured: isSupabaseConfigured,
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signOut: async () => {},
  continueAsGuest: () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
};

export function useSession(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    return defaultGuestContext;
  }
  return context;
}
