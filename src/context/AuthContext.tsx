import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService, POSTGRESQL_USERS } from '../services/authService';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; databaseVerified?: boolean }>;
  quickSwitchRole: (targetRole: 'admin' | 'operator' | 'viewer') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAuthenticated());

  useEffect(() => {
    setUser(authService.getCurrentUser());
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authService.login(username, password);
    if (res.success && res.user) {
      setUser(res.user);
      setIsAuthenticated(true);
      return { success: true, databaseVerified: res.databaseVerified };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  const quickSwitchRole = async (targetRole: 'admin' | 'operator' | 'viewer') => {
    const seed = POSTGRESQL_USERS[targetRole];
    if (seed) {
      await login(targetRole, seed.hashCheck);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const role: UserRole = user?.role || 'VIEWER';
  const isAdmin = role === 'ADMIN' || role === 'SYSTEM_ADMIN' || role === 'TACTICAL_COMMANDER';
  const isOperator = isAdmin || role === 'OPERATOR' || role === 'SECTOR_OPERATOR';
  const isViewer = true;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isAdmin,
        isOperator,
        isViewer,
        login,
        quickSwitchRole,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
