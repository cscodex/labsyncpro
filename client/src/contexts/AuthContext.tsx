import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../services/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  studentId?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const demoMode = localStorage.getItem('demoMode');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Skip token verification in demo mode
          if (!demoMode) {
            const response = await authAPI.getProfile();
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('demoMode');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      // Fallback for demo purposes when backend is not available
      if (error.code === 'ERR_NETWORK') {
        console.warn('Backend not available, using demo mode');

        // Demo credentials
        if ((email === 'admin@labsyncpro.com' && password === 'admin123') ||
            (email === 'instructor@labsyncpro.com' && password === 'instructor123') ||
            (email.includes('@') && password.length >= 6)) {

          const demoUser: User = {
            id: '1',
            email,
            firstName: email === 'admin@labsyncpro.com' ? 'Admin' :
                     email === 'instructor@labsyncpro.com' ? 'John' : 'Demo',
            lastName: email === 'admin@labsyncpro.com' ? 'User' :
                     email === 'instructor@labsyncpro.com' ? 'Smith' : 'User',
            role: email === 'admin@labsyncpro.com' ? 'admin' :
                  email === 'instructor@labsyncpro.com' ? 'instructor' : 'student',
            studentId: email.includes('student') ? '12345678' : undefined,
            isActive: true
          };

          const demoToken = 'demo-token';
          setToken(demoToken);
          setUser(demoUser);
          localStorage.setItem('token', demoToken);
          localStorage.setItem('user', JSON.stringify(demoUser));
          localStorage.setItem('demoMode', 'true');

          return;
        }
      }

      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authAPI.register(userData);
      const { token: newToken, user: newUser } = response.data;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('demoMode');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
