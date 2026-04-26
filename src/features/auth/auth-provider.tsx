'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/services';
import { tokenStore } from '@/lib/auth/tokens';
import { normalizeRole } from '@/types/roles';
import type { ApiProblem, User } from '@/types/api';

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(user: User): User {
  return { ...user, role: normalizeRole(String(user.role)) };
}

export function getFriendlyError(error: unknown) {
  const problem = error as ApiProblem;
  if (problem?.status === 401) return 'Invalid login details. Please check your email and password.';
  if (problem?.status === 403) return 'You do not have permission to perform this action.';
  if (problem?.message) return problem.message;
  return 'Something went wrong. Please try again.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reloadProfile = useCallback(async () => {
    if (!tokenStore.getAccess() && !tokenStore.getRefresh()) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const profile = normalizeUser(await authApi.profile());
      setUser(profile);
      return profile;
    } catch {
      tokenStore.clear();
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadProfile();
  }, [reloadProfile]);

  async function login(email: string, password: string) {
    try {
      const tokens = await authApi.login(email, password);
      tokenStore.set(tokens.access, tokens.refresh);
      const profile = await reloadProfile();
      if (!profile) throw new Error('Login succeeded but the profile endpoint did not return a user.');
      toast.success('Welcome back');
      return profile;
    } catch (error) {
      toast.error(getFriendlyError(error));
      throw error;
    }
  }

  async function logout() {
    try {
      const refresh = tokenStore.getRefresh();
      if (refresh) await authApi.logout(refresh);
    } catch {
      // Keep logout resilient even if the API is unavailable.
    } finally {
      tokenStore.clear();
      setUser(null);
      toast.success('Signed out');
    }
  }

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout, reloadProfile }), [user, isLoading, reloadProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
