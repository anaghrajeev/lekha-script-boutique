import { useState, useCallback } from 'react';

const ADMIN_EMAIL    = 'lekhascript@gmail.com';
const ADMIN_PASSWORD = 'Lekha123';
const SESSION_KEY    = 'ls_admin_session';

const isSessionValid = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw === 'authenticated';
  } catch {
    return false;
  }
};

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(isSessionValid);

  const login = useCallback((email, password) => {
    if (
      email.trim().toLowerCase() === ADMIN_EMAIL &&
      password === ADMIN_PASSWORD
    ) {
      sessionStorage.setItem(SESSION_KEY, 'authenticated');
      setIsLoggedIn(true);
      return { success: true };
    }
    return { success: false, error: 'Invalid email or password.' };
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsLoggedIn(false);
  }, []);

  return { isLoggedIn, login, logout };
}
