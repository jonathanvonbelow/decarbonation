import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signInWithGoogle, signOut, getSession, onAuthStateChange } from '../services/supabaseService';

export type AuthStage = 'loading' | 'unauthenticated' | 'authenticated' | 'demo';

export function useAuth() {
  const [authStage, setAuthStage] = useState<AuthStage>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Si no hay credenciales de Supabase, entrar en modo demo directamente
    if (!supabase) {
      setAuthStage('demo');
      return;
    }

    // Chequear sesión existente al montar
    getSession().then(session => {
      if (session) {
        setUser(session.user);
        setAuthStage('authenticated');
      } else {
        setAuthStage('unauthenticated');
      }
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        setAuthStage('authenticated');
      } else {
        setAuthStage(prev => prev !== 'demo' ? 'unauthenticated' : 'demo');
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = () => signInWithGoogle();

  const handleDemo = () => setAuthStage('demo');

  const handleSignOut = () => {
    signOut();
    setAuthStage('unauthenticated');
    setUser(null);
  };

  return { authStage, user, handleGoogleLogin, handleDemo, handleSignOut };
}
