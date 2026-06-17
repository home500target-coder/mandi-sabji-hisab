import React, { createContext, useState, useEffect, useContext } from 'react';
import { db } from '../db/localDb';

const AuthContext = createContext();

// Express API URL loaded from environment variable with local fallback
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineView, setIsOfflineView] = useState(false);

  // Monitor network online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsOfflineView(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch logged in profile details
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Failed to sync auth token with server:', error);
        // Fallback to cache if offline
        if (!navigator.onLine && token) {
          setIsOfflineView(true);
          const cachedUser = localStorage.getItem('cachedUser');
          if (cachedUser) {
            setUser(JSON.parse(cachedUser));
          }
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        const userProfile = {
          username: data.username,
          farmerName: data.farmerName,
          villageName: data.villageName,
          phone: data.phone
        };
        setUser(userProfile);
        localStorage.setItem('cachedUser', JSON.stringify(userProfile));
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (err) {
      return { success: false, message: 'Could not connect to the server.' };
    }
  };

  const register = async (username, password, farmerName, villageName, phone) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, farmerName, villageName, phone })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        const userProfile = {
          username: data.username,
          farmerName: data.farmerName,
          villageName: data.villageName,
          phone: data.phone
        };
        setUser(userProfile);
        localStorage.setItem('cachedUser', JSON.stringify(userProfile));
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err) {
      return { success: false, message: 'Could not connect to the server.' };
    }
  };

  const logout = async () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('cachedUser');
    // Wipe local cache database
    try {
      await db.brokers.clear();
      await db.consignments.clear();
      await db.payments.clear();
    } catch (e) {
      console.error('IndexedDB clear failure:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isOnline, isOfflineView, setIsOfflineView, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
