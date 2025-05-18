import React, { createContext, useState, useContext, useEffect } from 'react';
import { AuthState } from '../types/types';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import { CredentialResponse } from '@react-oauth/google';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (credentialResponse: CredentialResponse) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.checkAuth();
          const user = response.data.user;
          setState({ user, token, isAuthenticated: true });
          socketService.connect(token);
        } catch (error) {
          localStorage.removeItem('token');
          setState({ user: null, token: null, isAuthenticated: false });
        }
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const response = await authAPI.login(username, password);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setState({ user, token, isAuthenticated: true });
    socketService.connect(token);
  };

  const loginWithGoogle = async (credentialResponse: CredentialResponse) => {
    try {
      if (!credentialResponse.credential) {
        throw new Error('No credentials provided');
      }
      const response = await authAPI.loginWithGoogle(credentialResponse);
      const { token, user } = response.data;
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      localStorage.setItem('token', token);
      setState({ user, token, isAuthenticated: true });
      socketService.connect(token);
    } catch (error: any) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      localStorage.removeItem('token');
      setState({ user: null, token: null, isAuthenticated: false });
      socketService.disconnect();
    }
  };

  const register = async (username: string, password: string) => {
    const response = await authAPI.register(username, password);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setState({ user, token, isAuthenticated: true });
    socketService.connect(token);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithGoogle, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};