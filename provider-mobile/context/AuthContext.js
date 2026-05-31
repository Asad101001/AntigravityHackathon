import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../lib/apiClient';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if provider is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('provider_token');
        if (token) {
          // Verify token is still valid
          const response = await apiClient.get('/provider/profile');
          if (response.data.success) {
            setUser(response.data.provider);
          } else {
            await SecureStore.deleteItemAsync('provider_token');
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/provider/login', {
        email,
        password,
      });

      if (response.data.success) {
        const { token, provider } = response.data;
        await SecureStore.setItemAsync('provider_token', token);
        setUser(provider);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return { success: true };
      }

      return { success: false, error: response.data.error };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (providerData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post('/provider/signup', providerData);

      if (response.data.success) {
        const { token, provider } = response.data;
        await SecureStore.setItemAsync('provider_token', token);
        setUser(provider);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return { success: true };
      }

      return { success: false, error: response.data.error };
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Signup failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('provider_token');
      delete apiClient.defaults.headers.common['Authorization'];
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
