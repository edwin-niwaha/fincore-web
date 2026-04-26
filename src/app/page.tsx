'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/features/auth/auth-provider';
import { dashboardPathForRole } from '@/features/auth/role-routing';

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) router.replace(user ? dashboardPathForRole(user.role) : '/login');
  }, [isLoading, router, user]);

  return <StateView title="Opening FinCore..." />;
}
