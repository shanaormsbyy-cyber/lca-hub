import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const ROLE_ORDER = ['staff', 'manager', 'admin'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessRules, setAccessRules] = useState({}); // { section: min_role }

  const loadAccess = useCallback(() => {
    return api.get('/access').then(r => {
      const map = {};
      for (const { section, min_role } of r.data) map[section] = min_role;
      setAccessRules(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('lca_hub_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => { setUser(r.data); return loadAccess(); })
      .catch(() => localStorage.removeItem('lca_hub_token'))
      .finally(() => setLoading(false));
  }, [loadAccess]);

  const login = async (username, password) => {
    const r = await api.post('/auth/login', { username, password });
    localStorage.setItem('lca_hub_token', r.data.token);
    setUser(r.data.user);
    await loadAccess();
    return r.data.user;
  };

  const logout = () => {
    localStorage.removeItem('lca_hub_token');
    setUser(null);
    setAccessRules({});
  };

  const refreshUser = async () => {
    const r = await api.get('/auth/me');
    setUser(r.data);
  };

  // Returns true if the logged-in user can access the given section
  const canAccess = useCallback((section) => {
    if (!user) return false;
    const minRole = accessRules[section] ?? 'staff';
    return ROLE_ORDER.indexOf(user.role) >= ROLE_ORDER.indexOf(minRole);
  }, [user, accessRules]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin, isManager, canAccess, accessRules, loadAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
