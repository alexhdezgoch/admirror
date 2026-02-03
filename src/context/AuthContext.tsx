'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError, SupabaseClient, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshKey: number;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Check if Supabase is configured
const isSupabaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const client = createClient();
    console.log('AuthContext: Supabase client created:', !!client);
    if (!client) {
      console.error('AuthContext: Failed to create Supabase client');
      setLoading(false);
      return;
    }

    setSupabase(client);

    // Get initial session - use getUser() to validate token with server (reads cookies)
    // getSession() only reads from localStorage and misses new OAuth sessions
    const getInitialSession = async () => {
      console.log('AuthContext: Getting initial session...');
      const { data: { user }, error } = await client.auth.getUser();
      console.log('AuthContext: getUser result:', {
        hasUser: !!user,
        userEmail: user?.email,
        error: error?.message
      });
      if (user) {
        const { data: { session } } = await client.auth.getSession();
        setSession(session);
        setUser(user);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthContext: Auth state changed:', {
          event,
          hasSession: !!session,
          userEmail: session?.user?.email
        });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Refresh session when tab becomes visible again
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !client) return;

      try {
        const { data, error } = await client.auth.refreshSession();
        if (error) {
          console.warn('AuthContext: refreshSession failed, trying getSession:', error.message);
          const { data: fallback, error: fallbackError } = await client.auth.getSession();
          if (fallbackError || !fallback.session) {
            console.error('AuthContext: session recovery failed:', fallbackError?.message);
            setSession(null);
            setUser(null);
            return;
          }
          setSession(fallback.session);
          setUser(fallback.session.user);
        } else if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
        setRefreshKey(k => k + 1);
      } catch (err) {
        console.error('AuthContext: visibility handler error:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        refreshKey,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
