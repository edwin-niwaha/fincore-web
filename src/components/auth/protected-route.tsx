'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/features/auth/auth-provider';
import { canAccessDashboard, dashboardPathForRole } from '@/features/auth/role-routing';

function sectionForPath(pathname: string): 'admin' | 'staff' | 'client' | null {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/staff')) return 'staff';
  if (pathname.startsWith('/client')) return 'client';
  return null;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return router.replace('/login');
    const section = sectionForPath(pathname);
    if (section && !canAccessDashboard(user.role, section)) router.replace(dashboardPathForRole(user.role));
  }, [isLoading, pathname, router, user]);

  if (isLoading) return <StateView title="Loading your workspace..." />;
  if (!user) return <StateView title="Redirecting to login..." />;
  return <>{children}</>;
}
