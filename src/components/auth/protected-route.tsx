'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { navItems } from '@/components/layout/nav-config';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';
import type { Role } from '@/types/roles';

function allowedRolesForPath(pathname: string): Role[] | null {
  const match = navItems
    .filter(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((left, right) => right.href.length - left.href.length)[0];

  return match?.roles ?? null;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowedRoles = user ? allowedRolesForPath(pathname) : null;
  const isUnauthorized =
    Boolean(user && allowedRoles && !allowedRoles.includes(user.role));

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (!user.is_email_verified) {
      router.replace('/verify-email');
      return;
    }

    if (isUnauthorized) {
      router.replace(dashboardPathForRole(user.role));
    }
  }, [
    isLoading,
    user,
    router,
    isUnauthorized,
  ]);

  if (isLoading) {
    return <StateView title="Loading your workspace..." />;
  }

  if (!user) {
    return <StateView title="Redirecting to login..." />;
  }

  if (!user.is_email_verified) {
    return <StateView title="Redirecting to email verification..." />;
  }

  if (isUnauthorized) {
    return <StateView title="Redirecting to your dashboard..." />;
  }

  return <>{children}</>;
}
