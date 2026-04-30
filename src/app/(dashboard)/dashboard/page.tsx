'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StateView } from '@/components/ui/state-view';
import { useAuth } from '@/features/auth/auth-provider';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;

    if (user.role === 'client') {
      router.replace('/self-service');
      return;
    }

    if (user.role === 'super_admin' || user.role === 'institution_admin') {
      router.replace('/admin');
      return;
    }

    router.replace('/staff');
  }, [isLoading, router, user]);

  return <StateView title="Opening your dashboard..." />;
}
