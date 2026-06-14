import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { parseSupabaseAuthRedirect } from '../utils/authRedirect';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  pendingInviteToken: string | null;
  loading: boolean;
  recoveryLoading: boolean;
  recoveryError: string | null;
  isRecoverySession: boolean;
  clearRecoveryError: () => void;
  clearPendingInviteToken: () => Promise<void>;
  storePendingInviteToken: (token: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PENDING_INVITE_TOKEN_KEY = 'pawcult.pendingInviteToken';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const handleAuthRedirect = async (url: string | null) => {
      if (!url) {
        return;
      }

      const {
        accessToken,
        errorCode,
        errorDescription,
        refreshToken,
        type,
      } = parseSupabaseAuthRedirect(url);

      if (type !== 'recovery' && !accessToken && !refreshToken && !errorCode) {
        return;
      }

      if (!isMounted) {
        return;
      }

      setRecoveryLoading(true);
      setRecoveryError(null);

      try {
        if (errorCode) {
          throw new Error(errorDescription ?? errorCode);
        }

        if (!accessToken || !refreshToken) {
          throw new Error('This password reset link is invalid or incomplete.');
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setIsRecoverySession(type === 'recovery');
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to validate the password reset link.';

        setRecoveryError(message);
        setIsRecoverySession(false);
      } finally {
        if (isMounted) {
          setRecoveryLoading(false);
        }
      }
    };

    const initializeAuth = async () => {
      try {
        const [sessionResult, initialUrl, storedInviteToken] = await Promise.all([
          supabase.auth.getSession(),
          Linking.getInitialURL(),
          SecureStore.getItemAsync(PENDING_INVITE_TOKEN_KEY),
        ]);

        const { data, error } = sessionResult;

        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setPendingInviteToken(storedInviteToken);
        await handleAuthRedirect(initialUrl);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (!nextSession) {
        setIsRecoverySession(false);
      }
    });

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthRedirect(url);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      pendingInviteToken,
      loading,
      recoveryLoading,
      recoveryError,
      isRecoverySession,
      clearRecoveryError: () => setRecoveryError(null),
      clearPendingInviteToken: async () => {
        await SecureStore.deleteItemAsync(PENDING_INVITE_TOKEN_KEY);
        setPendingInviteToken(null);
      },
      storePendingInviteToken: async (token: string) => {
        await SecureStore.setItemAsync(PENDING_INVITE_TOKEN_KEY, token);
        setPendingInviteToken(token);
      },
      signIn: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      },
      signUp: async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        setSession(null);
        setUser(null);
        setIsRecoverySession(false);
      },
    }),
    [
      isRecoverySession,
      loading,
      pendingInviteToken,
      recoveryError,
      recoveryLoading,
      session,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
