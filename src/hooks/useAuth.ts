import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut, getSession, onAuthStateChange } from '../services/supabaseService';

export type AuthStage = 'loading' | 'unauthenticated' | 'authenticated' | 'demo';

export function useAuth() {
  const [authStage, setAuthStage] = useState<AuthStage>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) { setAuthStage('demo'); return; }
    getSession().then(session => {
      if (session) { setUser(session.user); setAuthStage('authenticated'); }
      else { setAuthStage('unauthenticated'); }
    });
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session) { setUser(session.user); setAuthStage('authenticated'); }
      else { setUser(null); setAuthStage('unauthenticated'); }
    });
    return () => subscription.unsubscribe();
  }, []);

  return {
    authStage,
    user,
    handleGoogleLogin: () => signInWithGoogle(),
    handleDemo: () => setAuthStage('demo'),
    handleSignOut: () => { signOut(); setUser(null); setAuthStage('unauthenticated'); },
  };
}
