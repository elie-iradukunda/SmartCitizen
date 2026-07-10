import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

const allowedRoles = ['citizen', 'staff', 'admin'];

const loadStoredUser = () => {
  const saved = localStorage.getItem('smartCitizenUser');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return allowedRoles.includes(parsed.role) ? parsed : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadStoredUser);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('smartCitizenToken', data.token);
    localStorage.setItem('smartCitizenUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('smartCitizenToken', data.token);
    localStorage.setItem('smartCitizenUser', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const updateUser = (updated) => {
    localStorage.setItem('smartCitizenUser', JSON.stringify(updated));
    setUser(updated);
  };

  const logout = () => {
    localStorage.removeItem('smartCitizenToken');
    localStorage.removeItem('smartCitizenUser');
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, register, logout, updateUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
