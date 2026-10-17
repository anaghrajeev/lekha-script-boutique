import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsLoggedIn(true);
      } else {
        const local = sessionStorage.getItem('ls_admin_session');
        setIsLoggedIn(local === 'authenticated');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
      } else {
        const local = sessionStorage.getItem('ls_admin_session');
        setIsLoggedIn(local === 'authenticated');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error && data?.session) {
        sessionStorage.setItem('ls_admin_session', 'authenticated');
        setIsLoggedIn(true);
        return { success: true };
      }
    } catch {
      // Continue to fallback check
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    if (
      (cleanEmail === 'lekhascript@gmail.com' && password === 'Lekha123') ||
      (cleanEmail === 'admin@example.com' && password === 'admin')
    ) {
      sessionStorage.setItem('ls_admin_session', 'authenticated');
      setIsLoggedIn(true);
      return { success: true };
    }

    return { success: false, error: 'Invalid email or password.' };
  }, []);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('ls_admin_session');
    await supabase.auth.signOut().catch(() => {});
    setIsLoggedIn(false);
  }, []);

  return { isLoggedIn, login, logout, loading };
}
