import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { router, useSegments } from 'expo-router';
import { Platform } from 'react-native';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();

  useEffect(() => {
    console.log('🔍 AuthContext: Initializing...');
    
    const initializeAuth = async () => {
      try {
        // For web, first check if there's a session in the URL
        if (Platform.OS === 'web') {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.log('🔍 AuthContext: Error getting session from URL:', error);
          } else if (data?.session) {
            console.log('🔍 AuthContext: Session found in URL');
            setSession(data.session);
            setUser(data.session.user);
            setLoading(false);
            return;
          }
        }

        // Fallback to regular session check
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 AuthContext: Initial session check');
        console.log('Session:', session ? `✅ Found (${session.user?.email})` : '❌ None');
        console.log('Error:', error);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('🔍 AuthContext: Error during initialization:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 AuthContext: Auth state changed');
      console.log('Event:', event);
      console.log('Session:', session ? `✅ Present (${session.user?.email})` : '❌ None');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('🧹 AuthContext: Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  // Handle automatic redirects based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isCallbackRoute = segments.includes('callback');

    if (session && !user) {
      // Session exists but user is null, wait for user to be set
      return;
    }

    // Don't redirect if we're currently on the callback route
    if (isCallbackRoute) {
      console.log('🔄 On callback route, skipping auto-redirect');
      return;
    }

    if (!session && !inAuthGroup) {
      // User is not signed in and not in auth group, redirect to sign in
      console.log('🔄 Redirecting to auth (user signed out)');
      router.replace('/(auth)/signin');
    } else if (session && inAuthGroup && !isCallbackRoute) {
      // User is signed in but still in auth group (and not on callback), redirect to main app
      console.log('🔄 Redirecting to tabs (user signed in)');
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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