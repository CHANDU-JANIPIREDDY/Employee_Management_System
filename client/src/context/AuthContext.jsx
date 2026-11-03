import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    authService.me()
      .then((body) => {
        if (active) setUser(body.data);
      })
      .catch(() => {
        localStorage.removeItem('token');
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(payload) {
      const body = await authService.login(payload);
      localStorage.setItem('token', body.data.token);
      setUser(body.data.user);
      return body.data.user;
    },
    async logout() {
      try {
        await authService.logout();
      } catch {
        // The local session is cleared even if the network call fails.
      }
      localStorage.removeItem('token');
      setUser(null);
    },
    async changePassword(payload) {
      const body = await authService.changePassword(payload);
      localStorage.setItem('token', body.data.token);
      setUser(body.data.user);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
