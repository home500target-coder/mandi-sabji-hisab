import React, { createContext, useState, useEffect, useContext } from 'react';
import { db, initDbForUser } from '../db/localDb';

const AuthContext = createContext();

// Express API URL loaded from environment variable with local fallback
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isOfflineView, setIsOfflineView] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState(() => {
    try {
      const saved = localStorage.getItem('savedAccounts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse savedAccounts:', e);
      return [];
    }
  });

  const saveAccount = (account) => {
    setSavedAccounts(prev => {
      const filtered = prev.filter(acc => acc.username.toLowerCase() !== account.username.toLowerCase());
      const updated = [account, ...filtered];
      localStorage.setItem('savedAccounts', JSON.stringify(updated));
      return updated;
    });
  };

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
          // Sync savedAccounts info if it's there
          setSavedAccounts(prev => {
            const updated = prev.map(acc => {
              if (acc.username.toLowerCase() === data.username.toLowerCase()) {
                return { ...acc, farmerName: data.farmerName, villageName: data.villageName, phone: data.phone };
              }
              return acc;
            });
            localStorage.setItem('savedAccounts', JSON.stringify(updated));
            return updated;
          });
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
        initDbForUser(data.username);
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
        
        saveAccount({
          username: data.username,
          farmerName: data.farmerName,
          villageName: data.villageName,
          phone: data.phone,
          token: data.token
        });

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
        initDbForUser(data.username);
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
        
        saveAccount({
          username: data.username,
          farmerName: data.farmerName,
          villageName: data.villageName,
          phone: data.phone,
          token: data.token
        });

        return { success: true };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (err) {
      return { success: false, message: 'Could not connect to the server.' };
    }
  };

  const logout = async () => {
    const activeUsername = user?.username;
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('cachedUser');
    
    const isSaved = savedAccounts.some(acc => acc.username.toLowerCase() === activeUsername?.toLowerCase());
    if (!isSaved && activeUsername) {
      try {
        await db.brokers.clear();
        await db.sales.clear();
        await db.payments.clear();
        await db.expenses.clear();
        await db.vegetables.clear();
      } catch (e) {
        console.error('IndexedDB clear failure:', e);
      }
    }
  };

  const switchAccount = async (targetUsername) => {
    const acc = savedAccounts.find(a => a.username.toLowerCase() === targetUsername.toLowerCase());
    if (!acc) return { success: false, message: 'Account not found' };

    setLoading(true);
    initDbForUser(acc.username);
    setToken(acc.token);
    localStorage.setItem('token', acc.token);
    
    const userProfile = {
      username: acc.username,
      farmerName: acc.farmerName,
      villageName: acc.villageName,
      phone: acc.phone
    };
    setUser(userProfile);
    localStorage.setItem('cachedUser', JSON.stringify(userProfile));
    
    setLoading(false);
    return { success: true };
  };

  const removeSavedAccount = async (targetUsername) => {
    const updated = savedAccounts.filter(acc => acc.username.toLowerCase() !== targetUsername.toLowerCase());
    setSavedAccounts(updated);
    localStorage.setItem('savedAccounts', JSON.stringify(updated));

    if (user && user.username.toLowerCase() === targetUsername.toLowerCase()) {
      setToken('');
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('cachedUser');
    }

    try {
      const Dexie = (await import('dexie')).default;
      const dbName = `MandiSabjiHisabCache_${targetUsername.toLowerCase()}`;
      await Dexie.delete(dbName);
    } catch (e) {
      console.error('Failed to delete user database:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      isOnline, 
      isOfflineView, 
      setIsOfflineView, 
      login, 
      register, 
      logout,
      savedAccounts,
      switchAccount,
      removeSavedAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
