import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, AuthUser, RoleInfo, setAuthToken } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  roles: RoleInfo[];
  switchRole: (roleKey: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isOperator: boolean;
  isAuditor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [roles, setRoles] = useState<RoleInfo[]>([]);

  useEffect(() => {
    // Initial login as Merchant Admin by default
    api.login('admin')
      .then((res) => {
        setAuthToken(res.token);
        setUser(res.user);
      })
      .catch((err) => {
        console.error('Failed initial auth setup:', err);
      });

    api.getRoles()
      .then((res) => setRoles(res.roles || []))
      .catch(console.error);
  }, []);

  const switchRole = async (roleKey: string) => {
    try {
      const res = await api.login(roleKey);
      setAuthToken(res.token);
      setUser(res.user);
    } catch (e) {
      console.error('Failed to switch role:', e);
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return true; // optimistic default
    return user.permissions.includes(permission);
  };

  const isAdmin = user?.role === 'MERCHANT_ADMIN';
  const isOperator = user?.role === 'OPERATIONS_LEAD';
  const isAuditor = user?.role === 'COMPLIANCE_AUDITOR';

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        switchRole,
        hasPermission,
        isAdmin,
        isOperator,
        isAuditor,
      }}
    >
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
