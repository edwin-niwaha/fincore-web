'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api/services';
import { tokenStore } from '@/lib/auth/tokens';
import { normalizeRole } from '@/types/roles';
import type { ApiProblem, LoginResponse, User } from '@/types/api';

type RegisterInput = {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterInput) => Promise<User>;
  loginWithGoogle: (accessToken: string) => Promise<User>;
  verifyEmail: (code: string) => Promise<User>;
  resendEmailVerification: () => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeUser(user: User): User {
  return { ...user, role: normalizeRole(String(user.role)) };
}

function applyAuthResponse(response: LoginResponse) {
  tokenStore.set(response.tokens.access, response.tokens.refresh);
  return normalizeUser(response.user);
}

export function getFriendlyError(error: unknown) {
  const problem = error as ApiProblem;
  if (problem?.status === 401) return 'Invalid login details. Please check your email and password.';
  if (problem?.status === 403) return 'You do not have permission to perform this action.';
  if (problem?.status === 429) return 'Too many attempts. Please wait a moment and try again.';
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
      const profile = applyAuthResponse(await authApi.login(email, password));
      setUser(profile);
      toast.success('Welcome back');
      return profile;
    } catch (error) {
      toast.error(getFriendlyError(error));
      throw error;
    }
  }

  async function register(payload: RegisterInput) {
    try {
      const profile = applyAuthResponse(await authApi.register(payload));
      setUser(profile);
      toast.success('Account created. Check your email for the OTP code.');
      return profile;
    } catch (error) {
      toast.error(getFriendlyError(error));
      throw error;
    }
  }

  async function loginWithGoogle(accessToken: string) {
    try {
      const profile = applyAuthResponse(await authApi.loginWithGoogle(accessToken));
      setUser(profile);
      toast.success('Signed in with Google');
      return profile;
    } catch (error) {
      toast.error(getFriendlyError(error));
      throw error;
    }
  }

  async function verifyEmail(code: string) {
    try {
      const response = await authApi.verifyEmail(code);
      const profile = normalizeUser(response.user);
      setUser(profile);
      toast.success(response.detail || 'Email verified successfully');
      return profile;
    } catch (error) {
      toast.error(getFriendlyError(error));
      throw error;
    }
  }

  async function resendEmailVerification() {
    try {
      const response = await authApi.sendEmailVerification();
      toast.success(response.detail || 'Verification code sent');
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

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, loginWithGoogle, verifyEmail, resendEmailVerification, logout, reloadProfile }),
    [user, isLoading, reloadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
