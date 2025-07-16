import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useReferralTracking } from '@/hooks/useReferralTracking';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, referralCode?: string) => Promise<{ error: any; user?: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { processReferralSignup } = useReferralTracking();

  useEffect(() => {
    const cleanupAuthState = () => {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          try {
            const value = localStorage.getItem(key);
            if (value && value.includes('refresh_token')) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      });
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed, clean up invalid tokens
          cleanupAuthState();
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error && error.message.includes('refresh_token')) {
        console.log('Cleaning up invalid session tokens');
        cleanupAuthState();
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch((error) => {
      console.error('Session error:', error);
      cleanupAuthState();
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, referralCode?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || email
        }
      }
    });
    
    // Process referral if user signed up successfully and referral code provided
    if (data?.user && !error && referralCode) {
      setTimeout(async () => {
        try {
          await processReferralSignup(data.user.id, referralCode);
          console.log('Referral processed for user:', data.user.id, 'with code:', referralCode);
        } catch (err) {
          console.error('Error processing referral:', err);
        }
      }, 2000); // Wait a bit longer for user creation to complete
    }
    
    // Track signup in analytics (will be tracked when user logs in)
    if (data?.user && !error) {
      // The analytics tracking will happen in the auth state change listener
      setTimeout(() => {
        // Track signup event after auth state settles
        const event = new CustomEvent('user-signup', { detail: { method: 'email' } });
        window.dispatchEvent(event);
      }, 1000);
    }
    
    return { error, user: data?.user };
  };

  const signIn = async (email: string, password: string) => {
    // Clean up existing state first
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      // Continue even if this fails
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      // Force page reload for clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};